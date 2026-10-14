"use client";

import { useState, useCallback, useRef } from "react";

export function useMirrorCamera() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const requestCamera = useCallback(async () => {
    try {
      // Try environment-facing camera at 1280x720 (typical mirror setup)
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: "environment",
          frameRate: 20,
          width: { exact: 1280 },
          height: { exact: 720 },
        },
      });

      streamRef.current = mediaStream;
      setStream(mediaStream);
      setError(null);
      return mediaStream;
    } catch {
      // Fall back to any camera
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            frameRate: 20,
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });
        streamRef.current = mediaStream;
        setStream(mediaStream);
        setError(null);
        return mediaStream;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Camera access denied"
        );
        return null;
      }
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      setStream(null);
    }
  }, []);

  return { stream, error, requestCamera, stopCamera };
}
