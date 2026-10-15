import test from "node:test";
import { request as httpRequest } from "node:http";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHelperServer } from "../helper/server.mjs";
import { EXTENSION_ID, EXTENSION_ORIGIN } from "../lib/extension-id.ts";

async function fixture(t) {
  const dataDir = await mkdtemp(join(tmpdir(), "bling-helper-"));
  const calls = [];
  const server = await createHelperServer({ dataDir, inheritedKey: "", mintToken: async (key, maxSeconds) => {
    calls.push({ key, maxSeconds });
    if (key === "invalid-test-key") throw Object.assign(new Error("secret diagnostic must not escape"), { status: 401 });
    return { apiKey: "test-ephemeral", expiresAt: new Date(Date.now() + 60000).toISOString() };
  } });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const base = "http://127.0.0.1:" + server.address().port;
  t.after(async () => { server.closeAllConnections(); await new Promise(r => server.close(r)); await rm(dataDir, { recursive: true, force: true }); });
  const html = await fetch(base + "/setup").then(r => r.text());
  const csrf = html.match(/name="csrf-token" content="([^"]+)"/)[1];
  const admin = (path, body, language = "en") => fetch(base + path, { method: "POST", headers: {
    "Content-Type": "application/json", Origin: base, "X-Bling-CSRF": csrf, "Accept-Language": language,
  }, body: JSON.stringify(body) });
  return { base, admin, calls, dataDir };
}

test("helper localizes safe API messages without changing verification or exposing credentials", async t => {
  const { base, admin, calls } = await fixture(t);
  for (const [language, expected] of [["en", "The key is invalid or revoked."], ["zh-CN", "密钥无效或已撤销"]]) {
    const response = await admin("/api/settings", { apiKey: "invalid-test-key" }, language);
    const body = await response.json();
    assert.equal(response.status, 401);
    assert.ok(body.error.startsWith(expected));
    assert.equal(body.errorKey, "密钥无效或已撤销，请检查后重新输入。");
    assert.ok(!JSON.stringify(body).includes("invalid-test-key"));
    assert.ok(!JSON.stringify(body).includes("secret diagnostic"));
  }
  assert.equal(calls.length, 2);
  const health = await fetch(base + "/api/health").then(r => r.json());
  assert.equal(health.configured, false);
  const module = await fetch(base + "/i18n.js");
  assert.equal(module.status, 200);
  assert.match(module.headers.get("content-type"), /text\/javascript/);
});

test("setup rejects foreign origins, missing CSRF and DNS rebinding hosts", async t => {
  const { base, admin, calls } = await fixture(t);
  assert.equal((await fetch(base + "/api/settings", { method: "POST", headers: { "Content-Type": "application/json", Origin: "https://shop.example" }, body: '{"apiKey":"example-test-key"}' })).status, 403);
  assert.equal((await fetch(base + "/api/settings", { method: "POST", headers: { "Content-Type": "application/json", Origin: base }, body: '{"apiKey":"example-test-key"}' })).status, 403);
  const forgedHostStatus = await new Promise((resolve, reject) => {
    const req = httpRequest(base + "/api/health", { headers: { Host: "attacker.example" } }, res => { res.resume(); resolve(res.statusCode); });
    req.on("error", reject); req.end();
  });
  assert.equal(forgedHostStatus, 403);
  assert.equal((await admin("/api/settings", { apiKey: "example-test-key" })).status, 200);
  assert.equal(calls.length, 1);
});
test("save verifies first, persists with private permissions and never returns permanent keys", async t => {
  const { base, admin, dataDir } = await fixture(t);
  const key = "example-only-permanent-key";
  const response = await admin("/api/settings", { apiKey: key });
  assert.equal(response.status, 200);
  assert.ok(!(await response.text()).includes(key));
  const file = join(dataDir, "user.env");
  assert.ok((await readFile(file, "utf8")).includes(key));
  if (process.platform !== "win32") assert.equal((await stat(file)).mode & 0o777, 0o600);
  const health = await fetch(base + "/api/health").then(r => r.json());
  assert.equal(health.configured, true);
  assert.ok(!JSON.stringify(health).includes(key));
  const failed = await admin("/api/settings", { apiKey: "invalid-test-key" });
  assert.equal(failed.status, 401);
  assert.ok(!(await failed.text()).includes("secret diagnostic"));
  assert.ok((await readFile(file, "utf8")).includes(key));
  const invalid = await admin("/api/settings", { apiKey: "bad\nINJECTED=value" });
  assert.equal(invalid.status, 400);
});
test("only the extension receives scoped short-lived tokens for supported trial lengths", async t => {
  const { base, admin, calls } = await fixture(t);
  await admin("/api/settings", { apiKey: "example-only-permanent-key" });
  const mint = (duration, origin = EXTENSION_ORIGIN) => fetch(base + "/api/extension-token", { method: "POST", headers: {
    "Content-Type": "application/json", Origin: origin, "X-Tryon-Extension": EXTENSION_ID,
  }, body: JSON.stringify({ duration }) });
  assert.equal((await mint(10, "https://shop.example")).status, 403);
  assert.equal((await mint(100)).status, 400);
  for (const [duration, limit] of [[10, 45], [20, 55]]) {
    const response = await mint(duration);
    assert.equal(response.status, 200);
    assert.equal((await response.json()).apiKey, "test-ephemeral");
    assert.equal(calls.at(-1).maxSeconds, limit);
  }
  await admin("/api/settings/delete", {});
  assert.equal((await mint(10)).status, 503);
  assert.equal((await fetch(base + "/api/health").then(r => r.json())).configured, false);
});
test("stored user key is restored on the next helper start", async t => {
  const { admin, dataDir } = await fixture(t);
  await admin("/api/settings", { apiKey: "persisted-example-key" });
  const other = await createHelperServer({ dataDir, inheritedKey: "", mintToken: async () => ({ apiKey: "ephemeral" }) });
  await new Promise(r => other.listen(0, "127.0.0.1", r));
  t.after(() => { other.closeAllConnections(); other.close(); });
  const health = await fetch("http://127.0.0.1:" + other.address().port + "/api/health").then(r => r.json());
  assert.equal(health.configured, true);
});

test("deleting a key remains effective even when an older environment key exists", async t => {
  const { createKeyStore } = await import("../helper/config.mjs");
  const dataDir = await mkdtemp(join(tmpdir(), "bling-delete-"));
  t.after(() => rm(dataDir, { recursive: true, force: true }));
  const first = await createKeyStore(dataDir, "inherited-example-key");
  await first.clear();
  assert.ok(!(await readFile(join(dataDir, "user.env"), "utf8")).includes("inherited-example-key"));
  const second = await createKeyStore(dataDir, "inherited-example-key");
  assert.equal(second.get(), "");
});

test("Decart token requests carry account key only in headers and apply model/time restrictions", async t => {
  const { mintClientToken } = await import("../helper/decart.mjs");
  let captured;
  t.mock.method(globalThis, "fetch", async (url, options) => {
    captured = { url, options };
    return new Response(JSON.stringify({ apiKey: "ephemeral-example", expiresAt: "2027-01-01T00:00:00Z" }), { status: 200 });
  });
  const token = await mintClientToken("example-only-account-key", 45);
  assert.equal(token.apiKey, "ephemeral-example");
  assert.equal(captured.url, "https://api.decart.ai/v1/client/tokens");
  assert.equal(captured.options.headers["X-API-KEY"], "example-only-account-key");
  const body = JSON.parse(captured.options.body);
  assert.deepEqual(body, { expiresIn: 60, allowedModels: ["lucy-vton-latest", "lucy-vton-3.6"], constraints: { realtime: { maxSessionDuration: 45 } } });
  assert.ok(!captured.options.body.includes("example-only-account-key"));
  assert.ok(captured.options.signal instanceof AbortSignal);
});
