"use client";

import { useCallback, useEffect, useRef } from "react";
import { FilesetResolver, PoseLandmarker } from "@mediapipe/tasks-vision";
import { KNEE_IN_FRAME_MAX_Y, POSE_MODEL_LOAD_TIMEOUT_MS } from "@/lib/constants";

// The model is ~3MB and the browser caches it, so only the first session pays.
const WASM_BASE = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task";

// MediaPipe pose landmark indices.
const KNEE_L = 25;
const KNEE_R = 26;

/**
 * Is enough of the person in frame to render a head-to-toe outfit?
 *
 * A full outfit spans head to toe, so the knees have to be in shot before the
 * result shows anything of the lower half. One knee is enough (hence
 * `Math.min`): the other can sit outside the frame or behind an arm with the
 * body still plainly in shot.
 *
 * Runs entirely in the browser with MediaPipe Pose Landmarker — no network
 * round trip and no per-call cost.
 */
export function usePoseBodyVisibility(stream: MediaStream | null) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  // Holds the in-flight or settled load so concurrent callers share one model.
  // Resolves to null when the model cannot be loaded at all.
  const loadRef = useRef<Promise<PoseLandmarker | null> | null>(null);

  const loadLandmarker = useCallback(() => {
    if (!loadRef.current) {
      loadRef.current = (async () => {
        try {
          const fileset = await FilesetResolver.forVisionTasks(WASM_BASE);
          return await PoseLandmarker.createFromOptions(fileset, {
            baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
            // IMAGE, not VIDEO: VIDEO mode tracks a pose across calls, so once
            // it has locked onto a full body it keeps reporting the knees as
            // visible after the person moves back in close. Each check must
            // be stateless.
            runningMode: "IMAGE",
            numPoses: 1,
          });
        } catch (e) {
          console.error("Pose model failed to load:", e);
          return null;
        }
      })();
    }
    return loadRef.current;
  }, []);

  // Offscreen element so detection reads the raw camera even when the visible
  // video has been swapped for the generated stream.
  useEffect(() => {
    if (!stream) return;
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.srcObject = stream;
    void video.play().catch(() => {});
    videoRef.current = video;
    // Start the download now so the first outfit send does not wait on it.
    void loadLandmarker();
    return () => {
      video.pause();
      video.srcObject = null;
      videoRef.current = null;
    };
  }, [stream, loadLandmarker]);

  useEffect(() => {
    return () => {
      void loadRef.current?.then((lm) => lm?.close());
    };
  }, []);

  /**
   * true / false when the model could judge the frame, null when it could not
   * (still loading, failed to load, no camera frame yet, or no pose found) so
   * the caller can fall back rather than guess.
   */
  const isBodyVisible = useCallback(async (): Promise<boolean | null> => {
    // The only await here: detect() is synchronous, so this deadline covers
    // the model download and nothing else. Timing out does not cancel the
    // load — it keeps warming in the background for the next call.
    const landmarker = await Promise.race([
      loadLandmarker(),
      new Promise<null>((resolve) =>
        window.setTimeout(() => resolve(null), POSE_MODEL_LOAD_TIMEOUT_MS)
      ),
    ]);
    const video = videoRef.current;
    if (!landmarker || !video || video.readyState < 2 || !video.videoWidth) return null;
    try {
      const pose = landmarker.detect(video).landmarks?.[0];
      // No pose at all is "cannot tell", not "cropped". The detector drops out
      // on hard lighting and odd angles, and a dropped frame must not be able
      // to block a send.
      if (!pose) return null;
      const left = pose[KNEE_L]?.y;
      const right = pose[KNEE_R]?.y;
      if (left === undefined && right === undefined) return null;
      return Math.min(left ?? Infinity, right ?? Infinity) <= KNEE_IN_FRAME_MAX_Y;
    } catch (e) {
      console.error("Pose detection failed:", e);
      return null;
    }
  }, [loadLandmarker]);

  return isBodyVisible;
}
