"use client";

import { useCallback, useEffect, useRef } from "react";
import type { ConnectionQualityReport } from "@decartai/sdk";
import type { Outfit } from "@/lib/outfits";
import type { ConnectionStatus } from "@/hooks/useDecartRealtime";
import type { FacingMode } from "@/hooks/useCamera";
import { ConnectionQualityBadge } from "@/components/ConnectionQualityBadge";
import { LowQualityWarning } from "@/components/LowQualityWarning";
import { FitWarning } from "@/components/FitWarning";

interface TryOnViewProps {
  localStream: MediaStream | null;
  cameraError: string | null;
  onRetryCamera: () => void;
  facingMode: FacingMode;
  onRemoteVideoRef: (el: HTMLVideoElement | null) => void;
  hasRemoteStream: boolean;
  status: ConnectionStatus;
  connectionError: string | null;
  quality: ConnectionQualityReport | null;
  outfits: Outfit[];
  selectedOutfit: Outfit | null;
  onSelectOutfit: (outfit: Outfit) => void;
  processingStatus: string | null;
  showLowQualityWarning: boolean;
  limitingFactor: ConnectionQualityReport["limitingFactor"];
  onDismissLowQualityWarning: () => void;
  fitWarning: string | null;
  onDismissFitWarning: () => void;
  onSwitchCamera: () => void;
  onExit: () => void;
}

function Spinner() {
  return (
    <svg className="w-8 h-8 text-white animate-spin" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function TryOnView({
  localStream,
  cameraError,
  onRetryCamera,
  facingMode,
  onRemoteVideoRef,
  hasRemoteStream,
  status,
  connectionError,
  quality,
  outfits,
  selectedOutfit,
  onSelectOutfit,
  processingStatus,
  showLowQualityWarning,
  limitingFactor,
  onDismissLowQualityWarning,
  fitWarning,
  onDismissFitWarning,
  onSwitchCamera,
  onExit,
}: TryOnViewProps) {
  const localVideoElRef = useRef<HTMLVideoElement | null>(null);

  const localVideoCallbackRef = useCallback(
    (el: HTMLVideoElement | null) => {
      localVideoElRef.current = el;
      if (el && localStream) el.srcObject = localStream;
    },
    [localStream]
  );

  useEffect(() => {
    if (localVideoElRef.current && localStream) {
      localVideoElRef.current.srcObject = localStream;
    }
  }, [localStream]);

  const isLive = status === "connected" || status === "generating";
  const isBusy = status === "connecting" || status === "reconnecting" || !!processingStatus;
  // Mirror the front camera like a mirror would; the rear camera shows the world as-is.
  const mirrorClass = facingMode === "user" ? "scale-x-[-1]" : "";

  return (
    <div className="fixed inset-0 bg-black">
      {/* Local camera video */}
      <video
        ref={localVideoCallbackRef}
        autoPlay
        playsInline
        muted
        className={`absolute inset-0 w-full h-full object-cover ${mirrorClass} ${hasRemoteStream ? "hidden" : ""}`}
      />

      {/* Remote (AI) video */}
      <video
        ref={onRemoteVideoRef}
        autoPlay
        playsInline
        className={`absolute inset-0 w-full h-full object-cover ${mirrorClass} transition-opacity duration-150 ${
          hasRemoteStream ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Exit */}
      <button
        onClick={onExit}
        className="absolute left-3 z-30 bg-black/40 backdrop-blur-sm rounded-full p-3 text-white/80 active:bg-white/20"
        style={{ top: "calc(env(safe-area-inset-top) + 8px)" }}
        aria-label="Exit"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* Camera switch */}
      <button
        onClick={onSwitchCamera}
        disabled={isBusy}
        className="absolute left-3 z-30 bg-black/40 backdrop-blur-sm rounded-full p-3 text-white/80 active:bg-white/20 disabled:opacity-30"
        style={{ top: "calc(env(safe-area-inset-top) + 60px)" }}
        aria-label="Switch camera"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
          <path d="M11 19H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5" />
          <path d="M13 5h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-5" />
          <circle cx="12" cy="12" r="3" />
          <path d="m18 22-3-3 3-3" />
          <path d="m6 2 3 3-3 3" />
        </svg>
      </button>

      {/* Live badge with SDK connection quality */}
      {isLive && !processingStatus && (
        <div
          className="absolute left-1/2 -translate-x-1/2 z-20"
          style={{ top: "calc(env(safe-area-inset-top) + 12px)" }}
        >
          <ConnectionQualityBadge report={quality} />
        </div>
      )}

      {/* Camera unavailable */}
      {!localStream && cameraError && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/80 px-8">
          <div className="text-center">
            <p className="text-white text-base font-semibold">Camera access is needed for try-on</p>
            <p className="text-white/50 text-sm mt-2 leading-relaxed">
              Allow camera access in your browser settings, then try again.
            </p>
            <button
              onClick={onRetryCamera}
              className="mt-5 px-6 py-3 bg-white text-black rounded-full text-sm font-medium active:bg-white/80"
            >
              Enable camera
            </button>
          </div>
        </div>
      )}

      {/* Connecting / reconnecting overlay */}
      {(status === "connecting" || status === "reconnecting") && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/50">
          <div className="flex flex-col items-center gap-3">
            <Spinner />
            <p className="text-white/80 text-sm">
              {status === "reconnecting" ? "Reconnecting..." : "Connecting..."}
            </p>
          </div>
        </div>
      )}

      {/* Processing overlay */}
      {processingStatus && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/50">
          <div className="flex flex-col items-center gap-3">
            <Spinner />
            <p className="text-white/80 text-sm">{processingStatus}</p>
          </div>
        </div>
      )}

      {/* Connection error */}
      {connectionError && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 bg-red-500/80 text-white text-xs px-4 py-2 rounded-full max-w-[80vw] text-center">
          {connectionError}
        </div>
      )}

      {/* In-session slow connection warning (SDK verdict poor/critical) */}
      {showLowQualityWarning && (
        <div className="absolute inset-0 z-30">
          <LowQualityWarning limitingFactor={limitingFactor} onDismiss={onDismissLowQualityWarning} />
        </div>
      )}

      {/* Framing warning — above everything: the try-on is parked behind it,
          so nothing may cover its Ignore button. */}
      {fitWarning && (
        <div className="absolute inset-0 z-40">
          <FitWarning message={fitWarning} onDismiss={onDismissFitWarning} />
        </div>
      )}

      {/* Bottom strip: the two outfits */}
      <div className="absolute bottom-0 left-0 right-0 z-20" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="bg-black/50 backdrop-blur-md pt-3 pb-4 px-4">
          <div className="flex gap-3">
            {outfits.map((outfit) => {
              const isSelected = selectedOutfit?.id === outfit.id;
              return (
                <button
                  key={outfit.id}
                  onClick={() => onSelectOutfit(outfit)}
                  disabled={isBusy}
                  className={`flex-1 flex flex-col items-center gap-1.5 transition-all duration-200 disabled:opacity-60 ${
                    isSelected ? "opacity-100" : "opacity-70"
                  }`}
                >
                  <div
                    className={`w-full h-[128px] rounded-xl overflow-hidden bg-white ${
                      isSelected ? "ring-2 ring-white shadow-[0_0_16px_rgba(255,255,255,0.3)]" : ""
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={outfit.image} alt={outfit.name} className="w-full h-full object-contain" draggable={false} />
                  </div>
                  <span className="text-white/80 text-xs">{outfit.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
