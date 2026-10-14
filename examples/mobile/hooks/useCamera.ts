"use client";

import { useState, useCallback, useRef } from "react";

export type FacingMode = "user" | "environment";

export function useCamera() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<FacingMode>("user");
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const facingModeRef = useRef<FacingMode>("user");

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      setStream(null);
    }
  }, []);

  const openCamera = useCallback(
    async (mode: FacingMode): Promise<MediaStream | null> => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: mode },
        });
        stopCamera();
        streamRef.current = mediaStream;
        facingModeRef.current = mode;
        setFacingMode(mode);
        setStream(mediaStream);
        setError(null);
        return mediaStream;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Camera access denied";
        setError(msg);
        return null;
      }
    },
    [stopCamera]
  );

  const startCamera = useCallback(
    () => openCamera(facingModeRef.current),
    [openCamera]
  );

  // Flip between the front and back camera. Falls back to the front camera
  // when the device has no rear camera. Returns the new stream so the caller
  // can hand it to a fresh realtime connection.
  const switchCamera = useCallback(async () => {
    const next: FacingMode = facingModeRef.current === "user" ? "environment" : "user";
    const mediaStream = await openCamera(next);
    if (mediaStream) return mediaStream;
    return openCamera("user");
  }, [openCamera]);

  return { stream, facingMode, error, startCamera, switchCamera, stopCamera };
}
