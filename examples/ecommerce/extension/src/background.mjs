import { installHoverPicker } from "./page-tools.mjs";

const stateKeys = ["sourceTabId", "selectedItem", "panelOpen"];
const getState = () => chrome.storage.session.get(stateKeys);
const notifyPanel = (message) => chrome.runtime.sendMessage({ target: "panel", ...message }).catch(() => null);
async function notifyPage(tabId, message) {
  if (Number.isInteger(tabId)) return chrome.tabs.sendMessage(tabId, message).catch(() => null);
}
async function enablePicker(tabId, expanded) {
  await chrome.scripting.executeScript({ target: { tabId }, func: installHoverPicker,
    args: [{ minimized: !expanded, panelUrl: chrome.runtime.getURL("panel.html") }] });
}
async function activateSource(tab) {
  const previous = await getState();
  if (previous.sourceTabId !== tab.id) {
    await notifyPanel({ type: "panel-hidden" });
    await notifyPage(previous.sourceTabId, { type: "remove-hover-picker" });
  }
  await chrome.storage.session.set({ sourceTabId: tab.id, panelOpen: true,
    selectedItem: previous.sourceTabId === tab.id ? (previous.selectedItem || null) : null });
  await enablePicker(tab.id, true);
}
chrome.action.onClicked.addListener((tab) => { activateSource(tab).catch(() => {}); });
chrome.tabs.onUpdated.addListener(async (tabId, change) => {
  if (!change.status) return;
  const state = await getState();
  if (tabId !== state.sourceTabId) return;
  if (change.status === "loading") {
    await notifyPanel({ type: "panel-hidden" });
    await chrome.storage.session.set({ selectedItem: null });
  }
  if (change.status === "complete") await enablePicker(tabId, state.panelOpen).catch(() => {});
});
chrome.tabs.onRemoved.addListener(async (tabId) => {
  const { sourceTabId } = await getState();
  if (tabId !== sourceTabId) return;
  await notifyPanel({ type: "panel-hidden" });
  await chrome.storage.session.remove(stateKeys);
});
chrome.runtime.onMessage.addListener((message, sender, reply) => {
  if (message.target !== "background" || sender.id !== chrome.runtime.id) return;
  (async () => {
    const state = await getState();
    const sameTab = sender.tab?.id === state.sourceTabId;
    const fromPanel = sameTab && sender.frameId > 0 && sender.url === chrome.runtime.getURL("panel.html");
    const fromPage = sameTab && sender.frameId === 0;
    if (message.type === "open-settings" && (fromPanel || fromPage)) {
      await notifyPanel({ type: "panel-hidden" });
      await chrome.runtime.openOptionsPage();
      return { ok: true };
    }
    if (message.type === "get-state" && fromPanel) return { ok: true, state };
    if (message.type === "panel-size" && fromPanel) {
      await notifyPage(state.sourceTabId, { type: "panel-size", height: message.height });
      return { ok: true };
    }
    if (message.type === "open-panel" && fromPage) {
      await chrome.storage.session.set({ panelOpen: true });
      await notifyPage(state.sourceTabId, { type: "panel-visibility", expanded: true });
      return { ok: true };
    }
    if (message.type === "garment-picked" && fromPage) {
      const item = message.item;
      if (!item || !["http:", "https:"].includes(new URL(item.url).protocol)) throw new Error("Invalid image");
      const selectedItem = { url: item.url, label: String(item.label || "网页服装").slice(0, 160) };
      await chrome.storage.session.set({ selectedItem });
      await notifyPanel({ type: "garment-picked", tabId: state.sourceTabId, item: selectedItem });
      return { ok: true };
    }
    if (["minimize-panel", "close-mirror"].includes(message.type) && (fromPanel || fromPage)) {
      // The frame acknowledges synchronous track/socket cleanup before we detach it.
      await notifyPanel({ type: "panel-hidden" });
      await chrome.storage.session.set({ panelOpen: false });
      await notifyPage(state.sourceTabId, { type: message.type === "close-mirror" ? "remove-hover-picker" : "panel-visibility", expanded: false });
      if (message.type === "close-mirror") await chrome.storage.session.remove(stateKeys);
      return { ok: true };
    }
    throw new Error("Invalid action");
  })().then(reply, () => reply({ ok: false, error: "请在购物页面重新点击插件图标启用试衣镜" }));
  return true;
});
