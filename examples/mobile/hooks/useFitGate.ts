"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePoseBodyVisibility } from "@/hooks/usePoseBodyVisibility";
import {
  FULL_OUTFIT_FIT_MESSAGE,
  POSE_CLEAR_CONFIRM_POLLS,
  POSE_CONFIRM_DELAY_MS,
  POSE_POLL_INTERVAL_MS,
} from "@/lib/constants";

export type FitGateResult = "clear" | "superseded";

/**
 * Body-framing gate for the outfit about to be sent.
 *
 * `awaitFitClearance()` resolves "clear" when the knees are in frame (or the
 * pose model cannot tell), and otherwise shows a warning and parks the send
 * until the person moves the camera back, taps Ignore, or a newer send
 * supersedes this one (in which case it resolves "superseded" and the caller
 * drops its send).
 */
export function useFitGate(stream: MediaStream | null) {
  const isBodyVisible = usePoseBodyVisibility(stream);
  const [fitWarning, setFitWarning] = useState<string | null>(null);

  // Bumped on every send. A verdict that arrives after a newer send began is
  // dropped rather than shown over the new one.
  const versionRef = useRef(0);
  // The send the visible warning is about. Its presence is what keeps the poll
  // below re-asking the pose model. Cleared on dismiss, so a manual close
  // stays closed until the next outfit.
  const subjectRef = useRef<{ version: number } | null>(null);
  // The send parked behind the warning. At most one exists: every entry point
  // supersedes the previous gate before installing its own.
  const releaseRef = useRef<((result: FitGateResult) => void) | null>(null);

  const supersede = useCallback(() => {
    versionRef.current += 1;
    subjectRef.current = null;
    setFitWarning(null);
    releaseRef.current?.("superseded");
    releaseRef.current = null;
  }, []);

  // Two agreeing frames a moment apart, so a single bad detection cannot raise
  // the card. Returns false only when both frames say the person is cropped.
  const confirmBodyVisible = useCallback(async (): Promise<boolean | null> => {
    const first = await isBodyVisible();
    if (first !== false) return first;
    await new Promise((resolve) => window.setTimeout(resolve, POSE_CONFIRM_DELAY_MS));
    return await isBodyVisible();
  }, [isBodyVisible]);

  const awaitFitClearance = useCallback(async (): Promise<FitGateResult> => {
    // A new outfit supersedes whatever warning is on screen, including one the
    // user had dismissed, and releases anything held behind it.
    supersede();
    const version = versionRef.current;

    const bodyVisible = await confirmBodyVisible();
    if (versionRef.current !== version) return "superseded";
    // null = the model could not judge (still loading, no pose). Send anyway
    // rather than block on a check that cannot answer.
    if (bodyVisible !== false) return "clear";

    subjectRef.current = { version };
    setFitWarning(FULL_OUTFIT_FIT_MESSAGE);
    // Park the send. Released by the poll below when the person moves back,
    // by Ignore, by a newer outfit, or by unmount — there is no timeout.
    return new Promise<FitGateResult>((resolve) => {
      releaseRef.current = resolve;
    });
  }, [supersede, confirmBodyVisible]);

  const dismissFitWarning = useCallback(() => {
    subjectRef.current = null;
    setFitWarning(null);
    releaseRef.current?.("clear");
    releaseRef.current = null;
  }, []);

  // While the warning is up, keep re-checking the camera so the card comes
  // down on its own once the knees are back in shot.
  useEffect(() => {
    if (!fitWarning) return;
    let cancelled = false;
    let inFlight = false;
    // Consecutive passing polls. Reset by any non-passing verdict, including
    // "cannot tell": a dropped detection is not evidence the person moved.
    let passes = 0;
    const id = window.setInterval(async () => {
      const subject = subjectRef.current;
      if (!subject || inFlight || versionRef.current !== subject.version) return;
      inFlight = true;
      try {
        const cleared = (await isBodyVisible()) === true;
        if (cancelled || versionRef.current !== subject.version) return;
        passes = cleared ? passes + 1 : 0;
        if (passes >= POSE_CLEAR_CONFIRM_POLLS) {
          subjectRef.current = null;
          setFitWarning(null);
          releaseRef.current?.("clear");
          releaseRef.current = null;
        }
      } finally {
        inFlight = false;
      }
    }, POSE_POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [fitWarning, isBodyVisible]);

  // Never leave a send parked after unmount.
  useEffect(() => {
    return () => {
      releaseRef.current?.("superseded");
      releaseRef.current = null;
    };
  }, []);

  return { fitWarning, awaitFitClearance, dismissFitWarning };
}
