import { createLocale } from "./locale.mjs";
const locale = await createLocale();
const $ = id => document.getElementById(id);
async function check() {
  $("retry").disabled = true;
  try {
    const response = await fetch("http://127.0.0.1:3000/api/health", { cache: "no-store", signal: AbortSignal.timeout(2500) });
    const health = await response.json();
    if (!response.ok || typeof health.configured !== "boolean") throw new Error();
    locale.text($("state"), health.configured ? "已连接 · 密钥已配置" : "已连接 · 请配置密钥");
    $("indicator").classList.toggle("ready", health.configured);
    locale.text($("detail"), health.configured ? "可以回到购物网页试衣；打开配置页可测试、更换或删除本机密钥。" : "本地助手已启动，打开配置页填写你自己的 Decart API Key。");
    $("open-helper").hidden = false;
  } catch {
    locale.text($("state"), "本地助手未启动");
    $("indicator").classList.remove("ready");
    locale.text($("detail"), "请先运行完整安装包中的启动器，再点击重新检测。");
    $("open-helper").hidden = true;
  } finally { $("retry").disabled = false; }
}
$("retry").addEventListener("click", check);
void check();
