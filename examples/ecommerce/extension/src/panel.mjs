import { english } from "../../helper/public/i18n.js";
import { createLocale } from "./locale.mjs";
import { createDecartClient, models } from "@decartai/sdk";
import { createTrialTimer } from "./trial-timer.mjs";
import { createCenteredInput } from "./centered-input.mjs";
import { fetchGarment, prepareGarment } from "./garment.mjs";

const locale = await createLocale();
const t = locale.t;
const backend = "http://localhost:3000";
const $ = (id) => document.getElementById(id);
const stage = document.querySelector(".stage");
const camera = $("camera");
const output = $("output");
const snapshot = $("snapshot");
const model = models.realtime("lucy-vton-latest");
let sourceTabId = null;
let selectedUrl = null;
let authorized = false;
let centeredInput = null;
let cameraStream = null;
let trialStream = null;
let remoteStream = null;
let realtime = null;
let controller = null;
let trialTimer = null;
let frameCallback = null;
let firstFrameAt = null;
let runStartedAt = null;
let frameDeadline = null;
let sessionDeadline = null;
let sessionEndsAt = null;
let uiTicker = null;
let runId = 0;
let cameraRequest = 0;
let busy = false;
let chosenSeconds = 10;
let loadingPhase = "";
let helperReady = false;
let helperCredentialVersion = null;
let helperChecking = false;
let helperError = "";


function message(text, values) { locale.text($("status"), text, values); }
function error(text = "") { locale.text($("error"), text); $("error").hidden = !text; }
function loading(text) {
  loadingPhase = text;
  $("loading").hidden = !text;
  locale.text($("loading-text"), text);
}
function updateButtons() {
  $("quick").disabled = !authorized || !helperReady || !cameraStream || busy || !selectedUrl;
  $("fine").disabled = $("quick").disabled;
}
function clearSnapshot() {
  snapshot.width = snapshot.height = 0;
  stage.classList.remove("finished");
  if (stage.classList.contains("tried")) {
    $("placeholder").hidden = false;
    locale.text($("placeholder").querySelector("p"), "点击 10s / 20s 开始下一次试穿");
  }
}
function stopTrial(text = "试穿已停止", keepFrame = true, values) {
  // Capture a local last frame before closing the media stream. Never save/upload it.
  let captured = false;
  try { if (keepFrame && output.readyState >= 2 && firstFrameAt !== null) {
    snapshot.width = output.videoWidth;
    snapshot.height = output.videoHeight;
    snapshot.getContext("2d").drawImage(output, 0, 0);
    captured = true;
  } } catch { /* A snapshot failure must never prevent disconnect. */ }
  runId++;
  try { controller?.abort(); } catch {}
  controller = null;
  try { realtime?.disconnect(); } catch {}
  realtime = null;
  centeredInput?.stop();
  centeredInput = null;
  trialStream?.getTracks().forEach((track) => track.stop());
  trialStream = null;
  remoteStream?.getTracks().forEach((track) => track.stop());
  remoteStream = null;
  trialTimer?.cancel();
  trialTimer = null;
  clearTimeout(frameDeadline);
  clearTimeout(sessionDeadline);
  sessionDeadline = sessionEndsAt = null;
  clearInterval(uiTicker);
  if (frameCallback !== null) { try { output.cancelVideoFrameCallback(frameCallback); } catch {} }
  frameCallback = null;
  output.srcObject = null;
  firstFrameAt = runStartedAt = null;
  busy = false;
  stage.classList.remove("active");
  stage.classList.toggle("finished", captured);
  if (stage.classList.contains("tried")) {
    $("placeholder").hidden = captured;
    locale.text($("placeholder").querySelector("p"), "本次试穿已停止 · 可重新选择衣服");
  }
  $("countdown").hidden = true;
  $("preview-tag").hidden = !cameraStream || stage.classList.contains("tried");
  loading("");
  message(text, values);
  updateButtons();
}
function closeCamera() {
  cameraRequest++;
  stopTrial("摄像头已关闭", false);
  cameraStream?.getTracks().forEach((track) => track.stop());
  cameraStream = null;
  camera.srcObject = null;
  stage.classList.remove("tried");
  clearSnapshot();
  locale.text($("placeholder").querySelector("p"), "把自己放在画面中央");
  $("controls").hidden = true;
  $("consent").hidden = false;
  $("placeholder").hidden = false;
  $("preview-tag").hidden = true;
  $("enable-camera").disabled = false;
  updateButtons();
}

async function enableCamera() {
  if (!authorized) return;
  if (!navigator.mediaDevices?.getUserMedia) {
    error("当前网页无法使用摄像头，请在 HTTPS 购物页面打开试衣镜。");
    return;
  }
  const policy = document.permissionsPolicy || document.featurePolicy;
  if (policy && !policy.allowsFeature("camera")) {
    error("当前网站禁止在浮窗中使用摄像头，请换一个购物网站试用。");
    return;
  }
  const request = ++cameraRequest;
  $("enable-camera").disabled = true;
  error();
  message("请在 Chrome 提示中允许摄像头");
  loading("等待摄像头授权");
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: "user", frameRate: model.fps, width: { ideal: model.width }, height: { ideal: model.height } },
    });
    if (request !== cameraRequest) { stream.getTracks().forEach((track) => track.stop()); return; }
    cameraStream = stream;
    camera.srcObject = stream;
    stream.getVideoTracks().forEach((track) => track.addEventListener("ended", () => {
      if (cameraStream !== stream) return;
      closeCamera();
      error("摄像头已被关闭或移除，实时连接已停止");
    }, { once: true }));
    await camera.play();
    if (request !== cameraRequest) { stream.getTracks().forEach((track) => track.stop()); return; }
    $("placeholder").hidden = true;
    $("consent").hidden = true;
    $("controls").hidden = false;
    $("preview-tag").hidden = false;
    message(selectedUrl ? "就试它啦✨ · 点击 10 秒 / 20 秒" : "移到网页衣服上，点击「试试这件」");
  } catch {
    if (request !== cameraRequest) return;
    cameraStream?.getTracks().forEach((track) => track.stop());
    cameraStream = null;
    camera.srcObject = null;
    error("未能开启摄像头。请检查设备，以及 Chrome 和系统的摄像头权限，然后重试。");
    message("尚未开启摄像头");
  } finally {
    if (request === cameraRequest) { loading(""); $("enable-camera").disabled = false; updateButtons(); }
  }
}

function firstFrame(id) {
  if (id !== runId || firstFrameAt !== null) return;
  if (sessionEndsAt !== null && Date.now() >= sessionEndsAt) { stopTrial("已到安全时限，AI 已断开", false); return; }
  firstFrameAt = performance.now();
  clearTimeout(frameDeadline);
  loading("");
  $("preview-tag").hidden = true;
  $("countdown").hidden = false;
  locale.text($("latency"), "首帧 {seconds}s", { seconds: ((firstFrameAt - runStartedAt) / 1000).toFixed(2) });
  trialTimer.startFromFirstFrame();
  message("试穿中 · 出画后计时 {seconds} 秒", { seconds: chosenSeconds });
}

async function startTrial(seconds) {
  if (!authorized || !helperReady || busy || !cameraStream) return;
  if (!selectedUrl) { error("请先点击网页衣服上的「试试这件」"); return; }
  // Invoke the permission request in the click gesture, for this one image origin only.
  const permission = selectedUrl
    ? chrome.permissions.request({ origins: [new URL(selectedUrl).origin + "/*"] })
    : Promise.resolve(true);
  stopTrial("", false);
  clearSnapshot();
  error();
  chosenSeconds = seconds;
  const id = ++runId;
  const activeController = new AbortController();
  controller = activeController;
  busy = true;
  firstFrameAt = null;
  runStartedAt = performance.now();
  locale.text($("latency"), "");
  stage.classList.add("active", "tried");
  $("placeholder").hidden = true;
  $("preview-tag").hidden = true;
  loading("准备服装图片");
  message("准备试穿");
  updateButtons();
  uiTicker = setInterval(() => {
    if (id !== runId) return;
    trialTimer?.checkDeadline();
    if (sessionEndsAt !== null && Date.now() >= sessionEndsAt) stopTrial("已到安全时限，AI 已断开");
    if (id !== runId) return;
    if (firstFrameAt === null) {
      locale.text($("loading-text"), "{phase} · {seconds} 秒", { phase: t(loadingPhase), seconds: Math.floor((performance.now() - runStartedAt) / 1000) });
    } else {
      $("countdown").textContent = Math.max(0, chosenSeconds - (performance.now() - firstFrameAt) / 1000).toFixed(1) + "s";
    }
  }, 100);
  try {
    if (!await permission) throw new Error("未允许读取该图片网站，请允许后再试");
    activeController.signal.throwIfAborted();
    const source = await fetchGarment(selectedUrl, AbortSignal.any([
      activeController.signal, AbortSignal.timeout(15000),
    ]));
    const image = await prepareGarment(source);
    activeController.signal.throwIfAborted();
    loading("获取短期令牌");
    // Covers connect and waiting for a decoded frame. No billed session is left waiting indefinitely.
    frameDeadline = setTimeout(() => {
      if (id !== runId) return;
      stopTrial("连接超时，已断开", false);
      error("30 秒内未收到试穿画面，请检查网络或稍后重试");
    }, 30000);
    trialTimer = createTrialTimer(seconds, () => stopTrial("已完成 {seconds} 秒试穿 · AI 已断开", true, { seconds }));
    // Absolute wall-clock cap is never reset by a frame or connection event.
    sessionEndsAt = Date.now() + (seconds + 35) * 1000;
    sessionDeadline = setTimeout(() => {
      if (id === runId) stopTrial("已到安全时限，AI 已断开");
    }, (seconds + 35) * 1000);
    let credentialRequested = false;
    const client = createDecartClient({
      apiKeyProvider: async () => {
        activeController.signal.throwIfAborted();
        if (credentialRequested) throw new Error("连接已中断，请主动点击试穿按钮重试");
        credentialRequested = true;
        const response = await fetch(backend + "/api/extension-token", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Tryon-Extension": chrome.runtime.id, "Accept-Language": locale.language },
          body: JSON.stringify({ duration: seconds }),
          signal: AbortSignal.any([activeController.signal, AbortSignal.timeout(15000)]),
          cache: "no-store",
        }).catch(() => { throw new Error("无法连接本机服务，请先运行启动脚本"); });
        const token = await response.json();
        activeController.signal.throwIfAborted();
        if (!response.ok) throw new Error(token.errorKey || token.error || "短期令牌申请失败");
        if (typeof token.apiKey !== "string" || !token.apiKey) throw new Error("令牌响应不正确");
        loading("建立实时连接");
        return token.apiKey;
      },
      telemetry: false,
      logger: { debug() {}, info() {}, warn() {}, error() {} },
    });
    // Crop before publishing; the original camera track stays local and alive.
    centeredInput = createCenteredInput(camera, model);
    trialStream = centeredInput.stream;
    const connection = await client.realtime.connect(trialStream, {
      model, signal: activeController.signal, mirror: false, retries: 0, capacityRetryBudgetMs: 0,
      initialState: {
        image,
        prompt: { text: "Substitute the current outfit with the clothing shown in the reference image, matching its color, texture and fit. Preserve the person's face and background.", enhance: false },
      },
      onRemoteStream: (stream) => {
        if (id !== runId) { stream.getTracks().forEach((track) => track.stop()); return; }
        remoteStream = stream;
        stream.getVideoTracks().forEach((track) => track.addEventListener("ended", () => {
          if (id === runId) { stopTrial("画面已中断，AI 已断开"); error("请主动点击试穿按钮重试"); }
        }, { once: true }));
        output.srcObject = stream;
        output.play().catch(() => {});
        frameCallback = output.requestVideoFrameCallback(() => firstFrame(id));
      },
      onConnectionChange: (state) => {
        if (id !== runId) return;
        if (firstFrameAt === null && ["connected", "generating"].includes(state)) loading("等待第一帧试穿画面");
        if (["reconnecting", "disconnected"].includes(state)) {
          stopTrial("连接已中断，AI 已停止");
          error("不会自动重试，请主动点击试穿按钮重新开始");
        }
      },
    });
    if (id !== runId) { connection.disconnect(); return; }
    realtime = connection;
    connection.on("error", () => {
      if (id !== runId) return;
      stopTrial("连接异常，已断开");
      error("实时连接发生错误，请检查网络、余额后重试");
    });
    connection.on("sessionEnded", () => {
      if (id === runId) stopTrial("服务端已结束会话");
    });
  } catch (err) {
    if (id !== runId || activeController.signal.aborted) return;
    stopTrial("试穿失败，已断开", false);
    const text = err && typeof err === "object" && "message" in err ? String(err.message) : "试穿连接失败，请检查网络后重试";
    error(Object.hasOwn(english, text) ? text : "试穿连接失败，请检查网络后重试");
  }
}

function selectImage(item) {
  stopTrial(item ? (cameraStream ? "就试它啦✨ · 点击 10 秒 / 20 秒" : "就试它啦✨ · 等待开启摄像头") : "先在网页挑选一件衣服", false);
  selectedUrl = item?.url || null;
  $("status").title = item?.label || "";
  clearSnapshot();
  error();
  updateButtons();
}
function loadSource(state) {
  sourceTabId = Number.isInteger(state?.sourceTabId) ? state.sourceTabId : null;
  selectImage(state?.selectedItem || null);
  if (sourceTabId === null) error("请在购物页面点击插件图标启用选衣");
}
$("enable-camera").addEventListener("click", enableCamera);
$("close-camera").addEventListener("click", closeCamera);
$("quick").addEventListener("click", () => startTrial(10));
$("fine").addEventListener("click", () => startTrial(20));
chrome.runtime.onMessage.addListener((incoming, sender, reply) => {
  if (sender.id !== chrome.runtime.id || sender.tab || incoming.target !== "panel") return;
  if (incoming.type === "source-changed") {
    stopTrial("已切换购物页面", false);
    loadSource(incoming.state);
  } else if (incoming.type === "garment-picked" && incoming.tabId === sourceTabId) {
    selectImage(incoming.item);
  } else if (incoming.type === "source-navigating") {
    selectImage(null);
    message("购物页面已刷新或关闭 · AI 已停止");
  } else if (incoming.type === "panel-hidden") {
    closeCamera();
  } else if (incoming.type === "picker-unavailable") {
    error("请在新购物页面重新点击插件图标启用选衣");
  }
  reply({ ok: true });
});
function stopOnFailure(text) {
  if (!busy) return;
  stopTrial(text);
  error("已停止生成，不会自动重试；可以主动点击按钮重新开始");
}
window.addEventListener("offline", () => stopOnFailure("网络已断开，AI 已停止"));
window.addEventListener("error", () => stopOnFailure("界面发生异常，AI 已停止"));
window.addEventListener("unhandledrejection", () => stopOnFailure("操作发生异常，AI 已停止"));
document.addEventListener("visibilitychange", () => {
  if (document.hidden) closeCamera();
  else { trialTimer?.checkDeadline(); void checkHelper(); }
});
document.addEventListener("freeze", closeCamera);
window.addEventListener("pagehide", closeCamera);
window.addEventListener("beforeunload", closeCamera);
void chrome.runtime.sendMessage({ target: "background", type: "get-state" }).then((response) => {
  if (response?.ok) {
    authorized = true;
    $("enable-camera").disabled = false;
    loadSource(response.state);
  } else error("请在购物页面点击插件图标打开试衣镜");
}).catch(() => error("请在购物页面重新打开试衣镜"));
async function checkHelper() {
  if (helperChecking) return;
  helperChecking = true;
  try {
    const response = await fetch(backend + "/api/health", { cache: "no-store", signal: AbortSignal.timeout(2000) });
    if (!response.ok) throw new Error();
    const health = await response.json();
    if (typeof health.configured !== "boolean") throw new Error();
    const changed = helperCredentialVersion && health.credentialVersion !== helperCredentialVersion;
    helperCredentialVersion = health.credentialVersion || null;
    helperReady = health.configured;
    if ((!helperReady || changed) && busy) stopTrial("密钥配置已变更，AI 已停止");
    if (!helperReady) {
      helperError = "请点击标题栏 ⚙，在本地助手中配置你自己的 Decart Key。";
      error(helperError);
    } else if ($("error").dataset.i18n === helperError) error();
  } catch {
    helperReady = false;
    if (busy) stopTrial("本地助手已断开，AI 已停止");
    helperError = "请先启动本地助手。点击标题栏 ⚙ 查看设置。";
    error(helperError);
  } finally { helperChecking = false; updateButtons(); }
}
void checkHelper();
// Only active trials poll; preview and settings never mint a generation token.
setInterval(() => { if (busy) void checkHelper(); }, 2500);
updateButtons();

// Resize only the frame, never the underlying shopping page.
new ResizeObserver(() => {
  void chrome.runtime.sendMessage({ target: "background", type: "panel-size",
    height: Math.ceil(document.querySelector("main").getBoundingClientRect().height) }).catch(() => {});
}).observe(document.querySelector("main"));
