export async function urlToImageBlob(url: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth || 512;
      canvas.height = img.naturalHeight || 512;
      const ctx = canvas.getContext("2d")!;

      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Failed to convert image"));
        },
        "image/jpeg",
        0.9
      );
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = url;
  });
}

export async function resizeImageBlob(
  blob: Blob,
  maxSize = 1024
): Promise<Blob> {
  const img = await loadImage(blob);
  const { naturalWidth: w, naturalHeight: h } = img;
  if (w <= maxSize && h <= maxSize) return blob;

  const scale = maxSize / Math.max(w, h);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Failed to resize image"))),
      "image/jpeg",
      0.8
    );
  });
}

export function captureVideoFrame(
  video: HTMLVideoElement,
  maxSize = 320
): Promise<Blob> {
  const { videoWidth: w, videoHeight: h } = video;
  const scale = maxSize / Math.max(w, h);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Failed to capture frame"))),
      "image/jpeg",
      0.7
    );
  });
}

/**
 * Combines two garment images (top + bottom) into a single vertically-stacked
 * image on a white background. Both images are scaled to the same width.
 */
export async function combineClothingImages(
  topBlob: Blob,
  bottomBlob: Blob
): Promise<Blob> {
  const [topImg, bottomImg] = await Promise.all([
    loadImage(topBlob),
    loadImage(bottomBlob),
  ]);

  const targetWidth = 512;
  const topScale = targetWidth / topImg.naturalWidth;
  const bottomScale = targetWidth / bottomImg.naturalWidth;
  const topHeight = Math.round(topImg.naturalHeight * topScale);
  const bottomHeight = Math.round(bottomImg.naturalHeight * bottomScale);

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = topHeight + bottomHeight;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(topImg, 0, 0, targetWidth, topHeight);
  ctx.drawImage(bottomImg, 0, topHeight, targetWidth, bottomHeight);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) =>
        b ? resolve(b) : reject(new Error("Failed to combine clothing images")),
      "image/jpeg",
      0.9
    );
  });
}

export function loadImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error("Failed to load image"));
    };
    img.src = URL.createObjectURL(blob);
  });
}
