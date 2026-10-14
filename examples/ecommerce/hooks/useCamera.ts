"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { models } from "@decartai/sdk";

export function useCamera() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const attemptRef = useRef(0);

  const stopCamera = useCallback(() => {
    attemptRef.current++;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setStream(null);
  }, []);

  const startCamera = useCallback(async () => {
    stopCamera();
    const attempt = attemptRef.current;
    setError(null);
    try {
      const model = models.realtime("lucy-vton-latest");
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: "user",
          frameRate: model.fps,
          width: { ideal: model.width },
          height: { ideal: model.height },
        },
      });
      if (attempt !== attemptRef.current) {
        mediaStream.getTracks().forEach((t) => t.stop());
        return null;
      }
      streamRef.current = mediaStream;
      setStream(mediaStream);
      setError(null);
      return mediaStream;
    } catch (err) {
      if (attempt !== attemptRef.current) return null;
      const msg = err instanceof Error ? err.message : "Camera access denied";
      setError(msg);
      return null;
    }
  }, [stopCamera]);

  useEffect(() => stopCamera, [stopCamera]);

  return { stream, error, startCamera, stopCamera };
}
