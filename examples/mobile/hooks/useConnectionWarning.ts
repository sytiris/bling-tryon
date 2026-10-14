"use client";

import { useCallback, useState } from "react";
import type { ConnectionQualityReport } from "@decartai/sdk";

/**
 * Turns the SDK's in-session connection quality verdict into a single
 * "show the slow-connection overlay" flag. Ignores the warm-up window, where
 * the verdict is provisional, and stays dismissed for the rest of the session
 * once the user taps through.
 */
export function useConnectionWarning(report: ConnectionQualityReport | null) {
  const [dismissed, setDismissed] = useState(false);

  const dismiss = useCallback(() => setDismissed(true), []);

  const isLow =
    !!report &&
    !report.warmingUp &&
    (report.quality === "poor" || report.quality === "critical");

  return {
    showWarning: isLow && !dismissed,
    limitingFactor: report?.limitingFactor ?? "none",
    dismiss,
  };
}
