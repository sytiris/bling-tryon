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

export async function extractClothing(imageBlob: Blob): Promise<Blob> {
  const formData = new FormData();
  formData.append("image", imageBlob);
  const res = await fetch("/api/extract-clothing", {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    throw new Error(`Clothing extraction failed: ${res.status}`);
  }
  return res.blob();
}

export async function generateExtremePrecision(
  clothingBlob: Blob,
  personBlob: Blob
): Promise<Blob> {
  const formData = new FormData();
  formData.append("clothing", clothingBlob);
  formData.append("person", personBlob);
  const res = await fetch("/api/extreme-precision", {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    throw new Error(`Extreme precision generation failed: ${res.status}`);
  }
  return res.blob();
}

export async function checkHasPerson(imageBlob: Blob): Promise<boolean> {
  const formData = new FormData();
  formData.append("image", imageBlob);
  const res = await fetch("/api/check-person", {
    method: "POST",
    body: formData,
  });
  if (!res.ok) return true;
  const data = await res.json();
  return data.hasPerson;
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
