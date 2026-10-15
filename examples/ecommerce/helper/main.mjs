import { normalizeLanguage, translate } from "./public/i18n.js";
const language = normalizeLanguage(process.env.BLING_LANGUAGE || process.env.LC_ALL || process.env.LC_MESSAGES || process.env.LANG || Intl.DateTimeFormat().resolvedOptions().locale);
const t = key => translate(language, key);
import { createHelperServer } from "./server.mjs";
import { defaultDataDir } from "./config.mjs";
import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const base = "http://127.0.0.1:3000";
const openBrowser = async () => {
  const health = await fetch(base + "/api/health", { signal: AbortSignal.timeout(500) }).then(r => r.ok ? r.json() : null).catch(() => null);
  const urls = [base + "/setup"];
  if (health?.service === "bling-helper" && health.configured === false) {
    urls.push("https://platform.decart.ai/api-keys");
    console.log(t("首次使用：请在 Decart 注册/登录、查看试用积分并创建 API Key，然后回到本机设置页填写。") + urls[1]);
  }
  if (process.env.BLING_NO_OPEN === "1") return;
  for (const url of urls) {
    const [command, args] = process.platform === "darwin" ? ["open", [url]]
      : process.platform === "win32" ? ["rundll32.exe", ["url.dll,FileProtocolHandler", url]]
      : ["xdg-open", [url]];
    const child = spawn(command, args, { detached: true, stdio: "ignore" });
    child.on("error", () => {}); child.unref();
  }
};
try {
  // Repeated double-clicks reuse this helper instead of opening another process.
  const health = await fetch(base + "/api/health", { signal: AbortSignal.timeout(500) }).then(r => r.json()).catch(() => null);
  if (health?.service === "bling-helper") { console.log(t("本地助手已启动：") + base + "/setup"); openBrowser(); }
  else {
    const server = await createHelperServer({ dataDir: defaultDataDir(),
      extensionDir: resolve(fileURLToPath(new URL("..", import.meta.url)), "chrome-tryon"),
      onKeyChange: key => { if (key) process.env.DECART_API_KEY = key; else delete process.env.DECART_API_KEY; },
    });
    server.on("error", error => {
      console.error(error.code === "EADDRINUSE" ? t("3000 端口已被其他服务占用，请先关闭旧版本地试衣服务。") : t("本地助手未能启动，请检查端口和配置目录权限。"));
      process.exitCode = 1;
    });
    server.listen(3000, "127.0.0.1", () => {
      console.log(t("试衣镜bling 本地助手：") + base + "/setup");
      console.log(t("密钥仅保存在本机。保持此窗口开启；Ctrl+C 停止助手。"));
      openBrowser();
    });
    const stop = () => { server.close(); server.closeAllConnections(); process.exitCode = 0; };
    process.on("SIGINT", stop); process.on("SIGTERM", stop);
  }
} catch { console.error(t("本地配置无法读取，请检查配置目录后重试。")); process.exitCode = 1; }
