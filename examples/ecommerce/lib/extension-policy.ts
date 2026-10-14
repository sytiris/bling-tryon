import { EXTENSION_ID, EXTENSION_ORIGIN } from "./extension-id.ts";

export function isExtensionRequest(headers: Headers) {
  const origin = headers.get("origin");
  return headers.get("x-tryon-extension") === EXTENSION_ID &&
    (origin === null || origin === EXTENSION_ORIGIN);
}

export function maxSessionSeconds(duration: unknown) {
  if (duration !== 10 && duration !== 20) throw new Error("仅支持 10 秒或 20 秒试穿");
  return duration + 35; // 30s first-frame deadline, then 10/20s, with a small transport margin.
}
