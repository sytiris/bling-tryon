"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Product } from "@/lib/products";
import type { ConnectionStatus } from "@/hooks/useDecartRealtime";

interface FitRoomViewProps {
  localStream: MediaStream | null;
  onLocalVideoRef: (el: HTMLVideoElement | null) => void;
  onRemoteVideoRef: (el: HTMLVideoElement | null) => void;
  hasRemoteStream: boolean;
  status: ConnectionStatus;
  currentIndex: number;
  isTransitioning: boolean;
  transitionProduct: Product | null;
  queue: Product[];
  onSkipNext: () => void;
  onSkipPrevious: () => void;
  secondsRemaining: number;
  processingStatus: string | null;
  onSwitchCamera: () => void;
  onExit: () => void;
  activeHand: "left" | "right" | null;
  dwellProgress: number;
}

export function FitRoomView({
  localStream,
  onLocalVideoRef,
  onRemoteVideoRef,
  hasRemoteStream,
  status,
  currentIndex,
  isTransitioning,
  transitionProduct,
  queue,
  onSkipNext,
  onSkipPrevious,
  secondsRemaining,
  processingStatus,
  onSwitchCamera,
  onExit,
  activeHand,
  dwellProgress,
}: FitRoomViewProps) {
  const [splashFadingOut, setSplashFadingOut] = useState(false);
  const localVideoElRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (!isTransitioning && transitionProduct) {
      setSplashFadingOut(true);
      const timer = setTimeout(() => setSplashFadingOut(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isTransitioning, transitionProduct]);

  const localVideoCallbackRef = useCallback(
    (el: HTMLVideoElement | null) => {
      localVideoElRef.current = el;
      onLocalVideoRef(el);
      if (el && localStream) {
        el.srcObject = localStream;
      }
    },
    [onLocalVideoRef, localStream]
  );

  useEffect(() => {
    if (localVideoElRef.current && localStream) {
      localVideoElRef.current.srcObject = localStream;
    }
  }, [localStream]);

  const isConnecting = status === "connecting";
  const showSplash = isTransitioning || splashFadingOut;


  return (
    <div className="fixed inset-0 bg-black">
      {/* Local camera video */}
      <video
        ref={localVideoCallbackRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
      />

      {/* Remote (AI) video */}
      <video
        ref={onRemoteVideoRef}
        autoPlay
        playsInline
        className={`absolute inset-0 w-full h-full object-cover scale-x-[-1] ${hasRemoteStream ? "" : "hidden"}`}
      />

      {/* Hand raised indicator */}
      {activeHand && (
        <div className="absolute inset-x-0 z-[15] flex justify-center pointer-events-none" style={{ top: "calc(env(safe-area-inset-top) + 70px)" }}>
          <div className="bg-black/50 backdrop-blur-sm rounded-2xl px-6 py-3 flex flex-col items-center gap-2 min-w-[200px]">
            <span className="text-white text-xl font-bold">
              {activeHand === "right" ? "Right detected ✋" : "✋ Left detected"}
            </span>
            <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all duration-150 ease-linear"
                style={{ width: `${dwellProgress * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Product splash transition */}
      {showSplash && transitionProduct && (
        <div
          className={`absolute inset-0 z-40 flex items-center justify-center ${
            isTransitioning ? "animate-[fitting-splash-in_0.3s_ease-out_forwards]" : "animate-[fitting-splash-out_0.3s_ease-in_forwards]"
          }`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={transitionProduct.image}
            alt={transitionProduct.name}
            className="max-w-[70vw] max-h-[70vh] object-contain drop-shadow-2xl"
          />
        </div>
      )}

      {/* Exit button */}
      <button
        onClick={onExit}
        className="absolute left-3 z-30 bg-black/40 backdrop-blur-sm rounded-full p-3 text-white/80 active:bg-white/20"
        style={{ top: "calc(env(safe-area-inset-top) + 8px)" }}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* Camera switch */}
      <button
        onClick={onSwitchCamera}
        className="absolute left-3 z-30 bg-black/40 backdrop-blur-sm rounded-full p-3 text-white/80 active:bg-white/20"
        style={{ top: "calc(env(safe-area-inset-top) + 56px)" }}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 3h5m0 0v5m0-5L13 11M8 21H3m0 0v-5m0 5l8-8" />
        </svg>
      </button>

      {/* Status + Countdown */}
      {(status === "connected" || status === "generating") && !processingStatus && (
        <div className="absolute left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2" style={{ top: "calc(env(safe-area-inset-top) + 12px)" }}>
          <div className="flex items-center gap-2 bg-black/40 backdrop-blur-sm rounded-full px-3 py-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
            <span className="text-white/70 text-sm">Live</span>
          </div>
          {queue.length > 1 && (
            <div className="flex items-center bg-black/40 backdrop-blur-sm rounded-2xl px-5 py-2">
              <span className="text-white/80 text-3xl font-bold font-mono">{secondsRemaining}<span className="text-white/40 text-lg ml-0.5">s</span></span>
            </div>
          )}
        </div>
      )}

      {/* Bottom carousel strip */}
      <div className="absolute bottom-0 left-0 right-0 z-20" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="bg-black/50 backdrop-blur-md pt-3 pb-4 px-3">
          <div className="flex items-center gap-2">
            <button onClick={onSkipPrevious} className="flex-shrink-0 bg-white/10 rounded-full p-2 text-white/80 active:bg-white/20">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex-1 flex items-center justify-center gap-2 overflow-hidden">
              {queue.map((product, i) => {
                const isCurrent = i === currentIndex;
                return (
                  <div key={product.id} className={`flex-shrink-0 transition-all duration-300 ease-out ${isCurrent ? "w-[90px] h-[112px] opacity-100" : "w-[56px] h-[70px] opacity-40"}`}>
                    <div className={`w-full h-full rounded-xl overflow-hidden bg-white ${isCurrent ? "ring-2 ring-white shadow-[0_0_16px_rgba(255,255,255,0.3)]" : ""}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={product.image} alt={product.name} className="w-full h-full object-cover" draggable={false} />
                    </div>
                  </div>
                );
              })}
            </div>
            <button onClick={onSkipNext} className="flex-shrink-0 bg-white/10 rounded-full p-2 text-white/80 active:bg-white/20">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          <div className="flex items-center justify-center mt-2">
            <span className="text-white/40 text-xs">{currentIndex + 1} / {queue.length}</span>
          </div>
        </div>
      </div>

    </div>
  );
}
