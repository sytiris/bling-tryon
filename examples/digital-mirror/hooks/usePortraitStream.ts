"use client";

import { useEffect, useRef, useState } from "react";

// Output dimensions: portrait (720w x 1280h)
const OUT_W = 720;
const OUT_H = 1280;
const FPS = 20;

/**
 * Takes a landscape camera MediaStream, crops the center to portrait
 * using an off-screen canvas, and returns a new MediaStream suitable
 * for sending to the Decart realtime model.
 */
export function usePortraitStream(cameraStream: MediaStream | null) {
  const [portraitStream, setPortraitStream] = useState<MediaStream | null>(
    null
  );
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number>(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (!cameraStream) {
      setPortraitStream(null);
      return;
    }

    const track = cameraStream.getVideoTracks()[0];
    if (!track) return;

    const settings = track.getSettings();
    const srcW = settings.width || 1280;
    const srcH = settings.height || 720;

    // How much of the source to crop (center strip)
    const srcAspect = srcW / srcH;
    const outAspect = OUT_W / OUT_H;
    let cropW: number, cropH: number, cropX: number, cropY: number;
    if (srcAspect > outAspect) {
      // Source is wider — crop sides
      cropH = srcH;
      cropW = Math.round(srcH * outAspect);
      cropX = Math.round((srcW - cropW) / 2);
      cropY = 0;
    } else {
      // Source is taller — crop top/bottom
      cropW = srcW;
      cropH = Math.round(srcW / outAspect);
      cropX = 0;
      cropY = Math.round((srcH - cropH) / 2);
    }

    // Create off-screen canvas
    const canvas = document.createElement("canvas");
    canvas.width = OUT_W;
    canvas.height = OUT_H;
    canvasRef.current = canvas;
    const ctx = canvas.getContext("2d")!;

    // Hidden video element to read camera frames
    const video = document.createElement("video");
    video.srcObject = cameraStream;
    video.muted = true;
    video.playsInline = true;
    videoRef.current = video;
    video.play();

    const interval = 1000 / FPS;
    let lastTime = 0;

    function drawFrame(now: number) {
      rafRef.current = requestAnimationFrame(drawFrame);
      if (now - lastTime < interval) return;
      lastTime = now;
      if (video.readyState >= 2) {
        ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, OUT_W, OUT_H);
      }
    }
    rafRef.current = requestAnimationFrame(drawFrame);

    // Capture stream from canvas at model fps
    const canvasStream = canvas.captureStream(FPS);
    setPortraitStream(canvasStream);

    return () => {
      cancelAnimationFrame(rafRef.current);
      video.pause();
      video.srcObject = null;
      videoRef.current = null;
      canvasRef.current = null;
      canvasStream.getTracks().forEach((t) => t.stop());
      setPortraitStream(null);
    };
  }, [cameraStream]);

  return portraitStream;
}
