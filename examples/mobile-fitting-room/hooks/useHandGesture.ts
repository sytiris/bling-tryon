"use client";

import { useEffect, useRef, useState, useCallback } from "react";

const MIN_INTERVAL_MS = 150;
const DWELL_MS = 1500;
const GESTURE_DISPLAY_MS = 1500;
const LOST_GRACE_MS = 500;

// Pose landmark indices
const LEFT_WRIST = 15;
const RIGHT_WRIST = 16;
const LEFT_SHOULDER = 11;
const RIGHT_SHOULDER = 12;

type GestureDirection = "left" | "right";

export interface HandBounds {
  cx: number;
  cy: number;
  radius: number;
  videoWidth: number;
  videoHeight: number;
}

interface UseHandGestureOptions {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  enabled: boolean;
}

export interface UseHandGestureReturn {
  isModelLoading: boolean;
  handDetected: boolean;
  lastGesture: GestureDirection | null;
  gestureCount: number;
  activeHand: GestureDirection | null;
  dwellProgress: number;
  handBounds: HandBounds | null;
  debugStatus: string;
}

export function useHandGesture({
  videoRef,
  enabled,
}: UseHandGestureOptions): UseHandGestureReturn {
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [handDetected, setHandDetected] = useState(false);
  const [lastGesture, setLastGesture] = useState<GestureDirection | null>(null);
  const [gestureCount, setGestureCount] = useState(0);
  const [activeHand, setActiveHand] = useState<GestureDirection | null>(null);
  const [dwellProgress, setDwellProgress] = useState(0);
  const [handBounds, setHandBounds] = useState<HandBounds | null>(null);
  const [debugStatus, setDebugStatus] = useState("idle");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const modelRef = useRef<any>(null);
  const runningRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const lastRunRef = useRef(0);
  const gestureTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Dwell tracking
  const dwellStartRef = useRef<number | null>(null);
  const currentHandRef = useRef<GestureDirection | null>(null);
  const firedHandRef = useRef<GestureDirection | null>(null);
  const lastSeenRef = useRef<number>(0);
  const debugCountRef = useRef(0);

  const fireGesture = useCallback((direction: GestureDirection) => {
    setLastGesture(direction);
    setGestureCount((c) => c + 1);
    if (gestureTimerRef.current) clearTimeout(gestureTimerRef.current);
    gestureTimerRef.current = setTimeout(
      () => setLastGesture(null),
      GESTURE_DISPLAY_MS
    );
  }, []);

  const loadModel = useCallback(async () => {
    if (modelRef.current) return;
    setIsModelLoading(true);
    setDebugStatus("loading model...");
    try {
      const vision = await import("@mediapipe/tasks-vision");
      const { PoseLandmarker, FilesetResolver } = vision;
      const wasmFileset = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
      );

      const modelOptions = {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task",
          delegate: "GPU" as "GPU" | "CPU",
        },
        numPoses: 1,
        runningMode: "IMAGE" as const,
        minPoseDetectionConfidence: 0.3,
        minPosePresenceConfidence: 0.3,
        minTrackingConfidence: 0.3,
      };

      try {
        modelRef.current = await PoseLandmarker.createFromOptions(wasmFileset, modelOptions);
        setDebugStatus("model ready (GPU)");
      } catch {
        setDebugStatus("GPU failed, trying CPU...");
        modelOptions.baseOptions.delegate = "CPU";
        modelRef.current = await PoseLandmarker.createFromOptions(wasmFileset, modelOptions);
        setDebugStatus("model ready (CPU)");
      }
    } catch (err) {
      setDebugStatus(`load failed: ${err}`);
    } finally {
      setIsModelLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      setHandDetected(false);
      setActiveHand(null);
      setDwellProgress(0);
      setHandBounds(null);
      dwellStartRef.current = null;
      currentHandRef.current = null;
      firedHandRef.current = null;
      return;
    }

    loadModel().then(() => {
      if (!modelRef.current) return;

      const tick = (now: number) => {
        rafRef.current = requestAnimationFrame(tick);

        if (now - lastRunRef.current < MIN_INTERVAL_MS) return;
        if (runningRef.current) return;

        lastRunRef.current = now;
        runningRef.current = true;

        try {
          const video = videoRef.current;
          if (!video || video.readyState < 2 || !video.videoWidth || !video.videoHeight) {
            runningRef.current = false;
            return;
          }

          // Draw video frame to offscreen canvas to force fresh frame extraction
          if (!canvasRef.current) {
            canvasRef.current = document.createElement("canvas");
          }
          const canvas = canvasRef.current;
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext("2d");
          if (!ctx) { runningRef.current = false; return; }
          ctx.drawImage(video, 0, 0);

          // Detect on canvas (IMAGE mode — always reads fresh pixels)
          const result = modelRef.current.detect(canvas);

          if (!result.landmarks || result.landmarks.length === 0) {
            debugCountRef.current++;
            setDebugStatus(`no pose (${debugCountRef.current}) ${video.videoWidth}x${video.videoHeight}`);
            if (now - lastSeenRef.current > LOST_GRACE_MS) {
              setHandDetected(false);
              setActiveHand(null);
              setDwellProgress(0);
              setHandBounds(null);
              dwellStartRef.current = null;
              currentHandRef.current = null;
              firedHandRef.current = null;
            }
            runningRef.current = false;
            return;
          }

          lastSeenRef.current = now;
          debugCountRef.current = 0;
          const pose = result.landmarks[0];

          const lw = pose[LEFT_WRIST];
          const rw = pose[RIGHT_WRIST];
          const ls = pose[LEFT_SHOULDER];
          const rs = pose[RIGHT_SHOULDER];

          // Check which hand is raised (wrist above shoulder)
          const leftRaised = lw.y < ls.y;
          const rightRaised = rw.y < rs.y;

          let raisedWrist = null;
          let direction: GestureDirection | null = null;

          if (rightRaised && leftRaised) {
            if (rw.y < lw.y) {
              raisedWrist = rw;
              direction = "right";
            } else {
              raisedWrist = lw;
              direction = "left";
            }
          } else if (rightRaised) {
            raisedWrist = rw;
            direction = "right";
          } else if (leftRaised) {
            raisedWrist = lw;
            direction = "left";
          }

          if (raisedWrist && direction) {
            setDebugStatus(`raised: ${direction}`);
            setHandDetected(true);
            setHandBounds({
              cx: raisedWrist.x,
              cy: raisedWrist.y,
              radius: 0.06,
              videoWidth: video.videoWidth,
              videoHeight: video.videoHeight,
            });

            if (direction === firedHandRef.current) {
              setActiveHand(null);
              setDwellProgress(0);
              runningRef.current = false;
              return;
            }

            if (direction !== currentHandRef.current) {
              currentHandRef.current = direction;
              dwellStartRef.current = now;
            }

            setActiveHand(direction);

            if (dwellStartRef.current !== null) {
              const elapsed = now - dwellStartRef.current;
              const progress = Math.min(elapsed / DWELL_MS, 1);
              setDwellProgress(progress);

              if (elapsed >= DWELL_MS) {
                fireGesture(direction);
                firedHandRef.current = direction;
                dwellStartRef.current = null;
                setActiveHand(null);
                setDwellProgress(0);
              }
            }
          } else {
            setDebugStatus(
              `LW:${lw.y.toFixed(2)}<LS:${ls.y.toFixed(2)}? ` +
              `RW:${rw.y.toFixed(2)}<RS:${rs.y.toFixed(2)}?`
            );
            setHandDetected(false);
            setHandBounds(null);
            setActiveHand(null);
            setDwellProgress(0);
            dwellStartRef.current = null;
            currentHandRef.current = null;
            firedHandRef.current = null;
          }
        } catch (err) {
          setDebugStatus(`err: ${err}`);
        } finally {
          runningRef.current = false;
        }
      };

      rafRef.current = requestAnimationFrame(tick);
    });

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [enabled, loadModel, videoRef, fireGesture]);

  useEffect(() => {
    return () => {
      if (gestureTimerRef.current) clearTimeout(gestureTimerRef.current);
    };
  }, []);

  return {
    isModelLoading,
    handDetected,
    lastGesture,
    gestureCount,
    activeHand,
    dwellProgress,
    handBounds,
    debugStatus,
  };
}
