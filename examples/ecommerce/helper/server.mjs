import { createServer } from "node:http";
import { randomBytes, timingSafeEqual, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createKeyStore, defaultDataDir, validateKey } from "./config.mjs";
import { mintClientToken, publicDecartError } from "./decart.mjs";
import { EXTENSION_ORIGIN } from "../lib/extension-id.ts";
import { isExtensionRequest, maxSessionSeconds } from "../lib/extension-policy.ts";

const publicDir = fileURLToPath(new URL("./public/", import.meta.url));
const secureHeaders = {
  "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "X-Frame-Options": "DENY",
  "Referrer-Policy": "no-referrer",
  "Content-Security-Policy": "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
  "Access-Control-Allow-Origin": EXTENSION_ORIGIN,
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Tryon-Extension",
  "Vary": "Origin",
};
const fail = (status, message) => Object.assign(new Error(message), { status, safe: true });
const equal = (a, b) => typeof a === "string" && Buffer.byteLength(a) === Buffer.byteLength(b) && timingSafeEqual(Buffer.from(a), Buffer.from(b));
async function jsonBody(request) {
  let body = "";
  for await (const chunk of request) {
    body += chunk;
    if (Buffer.byteLength(body) > 8192) throw fail(413, "请求内容过大");
  }
  try { return JSON.parse(body); } catch { throw fail(400, "请求格式不正确"); }
}
export async function createHelperServer({ dataDir = defaultDataDir(), inheritedKey = process.env.DECART_API_KEY || "",
  mintToken = mintClientToken, onKeyChange, extensionDir = resolve(publicDir, "../../chrome-tryon") } = {}) {
  const store = await createKeyStore(dataDir, inheritedKey, onKeyChange);
  const csrf = randomBytes(32).toString("hex");
  const instance = randomUUID();
  let credentialRevision = 0;
  let changingKey = false;
  const server = createServer(async (request, response) => {
    const reply = (status, data, type = "application/json; charset=utf-8") => {
      response.writeHead(status, { ...secureHeaders, "Content-Type": type });
      response.end(type.startsWith("application/json") ? JSON.stringify(data) : data);
    };
    try {
      const port = server.address()?.port;
      const localOrigins = [`http://127.0.0.1:${port}`, `http://localhost:${port}`];
      if (!localOrigins.includes("http://" + request.headers.host)) throw fail(403, "只允许通过本机地址访问助手");
      const path = new URL(request.url, localOrigins[0]).pathname;
      if (request.method === "OPTIONS") {
        if (request.headers.origin !== EXTENSION_ORIGIN) throw fail(403, "不允许的来源");
        return reply(204, "", "text/plain");
      }
      if (request.method === "GET" && path === "/api/health") {
        return reply(200, { service: "bling-helper", version: "1.0.1", configured: Boolean(store.get()),
          credentialVersion: instance + ":" + credentialRevision, model: "lucy-vton-latest", tokenTtlSeconds: 60,
          maxSessionSeconds: { quick: 45, extended: 55 } });
      }
      const assets = { "/": ["index.html", "text/html"], "/setup": ["index.html", "text/html"],
        "/app.js": ["app.js", "text/javascript"], "/style.css": ["style.css", "text/css"] };
      if (request.method === "GET" && assets[path]) {
        const [file, type] = assets[path];
        const content = (await readFile(resolve(publicDir, file), "utf8")).replaceAll("__CSRF_TOKEN__", csrf);
        return reply(200, content, type + "; charset=utf-8");
      }
      if (request.method !== "POST") throw fail(404, "未找到此页面");
      const signal = new AbortController();
      response.on("close", () => { if (!response.writableEnded) signal.abort(); });
      if (path === "/api/extension-token") {
        if (!isExtensionRequest(new Headers(request.headers))) throw fail(403, "不允许此来源申请试穿令牌");
        const body = await jsonBody(request);
        let duration;
        try { duration = maxSessionSeconds(body.duration); } catch { throw fail(400, "仅支持 10 秒或 20 秒试穿"); }
        if (!store.get()) throw fail(503, "请先打开本地助手，配置你自己的 Decart API Key");
        try { return reply(200, await mintToken(store.get(), duration, signal.signal)); }
        catch (error) { const result = publicDecartError(error); return reply(result.status, { error: result.error }); }
      }
      if (!localOrigins.includes(request.headers.origin) || !equal(request.headers["x-bling-csrf"], csrf)) {
        throw fail(403, "请从本机助手页面执行此操作");
      }
      if (!request.headers["content-type"]?.startsWith("application/json")) throw fail(415, "请求格式不正确");
      if (path === "/api/status") return reply(200, { configured: Boolean(store.get()), extensionPath: extensionDir });
      if (!["/api/settings", "/api/settings/delete", "/api/settings/test"].includes(path)) throw fail(404, "未找到此操作");
      if (changingKey) throw fail(409, "正在处理上一项操作，请稍候");
      changingKey = true;
      try {
        if (path === "/api/settings/delete") {
          await store.clear(); credentialRevision++;
          return reply(200, { configured: false, message: "本机密钥已删除" });
        }
        let key = store.get();
        if (path === "/api/settings") {
          try { key = validateKey((await jsonBody(request))?.apiKey); }
          catch (error) { throw fail(400, error.message); }
        }
        if (!key) throw fail(400, "请先配置 Decart API Key");
        try { await mintToken(key, 10, signal.signal); }
        catch (error) { const result = publicDecartError(error); return reply(result.status, { error: result.error }); }
        signal.signal.throwIfAborted();
        if (path === "/api/settings") { await store.save(key); credentialRevision++; }
        return reply(200, { configured: true, message: "密钥验证通过，可以申请试穿令牌；尚未开始生成。" });
      } finally { changingKey = false; }
    } catch (error) {
      if (!response.writableEnded) reply(error.safe ? error.status : 500, { error: error.safe ? error.message : "本地助手处理失败，请检查配置目录权限或重启助手。" });
    }
  });
  server.requestTimeout = 20000;
  server.headersTimeout = 10000;
  return server;
}
