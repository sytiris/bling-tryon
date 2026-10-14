// Injected into Chrome's isolated world. No page scripts or AI calls are involved.
export function installHoverPicker({ minimized = false, panelUrl } = {}) {
  if (window.__blingExpand && document.getElementById("bling-floating-room")?.isConnected) {
    window.__blingExpand(!minimized);
    return;
  }
  window.__blingRemovePicker?.();
  const host = document.createElement("div");
  host.id = "bling-hover-picker";
  host.style.cssText = "all:initial;position:fixed;z-index:2147483646;display:none;";
  const shadow = host.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = `button{all:initial;box-sizing:border-box;display:block;cursor:pointer;font:600 10px/1.3 'PingFang SC',sans-serif;color:#254f3c;background:rgba(255,255,255,.68);backdrop-filter:blur(8px);border:1px solid #ffffff80;border-radius:20px;padding:4px 7px;box-shadow:0 3px 12px #0002;white-space:nowrap}button:hover,button:focus-visible{background:rgba(255,255,255,.9);outline:2px solid #fff;outline-offset:2px}button:disabled{cursor:wait;opacity:.7}`;
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = "试试这件";
  button.setAttribute("aria-label", "试试这件");
  shadow.append(style, button);
  document.documentElement.append(host);
  const dock = document.createElement("div");
  dock.id = "bling-mini-dock";
  dock.style.cssText = "all:initial;position:fixed;z-index:2147483646;";
  const dockShadow = dock.attachShadow({ mode: "open" });
  dockShadow.innerHTML = `<style>:host{font-family:'PingFang SC',sans-serif}div{display:flex;align-items:center;background:#292d2a;color:#fff;border:1px solid #ffffff60;border-radius:10px;box-shadow:0 5px 20px #0003;overflow:hidden}button{all:initial;box-sizing:border-box;cursor:pointer;color:inherit;font:600 13px/1.4 'PingFang SC',sans-serif;padding:10px 12px;white-space:nowrap}button:first-of-type{touch-action:none;cursor:grab}button:first-of-type:active{cursor:grabbing}button:focus-visible{outline:2px solid #b7d1b8;outline-offset:-3px}.close{color:#b8c1b9;padding:10px}</style><div><button class="open" title="点击展开，拖动可移动位置" aria-label="展开试衣镜bling">⠿　▣ 试衣镜bling</button><button class="close" aria-label="关闭试衣镜">×</button></div>`;
  document.documentElement.append(dock);
  const dockOpen = dockShadow.querySelector(".open");
  let dockPosition = window.__blingDockPosition || { x: innerWidth - 226, y: innerHeight - 66 };
  function placeDock() {
    dockPosition.x = Math.max(8, Math.min(dockPosition.x, innerWidth - (dock.offsetWidth || 210) - 8));
    dockPosition.y = Math.max(8, Math.min(dockPosition.y, innerHeight - (dock.offsetHeight || 42) - 8));
    dock.style.left = dockPosition.x + "px"; dock.style.top = dockPosition.y + "px";
    window.__blingDockPosition = dockPosition;
  }
  function showDock(visible) { dock.style.display = visible ? "block" : "none"; if (visible) placeDock(); }
  const room = document.createElement("div");
  room.id = "bling-floating-room";
  room.style.cssText = "all:initial;position:fixed;z-index:2147483647;width:320px;max-width:calc(100vw - 16px);";
  const roomShadow = room.attachShadow({ mode: "open" });
  roomShadow.innerHTML = `<style>
    .window{background:#f6f4ee;border:1px solid #d8ddd5;border-radius:13px;box-shadow:0 10px 40px #0003;overflow:hidden}
    header{display:flex;align-items:center;justify-content:space-between;padding:8px 10px;color:#254f3c;cursor:grab;touch-action:none;user-select:none;font:600 14px/1.4 'PingFang SC',sans-serif}
    header:active{cursor:grabbing}em{font:italic 15px Georgia,serif;margin-left:5px}
    .actions{display:flex;gap:3px}button{all:initial;box-sizing:border-box;cursor:pointer;text-align:center;font:20px/24px sans-serif;color:#647168;width:25px;height:25px;border-radius:5px}button:hover{background:#e6e9df}button:focus-visible{outline:2px solid #648971}
    iframe{display:block;width:100%;height:390px;border:0;background:#f6f4ee;max-height:calc(100vh - 64px)}
  </style><div class="window"><header title="拖动标题栏移动浮窗"><span>试衣镜<em>bling ✧</em></span><div class="actions"><button class="settings" aria-label="设置 Decart 密钥" title="本地助手设置">⚙</button><button class="minimize" aria-label="缩小为网页标签" title="收起并关闭摄像头">−</button><button class="close" aria-label="关闭试衣镜" title="关闭试衣镜">×</button></div></header></div>`;
  document.documentElement.append(room);
  let roomPosition = window.__blingRoomPosition || { x: innerWidth - 344, y: 80 };
  function placeRoom() {
    roomPosition.x = Math.max(8, Math.min(roomPosition.x, innerWidth - (room.offsetWidth || 320) - 8));
    roomPosition.y = Math.max(8, Math.min(roomPosition.y, innerHeight - (room.offsetHeight || 400) - 8));
    room.style.left = roomPosition.x + "px"; room.style.top = roomPosition.y + "px";
    window.__blingRoomPosition = roomPosition;
  }
  function expand(expanded) {
    let frame = roomShadow.querySelector("iframe");
    room.style.display = expanded ? "block" : "none";
    if (expanded && !frame) {
      frame = document.createElement("iframe");
      frame.title = "试衣镜bling";
      frame.allow = "camera *; autoplay *";
      frame.src = panelUrl;
      roomShadow.querySelector(".window").append(frame);
    } else if (!expanded) frame?.remove();
    showDock(!expanded);
    if (expanded) placeRoom();
  }
  window.__blingExpand = expand;
  expand(!minimized);
  const header = roomShadow.querySelector("header");
  let roomDrag = null;
  header.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || event.target.closest("button")) return;
    roomDrag = { x: event.clientX, y: event.clientY, left: roomPosition.x, top: roomPosition.y };
    header.setPointerCapture(event.pointerId);
  });
  header.addEventListener("pointermove", (event) => {
    if (!roomDrag) return;
    roomPosition = { x: roomDrag.left + event.clientX - roomDrag.x, y: roomDrag.top + event.clientY - roomDrag.y };
    placeRoom();
  });
  header.addEventListener("pointerup", () => { roomDrag = null; });
  header.addEventListener("pointercancel", () => { roomDrag = null; });
  function closeRoom(type) {
    chrome.runtime.sendMessage({ target: "background", type }).then((response) => {
      if (!response?.ok) remove();
    }).catch(remove);
  }
  roomShadow.querySelector(".settings").addEventListener("click", () => closeRoom("open-settings"));
  roomShadow.querySelector(".minimize").addEventListener("click", () => closeRoom("minimize-panel"));
  roomShadow.querySelector(".close").addEventListener("click", () => closeRoom("close-mirror"));
  window.addEventListener("resize", placeRoom);
  let drag = null;
  let dragged = false;
  dockOpen.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    dragged = false;
    drag = { x: event.clientX, y: event.clientY, left: dockPosition.x, top: dockPosition.y };
    dockOpen.setPointerCapture(event.pointerId);
  });
  dockOpen.addEventListener("pointermove", (event) => {
    if (!drag) return;
    const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
    if (Math.hypot(dx, dy) > 5) dragged = true;
    if (!dragged) return;
    dockPosition = { x: drag.left + dx, y: drag.top + dy }; placeDock();
  });
  dockOpen.addEventListener("pointerup", () => { drag = null; });
  dockOpen.addEventListener("pointercancel", () => { drag = null; });
  dockOpen.addEventListener("click", async () => {
    if (dragged) { dragged = false; return; }
    try { await chrome.runtime.sendMessage({ target: "background", type: "open-panel" }); } catch { remove(); }
  });
  dockShadow.querySelector(".close").addEventListener("click", () => {
    chrome.runtime.sendMessage({ target: "background", type: "close-mirror" }).catch(() => {});
    remove();
  });
  window.addEventListener("resize", placeDock);
  let current = null;
  let hideTimer = null;
  let pending = false;
  function valid(image) {
    if (!(image instanceof HTMLImageElement) || image.closest("header,nav,footer")) return false;
    const box = image.getBoundingClientRect();
    return box.width >= 100 && box.height >= 100 && !/logo|icon|avatar|二维码/i.test(image.alt);
  }
  function place() {
    if (!current?.isConnected) { hide(); return; }
    const box = current.getBoundingClientRect();
    if (box.bottom < 36 || box.top >= innerHeight || box.right < 80 || box.left > innerWidth) { hide(); return; }
    host.style.display = "block";
    host.style.left = Math.max(4, Math.min(box.right - host.offsetWidth - 8, innerWidth - host.offsetWidth - 4)) + "px";
    host.style.top = Math.max(4, box.top + 8) + "px";
  }
  function hide() { host.style.display = "none"; current = null; }
  function hover(event) {
    clearTimeout(hideTimer);
    if (event.composedPath().includes(host)) return;
    if (event.composedPath().includes(room) || event.composedPath().includes(dock)) { hide(); return; }
    let image = event.target.closest?.("img");
    // Product links sometimes place an overlay above the image.
    if (!image) image = document.elementsFromPoint(event.clientX, event.clientY).find(valid);
    if (!valid(image)) {
      const card = event.target.closest?.("a,article,[data-product-id],[class*='product-card']");
      image = [...(card?.querySelectorAll("img") || [])].find((item) => {
        const box = item.getBoundingClientRect();
        return valid(item) && event.clientX >= box.left && event.clientX <= box.right && event.clientY >= box.top && event.clientY <= box.bottom;
      });
    }
    if (valid(image)) { if (current !== image) button.textContent = "试试这件"; current = image; place(); }
    else hideTimer = setTimeout(hide, 160);
  }
  host.addEventListener("pointerenter", () => clearTimeout(hideTimer));
  host.addEventListener("pointerleave", () => { hideTimer = setTimeout(hide, 160); });
  button.addEventListener("click", async (event) => {
    event.preventDefault(); event.stopPropagation();
    if (!current || pending) return;
    let url;
    try { url = new URL(current.currentSrc || current.src, location.href); } catch { return; }
    if (!["http:", "https:"].includes(url.protocol)) return;
    const card = current.closest("article,[data-product-id],[class*='product-card'],a") || current.parentElement;
    const label = (current.alt || card?.querySelector("h2,h3,[itemprop='name']")?.textContent || document.querySelector("h1")?.textContent || document.title).trim().slice(0, 160);
    const price = card?.querySelector("[itemprop='price'],[class*='price']")?.textContent?.trim().slice(0, 60) || "";
    pending = button.disabled = true;
    try {
      const response = await chrome.runtime.sendMessage({ target: "background", type: "garment-picked", item: { url: url.href, label, price, pageTitle: document.title.slice(0, 120), site: location.hostname } });
      button.textContent = response?.ok ? "已选好 ✨" : "请重新打开试衣镜";
      if (response?.ok) dockOpen.textContent = "⠿　已选好，展开试衣镜";
    } catch { remove(); }
    finally { pending = button.disabled = false; }
  });
  function onMessage(message, sender) {
    if (sender.id !== chrome.runtime.id || sender.tab) return;
    if (message.type === "remove-hover-picker") remove();
    if (message.type === "panel-visibility") expand(message.expanded);
    if (message.type === "panel-size") {
      const frame = roomShadow.querySelector("iframe");
      if (frame && Number.isFinite(message.height)) {
        frame.style.height = Math.max(100, Math.min(600, message.height)) + "px";
        placeRoom();
      }
    }
  }
  function remove() {
    clearTimeout(hideTimer);
    document.removeEventListener("pointerover", hover, true);
    window.removeEventListener("scroll", place, true);
    window.removeEventListener("resize", place);
    window.removeEventListener("pagehide", remove);
    try { chrome.runtime.onMessage.removeListener(onMessage); } catch {}
    window.removeEventListener("resize", placeDock);
    window.removeEventListener("resize", placeRoom);
    room.remove();
    host.remove();
    dock.remove();
    delete window.__blingExpand;
    delete window.__blingRemovePicker;
  }
  window.__blingRemovePicker = remove;
  document.addEventListener("pointerover", hover, true);
  window.addEventListener("scroll", place, true);
  window.addEventListener("resize", place);
  window.addEventListener("pagehide", remove);
  chrome.runtime.onMessage.addListener(onMessage);
  return { title: document.title.slice(0, 120) };
}
