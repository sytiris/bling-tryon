"use client";

import type { ConnectionQualityReport } from "@decartai/sdk";

interface ConnectionQualityBadgeProps {
  report: ConnectionQualityReport | null;
}

const LEVELS: Record<ConnectionQualityReport["quality"], { bars: number; color: string }> = {
  good: { bars: 4, color: "bg-green-400" },
  fair: { bars: 3, color: "bg-amber-400" },
  poor: { bars: 2, color: "bg-orange-500" },
  critical: { bars: 1, color: "bg-red-500" },
};

const FACTOR_LABELS: Record<ConnectionQualityReport["limitingFactor"], string | null> = {
  none: null,
  bandwidth: "bandwidth",
  latency: "latency",
  loss: "packet loss",
  stall: "stalls",
  cpu: "device",
};

/**
 * "Live" pill with signal bars driven by the SDK's in-session verdict.
 * Before the first sample, and during warm-up, the bars read as neutral.
 */
export function ConnectionQualityBadge({ report }: ConnectionQualityBadgeProps) {
  const settled = report && !report.warmingUp;
  const level = settled ? LEVELS[report.quality] : null;
  const factor = settled ? FACTOR_LABELS[report.limitingFactor] : null;

  return (
    <div className="flex items-center gap-2 bg-black/40 backdrop-blur-sm rounded-full px-3 py-1.5">
      <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
      <span className="text-white/70 text-sm">Live</span>
      <div className="flex items-end gap-[2px] h-3.5 ml-1" aria-label={settled ? `Connection ${report.quality}` : "Measuring connection"}>
        {[1, 2, 3, 4].map((bar) => (
          <div
            key={bar}
            className={`w-[3px] rounded-sm ${
              level && bar <= level.bars ? level.color : "bg-white/20"
            }`}
            style={{ height: `${bar * 25}%` }}
          />
        ))}
      </div>
      {factor && report && report.quality !== "good" && (
        <span className="text-white/50 text-xs">{factor}</span>
      )}
    </div>
  );
}
