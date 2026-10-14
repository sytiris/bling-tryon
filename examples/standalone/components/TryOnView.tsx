"use client";

import { useRef, useEffect } from "react";
import { ConnectionStatus } from "@/hooks/useDecartRealtime";

interface TryOnViewProps {
  localStream: MediaStream | null;
  status: ConnectionStatus;
  error: string | null;
  prompt: string;
  processingStatus?: string | null;
  onPromptChange: (prompt: string) => void;
  onPromptSubmit: () => void;
  onRemoteStream: (ref: React.RefObject<HTMLVideoElement | null>) => void;
  onLocalVideo?: (ref: React.RefObject<HTMLVideoElement | null>) => void;
}

const STATUS_LABELS: Record<ConnectionStatus, string> = {
  idle: "Waiting for camera...",
  connecting: "Connecting to Decart...",
  connected: "Connected - click a product to try on",
  generating: "Live",
  reconnecting: "Reconnecting...",
  disconnected: "Disconnected",
  error: "Connection error",
};

export function TryOnView({
  localStream,
  status,
  error,
  prompt,
  processingStatus,
  onPromptChange,
  onPromptSubmit,
  onRemoteStream,
  onLocalVideo,
}: TryOnViewProps) {
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

  return (
    <div className="relative flex-1 bg-black flex flex-col">
      <div className="relative flex-1">
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

        {/* Status indicator */}
        <div className="absolute top-4 left-4 z-20">
          <div
            className={`flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-full ${
              isGenerating
                ? "bg-green-500/90 text-white"
                : status === "error"
                  ? "bg-red-500/90 text-white"
                  : "bg-black/60 text-white"
            }`}
          >
            {isGenerating && (
              <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
            )}
            {STATUS_LABELS[status]}
          </div>
        </div>

        {processingStatus && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/50 backdrop-blur-sm z-20">
            <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            <p className="text-white/80 text-sm font-medium">{processingStatus}</p>
          </div>
        )}

        {error && (
          <div className="absolute bottom-4 left-4 right-4 bg-red-500/90 text-white text-sm px-4 py-2 rounded-lg z-20">
            {error}
          </div>
        )}
      </div>

      {/* Prompt editor */}
      {prompt && (
        <div className="p-3 bg-gray-900 border-t border-gray-800">
          <div className="flex gap-2">
            <input
              type="text"
              value={prompt}
              onChange={(e) => onPromptChange(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onPromptSubmit()}
              className="flex-1 text-sm bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              placeholder="Edit prompt..."
            />
            <button
              onClick={onPromptSubmit}
              className="text-sm px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
