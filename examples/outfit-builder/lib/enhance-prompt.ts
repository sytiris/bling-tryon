import { captureVideoFrame } from "./image-utils";

/**
 * Generates a try-on prompt from a garment image using GPT-4o-mini.
 * Optionally captures a frame from the camera to provide context about
 * what the person is currently wearing.
 */
export async function enhancePrompt(
  garmentBlob: Blob,
  localVideo?: HTMLVideoElement | null
): Promise<string | null> {
  const formData = new FormData();
  formData.append("image", garmentBlob);

  if (localVideo && localVideo.videoWidth > 0) {
    const personFrame = await captureVideoFrame(localVideo);
    formData.append("personFrame", personFrame);
  }

  const res = await fetch("/api/enhance-prompt", {
    method: "POST",
    body: formData,
  });
  const data = await res.json();
  return data.prompt || null;
}

/**
 * Generates a combined outfit prompt from top + bottom garment images.
 */
export async function generateOutfitPrompt(
  topBlob: Blob,
  bottomBlob: Blob,
  localVideo?: HTMLVideoElement | null
): Promise<string | null> {
  const formData = new FormData();
  formData.append("topImage", topBlob);
  formData.append("bottomImage", bottomBlob);

  if (localVideo && localVideo.videoWidth > 0) {
    const personFrame = await captureVideoFrame(localVideo);
    formData.append("personFrame", personFrame);
  }

  const res = await fetch("/api/outfit-prompt", {
    method: "POST",
    body: formData,
  });
  const data = await res.json();
  return data.prompt || null;
}

/**
 * Validates whether a clothing item is compatible with the person's visible body.
 */
export async function validateFit(
  garmentBlob: Blob,
  localVideo?: HTMLVideoElement | null
): Promise<{ ok: boolean; message?: string }> {
  if (!localVideo || localVideo.videoWidth === 0) {
    return { ok: true };
  }

  const formData = new FormData();
  formData.append("image", garmentBlob);
  const personFrame = await captureVideoFrame(localVideo);
  formData.append("personFrame", personFrame);

  const res = await fetch("/api/validate-fit", {
    method: "POST",
    body: formData,
  });
  return res.json();
}
