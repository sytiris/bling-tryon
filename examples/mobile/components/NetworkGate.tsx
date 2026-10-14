"use client";

import type { ConnectivityReport } from "@decartai/sdk";

interface NetworkGateProps {
  /** null while the preflight probe is running. */
  report: ConnectivityReport | null;
  error: string | null;
  onRetry: () => void;
  onContinue: () => void;
  onCancel: () => void;
}

function Spinner() {
  return (
    <svg className="w-8 h-8 text-white animate-spin" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function WifiOffIcon({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h.01" />
      <path d="M8.5 16.4a5 5 0 0 1 7 0" />
      <path d="M5 12.9a10 10 0 0 1 5.2-2.7" />
      <path d="M19 12.9a10 10 0 0 0-2.4-1.8" />
      <path d="M2 8.8a15 15 0 0 1 6.6-3.7" />
      <path d="M22 8.8a15 15 0 0 0-11-4.5" />
      <path d="M2 2l20 20" />
    </svg>
  );
}

/**
 * Preflight gate driven by `client.realtime.checkConnectivity()`.
 *
 * - "good" / "fair": the page continues on its own; this shows the spinner.
 * - "poor": warn, but let the user continue.
 * - "critical": block with the SDK's reasons, offer Retry and Try anyway.
 */
export function NetworkGate({ report, error, onRetry, onContinue, onCancel }: NetworkGateProps) {
  const checking = !report && !error;
  const blocked = report?.quality === "critical";

  return (
    <div
      className="fixed inset-0 bg-black flex items-center justify-center px-6"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {checking && (
        <div className="flex flex-col items-center gap-4">
          <Spinner />
          <p className="text-white/70 text-sm">Checking your connection...</p>
        </div>
      )}

      {!checking && (
        <div className="w-full max-w-[360px] rounded-[20px] border border-white/10 bg-[#1C1C1E] px-7 py-7 flex flex-col items-center text-center animate-[mobile-fade-in_0.25s_ease-out]">
          <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 ${blocked ? "bg-red-500/15" : "bg-amber-400/15"}`}>
            <WifiOffIcon className={`w-7 h-7 ${blocked ? "text-red-400" : "text-amber-400"}`} />
          </div>

          <p className="text-white text-lg font-semibold leading-snug">
            {error
              ? "Couldn't check your connection"
              : blocked
                ? "Your connection is too weak for live try-on"
                : "Your connection may be slow"}
          </p>

          <p className="text-white/60 text-sm mt-2 leading-relaxed">
            {error
              ? error
              : blocked
                ? "Live try-on streams video both ways. Move closer to your Wi-Fi or switch networks, then try again."
                : "The try-on will run, but video may stutter. A stronger Wi-Fi signal will help."}
          </p>

          {report && (
            <dl className="mt-4 w-full grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-white/5 py-2">
                <dt className="text-white/40 text-[10px] uppercase tracking-wider">Quality</dt>
                <dd className="text-white text-sm font-medium capitalize">{report.quality}</dd>
              </div>
              <div className="rounded-xl bg-white/5 py-2">
                <dt className="text-white/40 text-[10px] uppercase tracking-wider">Transport</dt>
                <dd className="text-white text-sm font-medium uppercase">{report.metrics.transport}</dd>
              </div>
              <div className="rounded-xl bg-white/5 py-2">
                <dt className="text-white/40 text-[10px] uppercase tracking-wider">Latency</dt>
                <dd className="text-white text-sm font-medium">
                  {report.metrics.rttMs === null ? "—" : `${Math.round(report.metrics.rttMs)} ms`}
                </dd>
              </div>
            </dl>
          )}

          {report && report.reasons.length > 0 && (
            <ul className="mt-3 w-full text-left text-white/50 text-xs space-y-1">
              {report.reasons.map((reason) => (
                <li key={reason} className="flex gap-2">
                  <span aria-hidden>•</span>
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-6 w-full flex flex-col gap-2">
            {blocked || error ? (
              <>
                <button
                  onClick={onRetry}
                  className="w-full py-3 rounded-full bg-white text-black text-sm font-semibold active:bg-white/80"
                >
                  Retry
                </button>
                <button
                  onClick={onContinue}
                  className="w-full py-3 rounded-full bg-white/10 text-white text-sm font-medium active:bg-white/20"
                >
                  Try anyway
                </button>
              </>
            ) : (
              <button
                onClick={onContinue}
                className="w-full py-3 rounded-full bg-white text-black text-sm font-semibold active:bg-white/80"
              >
                Continue
              </button>
            )}
            <button onClick={onCancel} className="w-full py-2 text-white/40 text-xs">
              Back
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
