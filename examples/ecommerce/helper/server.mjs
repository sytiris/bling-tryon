import { normalizeLanguage, translate } from "./public/i18n.js";
import { createServer } from "node:http";
import { randomBytes, timingSafeEqual, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createKeyStore, defaultDataDir, validateKey } from "./config.mjs";
import { mintClientToken, publicDecartError } from "./decart.mjs";
import { WebSocketServer } from "ws";
import { createProviderSettings } from "./provider-settings.mjs";
import { checkViduKey, createViduManager, publicViduError } from "./vidu.mjs";
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
  "Vary": "Origin, Accept-Language",
};
const fail = (status, message) => Object.assign(new Error(message), { status, safe: true });
const equal = (a, b) => typeof a === "string" && Buffer.byteLength(a) === Buffer.byteLength(b) && timingSafeEqual(Buffer.from(a), Buffer.from(b));
async function jsonBody(request, limit = 8192) {
  let body = "";
  for await (const chunk of request) {
    body += chunk;
    if (Buffer.byteLength(body) > limit) throw fail(413, "请求内容过大");
  }
  try { return JSON.parse(body); } catch { throw fail(400, "请求格式不正确"); }
}
export async function createHelperServer({ dataDir = defaultDataDir(), inheritedKey = process.env.DECART_API_KEY || "",
  mintToken = mintClientToken, onKeyChange, inheritedViduKey = process.env.VIDU_API_KEY || "",
  viduCheck = checkViduKey, viduOptions = {}, extensionDir = resolve(publicDir, "../../chrome-tryon") } = {}) {
  const store = await createKeyStore(dataDir, inheritedKey, onKeyChange);
  const viduStore = await createKeyStore(dataDir, inheritedViduKey, undefined, "vidu");
  const preferences = await createProviderSettings(dataDir);
  const vidu = createViduManager({ ...viduOptions, getKey: () => viduStore.get(), getRegion: () => preferences.get().viduRegion });
  const selectedStore = () => preferences.get().provider === "vidu" ? viduStore : store;
  const configuration = () => ({ ...preferences.get(), configured: Boolean(selectedStore().get()),
    providers: { decart: { configured: Boolean(store.get()) }, vidu: { configured: Boolean(viduStore.get()), experimental: true } } });
  const csrf = randomBytes(32).toString("hex");
  const instance = randomUUID();
  let credentialRevision = 0;
  let changingKey = false;
  const server = createServer(async (request, response) => {
    const language = normalizeLanguage(request.headers["accept-language"]);
    const reply = (status, data, type = "application/json; charset=utf-8") => {
      if (type.startsWith("application/json") && data && typeof data === "object") {
        for (const field of ["error", "message"]) {
          if (typeof data[field] === "string") data = { ...data, [field + "Key"]: data[field], [field]: translate(language, data[field]) };
        }
      }
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
        return reply(200, { service: "bling-helper", version: "1.3.1", ...configuration(),
          credentialVersion: instance + ":" + credentialRevision, model: preferences.get().provider === "vidu" ? "vidu-s2-editing" : "lucy-vton-latest", tokenTtlSeconds: 60,
          maxSessionSeconds: { quick: 45, extended: 55 } });
      }
      const assets = { "/": ["index.html", "text/html"], "/setup": ["index.html", "text/html"],
        "/app.js": ["app.js", "text/javascript"], "/i18n.js": ["i18n.js", "text/javascript"], "/style.css": ["style.css", "text/css"] };
      if (request.method === "GET" && assets[path]) {
        const [file, type] = assets[path];
        const content = (await readFile(resolve(publicDir, file), "utf8")).replaceAll("__CSRF_TOKEN__", csrf);
        return reply(200, content, type + "; charset=utf-8");
      }
      if (request.method !== "POST") throw fail(404, "未找到此页面");
      const signal = new AbortController();
      response.on("close", () => { if (!response.writableEnded) signal.abort(); });
      if (path === "/api/vidu/session" || path === "/api/vidu/stop") {
        if (!isExtensionRequest(new Headers(request.headers))) throw fail(403, "不允许此来源申请试穿令牌");
        if (!request.headers["content-type"]?.startsWith("application/json")) throw fail(415, "请求格式不正确");
        const body = await jsonBody(request, path.endsWith("/session") ? 2 * 1024 * 1024 + 2048 : 8192);
        if (path.endsWith("/stop")) { vidu.stop(body.sessionId); return reply(200, { ok: true }); }
        if (preferences.get().provider !== "vidu") throw fail(409, "模型配置已变化，请重新开始试穿");
        try { return reply(200, await vidu.create(body.image, body.duration, signal.signal)); }
        catch (error) { if (error.safe) throw error; const result = publicViduError(error); return reply(result.status, { error: result.error }); }
      }
      if (path === "/api/extension-token") {
        if (preferences.get().provider !== "decart") throw fail(409, "请重新加载扩展以使用所选模型");
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
      if (path === "/api/status") return reply(200, { ...configuration(), extensionPath: extensionDir });
      if (!["/api/settings", "/api/settings/delete", "/api/settings/test", "/api/provider"].includes(path)) throw fail(404, "未找到此操作");
      if (changingKey) throw fail(409, "正在处理上一项操作，请稍候");
      changingKey = true;
      try {
        if (path === "/api/provider") {
          const next = await jsonBody(request);
          // Validate and persist the choice before another trial can use it.
          vidu.stopAll(); await preferences.save(next); credentialRevision++;
          return reply(200, { ...configuration(), message: "模型服务已更新，当前试穿已停止" });
        }
        const provider = preferences.get().provider;
        const currentStore = selectedStore();
        if (path === "/api/settings/delete") {
          vidu.stopAll(); await currentStore.clear(); credentialRevision++;
          return reply(200, { configured: false, message: "本机密钥已删除" });
        }
        let key = currentStore.get();
        if (path === "/api/settings") {
          try { key = validateKey((await jsonBody(request))?.apiKey, provider); }
          catch (error) { throw fail(400, error.message); }
        }
        if (!key) throw fail(400, provider === "vidu" ? "请先在本地助手配置 Vidu API Key" : "请先配置 Decart API Key");
        try {
          if (provider === "vidu") await viduCheck(key, preferences.get().viduRegion, signal.signal);
          else await mintToken(key, 10, signal.signal);
        }
        catch (error) { const result = provider === "vidu" ? publicViduError(error) : publicDecartError(error); return reply(result.status, { error: result.error }); }
        signal.signal.throwIfAborted();
        if (path === "/api/settings") { vidu.stopAll(); await currentStore.save(key); credentialRevision++; }
        return reply(200, { configured: true, message: provider === "vidu" ? "Vidu 密钥验证通过；仅查询账户额度，未开始生成" : "密钥验证通过，可以申请试穿令牌；尚未开始生成。" });
      } finally { changingKey = false; }
    } catch (error) {
      if (!response.writableEnded) reply(error.safe ? error.status : 500, { error: error.safe ? error.message : "本地助手处理失败，请检查配置目录权限或重启助手。" });
    }
  });
  const controls = new WebSocketServer({ noServer: true, maxPayload: 1024 });
  server.on("upgrade", (request, socket, head) => {
    const origins = [`http://127.0.0.1:${server.address()?.port}`, `http://localhost:${server.address()?.port}`];
    let url; try { url = new URL(request.url, origins[0]); } catch {}
    if (!origins.includes("http://" + request.headers.host) || request.headers.origin !== EXTENSION_ORIGIN ||
        url?.pathname !== "/api/vidu/control" || !vidu.has(url.searchParams.get("session"))) {
      socket.end("HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n"); return;
    }
    controls.handleUpgrade(request, socket, head, client => vidu.connect(client, url.searchParams.get("session")));
  });
  server.stopVidu = () => { vidu.closeAll(); for (const client of controls.clients) client.close(); };
  server.on("close", () => { server.stopVidu(); controls.close(); });
  server.requestTimeout = 20000;
  server.headersTimeout = 10000;
  return server;
}
