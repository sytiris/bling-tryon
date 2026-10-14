// Keep model-native 1280x720 transport. Only the center square contains camera
// pixels; side bands are blank. This controls framing, not Decart's per-second rate.
export function centerSquare(width, height) {
  const size = Math.min(width, height);
  return { x: (width - size) / 2, y: (height - size) / 2, size };
}
export function createCenteredInput(video, model) {
  if (!video.videoWidth || !video.videoHeight) throw new Error("摄像头画面尚未准备好");
  const canvas = document.createElement("canvas");
  canvas.width = model.width;
  canvas.height = model.height;
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) throw new Error("无法准备试穿画面");
  const target = centerSquare(canvas.width, canvas.height);
  const fps = typeof model.fps === "number" ? model.fps : (model.fps.ideal || model.fps.max || 30);
  function draw() {
    const source = centerSquare(video.videoWidth, video.videoHeight);
    if (!source.size) return;
    context.fillStyle = "#000";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.save();
    context.translate(canvas.width, 0);
    context.scale(-1, 1);
    context.drawImage(video, source.x, source.y, source.size, source.size,
      target.x, target.y, target.size, target.size);
    context.restore();
  }
  draw();
  const stream = canvas.captureStream(fps);
  const timer = setInterval(draw, 1000 / fps);
  return { stream, stop() { clearInterval(timer); stream.getTracks().forEach((track) => track.stop()); } };
}
