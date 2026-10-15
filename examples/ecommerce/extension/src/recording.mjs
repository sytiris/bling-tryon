import { centerSquare } from "./centered-input.mjs";

// Record only the visible AI output, never the local camera or audio.
// finish() stops capture synchronously; encoding completion is a separate promise.
export function recordOutput(video, { maxBytes = 32 * 1024 * 1024 } = {}) {
  if (!globalThis.MediaRecorder || !video.videoWidth || !video.videoHeight) return null;
  let recorder, stream, timer, deadline;
  let chunks = [], bytes = 0, finishing = false, discarded = false, settled = false;
  let resolveResult;
  const result = new Promise(resolve => { resolveResult = resolve; });
  function releaseCapture() {
    if (timer !== undefined) { clearInterval(timer); timer = undefined; }
    stream?.getTracks().forEach(track => { try { track.stop(); } catch {} });
    stream = null;
  }
  function settle(blob) {
    if (settled) return;
    settled = true;
    clearTimeout(deadline);
    chunks = [];
    resolveResult(blob);
  }
  function stopRecorder() {
    try { if (recorder?.state !== "inactive") recorder?.stop(); }
    catch { discarded = true; settle(null); }
    releaseCapture();
  }
  function discard() {
    discarded = true;
    chunks = [];
    stopRecorder();
    settle(null);
  }
  try {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = Math.min(720, video.videoWidth, video.videoHeight);
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) return null;
    function draw() {
      const source = centerSquare(video.videoWidth, video.videoHeight);
      if (source.size) context.drawImage(video, source.x, source.y, source.size, source.size, 0, 0, canvas.width, canvas.height);
    }
    draw();
    stream = canvas.captureStream(25);
    const mimeType = ["video/mp4", "video/webm;codecs=vp8", "video/webm"].find(type => MediaRecorder.isTypeSupported(type));
    recorder = new MediaRecorder(stream, { ...(mimeType ? { mimeType } : {}), videoBitsPerSecond: 2500000 });
    recorder.ondataavailable = ({ data }) => {
      if (discarded || settled || !data?.size) return;
      bytes += data.size;
      if (bytes > maxBytes) { discard(); return; }
      chunks.push(data);
    };
    recorder.onerror = discard;
    recorder.onstop = () => {
      releaseCapture();
      settle(discarded || !bytes ? null : new Blob(chunks, { type: recorder.mimeType || "video/webm" }));
    };
    recorder.start(500);
    timer = setInterval(() => { try { draw(); } catch { discard(); } }, 40);
    return {
      finish() {
        if (!finishing && !settled) {
          finishing = true;
          try { draw(); } catch { /* Keep already captured frames. */ }
          stopRecorder();
          if (!settled) deadline = setTimeout(discard, 3000);
        }
        return result;
      },
      discard,
    };
  } catch {
    discard();
    return null;
  }
}
