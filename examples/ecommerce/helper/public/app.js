const $ = id => document.getElementById(id);
const csrf = document.querySelector('meta[name="csrf-token"]').content;
let configured = false;
let extensionPath = "";
function show(text, failed = false) { $("message").textContent = text; $("message").hidden = false; $("message").classList.toggle("error", failed); }
function buttons(busy) {
  $("save").disabled = busy;
  $("api-key").disabled = busy;
  $("test-current").disabled = busy || !configured;
  $("delete-key").disabled = busy || !configured;
}
async function request(path, body = {}) {
  const response = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json", "X-Bling-CSRF": csrf },
    body: JSON.stringify(body), signal: AbortSignal.timeout(20000), cache: "no-store" });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "操作失败，请重试");
  return result;
}
async function refresh() {
  const state = await request("/api/status");
  configured = state.configured;
  extensionPath = state.extensionPath;
  $("key-status").textContent = configured ? "已配置 · 仅存本机" : "尚未配置";
  $("key-status").classList.toggle("ready", configured);
  buttons(false);
}
async function operate(path, body = {}) {
  buttons(true); show("正在处理…");
  try { const result = await request(path, body); show(result.message); await refresh(); }
  catch (error) { show(error.name === "TimeoutError" ? "请求超时，请检查网络后重试。" : error.message, true); }
  finally { $("api-key").value = ""; buttons(false); }
}
$("key-form").addEventListener("submit", event => {
  event.preventDefault(); const key = $("api-key").value.trim();
  if (!key) return;
  void operate("/api/settings", { apiKey: key });
});
$("test-current").addEventListener("click", () => void operate("/api/settings/test"));
$("delete-key").addEventListener("click", () => void operate("/api/settings/delete"));
async function copy(text) {
  try { await navigator.clipboard.writeText(text); show("已复制，请粘贴到 Chrome。"); }
  catch { show("请手动复制：" + text); }
}
$("copy-extensions").addEventListener("click", () => void copy("chrome://extensions"));
$("copy-path").addEventListener("click", () => void copy(extensionPath));
void refresh().catch(() => { buttons(true); show("助手连接失败，请重新运行启动器后刷新此页面。", true); });
