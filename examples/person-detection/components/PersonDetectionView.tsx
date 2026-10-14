"use client";

import { useRef, useEffect } from "react";
import { ConnectionStatus } from "@/hooks/useDecartRealtime";

interface PersonDetectionViewProps {
  localStream: MediaStream | null;
  status: ConnectionStatus;
  error: string | null;
  personPresent: boolean;
  detectionReady: boolean;
  onRemoteStream: (ref: React.RefObject<HTMLVideoElement | null>) => void;
  onLocalVideo?: (ref: React.RefObject<HTMLVideoElement | null>) => void;
}

function getDetectionLabel(
  detectionReady: boolean,
  personPresent: boolean,
  status: ConnectionStatus
): { text: string; className: string; pulse: boolean } {
  if (!detectionReady) {
    return {
      text: "Loading detection...",
      className: "bg-black/60 text-white",
      pulse: false,
    };
  }

  if (status === "generating") {
    return {
      text: "Live",
      className: "bg-green-500/90 text-white",
      pulse: true,
    };
  }

  if (status === "connecting") {
    return {
      text: "Person detected - connecting...",
      className: "bg-blue-500/90 text-white",
      pulse: true,
    };
  }

  if (status === "connected") {
    return {
      text: "Connected - click a product to try on",
      className: "bg-blue-500/90 text-white",
      pulse: false,
    };
  }

  if (personPresent) {
    return {
      text: "Person detected",
      className: "bg-blue-500/90 text-white",
      pulse: true,
    };
  }

  return {
    text: "Scanning...",
    className: "bg-black/60 text-white",
    pulse: false,
  };
}

export function PersonDetectionView({
  localStream,
  status,
  error,
  personPresent,
  detectionReady,
  onRemoteStream,
  onLocalVideo,
}: PersonDetectionViewProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    onRemoteStream(remoteVideoRef);
  }, [onRemoteStream]);

  useEffect(() => {
    onLocalVideo?.(localVideoRef);
  }, [onLocalVideo]);

  const isGenerating = status === "generating";
  const label = getDetectionLabel(detectionReady, personPresent, status);

  return (
    <div className="relative flex-1 bg-black">
      {/* Local camera feed */}
      <video
        ref={localVideoRef}
        autoPlay
        playsInline
        muted
        className={`absolute inset-0 w-full h-full object-cover transition-opacity ${
          isGenerating ? "opacity-20" : "opacity-100"
        }`}
        style={{ transform: "scaleX(-1)" }}
      />

      {/* Remote AI stream */}
      <video
        ref={remoteVideoRef}
        autoPlay
        playsInline
        muted
        className={`absolute inset-0 w-full h-full object-cover transition-opacity ${
          isGenerating ? "opacity-100" : "opacity-0"
        }`}
        style={{ transform: "scaleX(-1)" }}
      />

      {/* Detection status badge */}
      <div className="absolute top-4 left-4 z-20">
        <div
          className={`flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-full ${label.className}`}
        >
          {label.pulse && (
            <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
          )}
          {label.text}
        </div>
      </div>

      {/* Hint text when scanning */}
      {detectionReady && !personPresent && status !== "generating" && (
        <div className="absolute bottom-8 left-0 right-0 flex justify-center z-20">
          <p className="text-white/50 text-sm">
            Step in front of the camera to start
          </p>
        </div>
      )}

      {error && (
        <div className="absolute bottom-4 left-4 right-4 bg-red-500/90 text-white text-sm px-4 py-2 rounded-lg z-20">
          {error}
        </div>
      )}
    </div>
  );
}
