"use client";

import type { ConnectionQualityReport } from "@decartai/sdk";

interface LowQualityWarningProps {
  limitingFactor: ConnectionQualityReport["limitingFactor"];
  onDismiss: () => void;
}

const FACTOR_HINTS: Record<ConnectionQualityReport["limitingFactor"], string> = {
  bandwidth: "Not enough bandwidth for two-way video.",
  latency: "The round trip to the server is too long.",
  loss: "Packets are being dropped on the way.",
  stall: "The video keeps stalling.",
  cpu: "This device is struggling to keep up.",
  none: "",
};

/**
 * In-session slow-connection overlay, shown when the SDK's live verdict drops
 * to "poor" or "critical" after warm-up.
 */
export function LowQualityWarning({ limitingFactor, onDismiss }: LowQualityWarningProps) {
  const hint = FACTOR_HINTS[limitingFactor];
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/60 backdrop-blur-sm px-6">
      <svg className="w-10 h-10 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h.01" />
        <path d="M8.5 16.4a5 5 0 0 1 7 0" />
        <path d="M5 12.9a10 10 0 0 1 5.2-2.7" />
        <path d="M19 12.9a10 10 0 0 0-2.4-1.8" />
        <path d="M2 8.8a15 15 0 0 1 6.6-3.7" />
        <path d="M22 8.8a15 15 0 0 0-11-4.5" />
        <path d="M2 2l20 20" />
      </svg>
      <div className="text-center max-w-[320px]">
        <p className="text-white text-base font-semibold">Slow connection detected</p>
        <p className="text-white/60 text-[13px] mt-2 leading-relaxed">
          {hint && `${hint} `}For the best realtime experience, connect to a faster network.
        </p>
      </div>
      <button
        onClick={onDismiss}
        className="mt-1 px-6 py-2.5 bg-white/15 active:bg-white/25 text-white text-sm font-medium rounded-full"
      >
        Try anyway
      </button>
    </div>
  );
}
