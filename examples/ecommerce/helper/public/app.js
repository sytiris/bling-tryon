import { english, normalizeLanguage, applyTranslations, setTranslatedText } from "./i18n.js";
let language;
try { language = localStorage.getItem("blingLanguage"); } catch { /* Preferences are optional. */ }
language = normalizeLanguage(language || navigator.language);
const text = (node, key, values) => setTranslatedText(node, language, key, values);
function renderLanguage() {
  applyTranslations(document, language);
  document.getElementById("language").textContent = language === "zh" ? "EN" : "中文";
}
renderLanguage();
document.getElementById("language").addEventListener("click", () => {
  language = language === "zh" ? "en" : "zh";
  try { localStorage.setItem("blingLanguage", language); } catch { /* Still switch for this page. */ }
  renderLanguage();
});
const $ = id => document.getElementById(id);
const csrf = document.querySelector('meta[name="csrf-token"]').content;
let configured = false;
let provider = "decart";
let extensionPath = "";
function show(key, failed = false, values) { text($("message"), key, values); $("message").hidden = false; $("message").classList.toggle("error", failed); }
function buttons(busy) {
  $("provider").disabled = $("vidu-region").disabled = busy;
  $("save").disabled = busy;
  $("api-key").disabled = busy;
  $("test-current").disabled = busy || !configured;
  $("delete-key").disabled = busy || !configured;
}
async function request(path, body = {}) {
  const response = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json", "X-Bling-CSRF": csrf, "Accept-Language": language },
    body: JSON.stringify(body), signal: AbortSignal.timeout(20000), cache: "no-store" });
  const result = await response.json();
  if (!response.ok) throw new Error(result.errorKey || result.error || "操作失败，请重试");
  return result;
}
async function refresh() {
  const state = await request("/api/status");
  configured = state.configured;
  provider = state.provider || "decart";
  $("provider").value = provider; $("vidu-region").value = state.viduRegion || "cn";
  $("region-field").hidden = $("vidu-note").hidden = provider !== "vidu";
  $("key-title").textContent = provider === "vidu" ? "Vidu API Key" : "Decart API Key";
  const placeholder = provider === "vidu" ? "从所选地区的 Vidu 控制台复制" : "从 Decart 控制台复制";
  $("api-key").setAttribute("data-i18n-placeholder", placeholder);
  $("api-key").placeholder = language === "zh" ? placeholder : english[placeholder];
  text($("verification-note"), provider === "vidu" ? "验证仅查询 Vidu 账户额度，不开启摄像头，不开始生成。" : "验证时仅向 Decart 申请短期令牌，不开启摄像头，不开始生成。");
  $("create-key-link").href = provider === "decart" ? "https://platform.decart.ai/api-keys" : "https://platform.vidu." + (state.viduRegion === "global" ? "com" : "cn") + "/";
  $("vidu-getting-started").hidden = provider !== "vidu" || configured;
  extensionPath = state.extensionPath;
  text($("key-status"), configured ? "已配置 · 仅存本机" : "尚未配置");
  $("key-status").classList.toggle("ready", configured);
  $("getting-started").hidden = configured || provider !== "decart";
  buttons(false);
}
async function operate(path, body = {}) {
  buttons(true); show("正在处理…");
  try { const result = await request(path, body); show(result.messageKey || result.message); await refresh(); }
  catch (error) { show(error.name === "TimeoutError" ? "请求超时，请检查网络后重试。" : (Object.hasOwn(english, error.message) ? error.message : "操作失败，请重试"), true); }
  finally { $("api-key").value = ""; buttons(false); }
}
$("key-form").addEventListener("submit", event => {
  event.preventDefault(); const key = $("api-key").value.trim();
  if (!key) return;
  void operate("/api/settings", { apiKey: key });
});
for (const id of ["provider", "vidu-region"]) $(id).addEventListener("change", () => void operate("/api/provider", { provider: $("provider").value, viduRegion: $("vidu-region").value }));
$("test-current").addEventListener("click", () => void operate("/api/settings/test"));
$("delete-key").addEventListener("click", () => void operate("/api/settings/delete"));
async function copy(text) {
  try { await navigator.clipboard.writeText(text); show("已复制，请粘贴到 Chrome。"); }
  catch { show("请手动复制：{text}", false, { text }); }
}
$("copy-extensions").addEventListener("click", () => void copy("chrome://extensions"));
$("copy-path").addEventListener("click", () => void copy(extensionPath));
void refresh().catch(() => { buttons(true); show("助手连接失败，请重新运行启动器后刷新此页面。", true); });
