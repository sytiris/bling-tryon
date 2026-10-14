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
