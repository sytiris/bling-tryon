const MAX_BYTES = 8 * 1024 * 1024;
export async function fetchGarment(url, signal) {
  const response = await fetch(url, { signal, credentials: "omit", referrerPolicy: "no-referrer" });
  if (!response.ok) throw new Error("网页图片下载失败，请在网页上改选图片或上传");
  if (Number(response.headers.get("content-length")) > MAX_BYTES) throw new Error("图片超过 8 MB");
  const reader = response.body.getReader();
  const chunks = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BYTES) { await reader.cancel(); throw new Error("图片超过 8 MB"); }
    chunks.push(value);
  }
  return new Blob(chunks, { type: response.headers.get("content-type") || "image/jpeg" });
}

export async function prepareGarment(blob) {
  if (blob.size > MAX_BYTES) throw new Error("图片超过 8 MB");
  const bitmap = await createImageBitmap(blob).catch(() => { throw new Error("图片无法解码，请上传 JPEG、PNG 或 WebP"); });
  try {
    const scale = Math.min(1, 1024 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    context.fillStyle = "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return await new Promise((resolve, reject) => canvas.toBlob(
      (image) => image ? resolve(image) : reject(new Error("服装图片处理失败")),
      "image/jpeg", .9,
    ));
  } finally { bitmap.close(); }
}
