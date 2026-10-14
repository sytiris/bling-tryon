"use client";

import { Suspense, useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { useMirrorCamera } from "@/hooks/useMirrorCamera";
import { usePortraitStream } from "@/hooks/usePortraitStream";
import { useDecartRealtime } from "@/hooks/useDecartRealtime";
import { urlToImageBlob } from "@/lib/image-utils";
import { getProductById } from "@/lib/products";

const AUTO_RECONNECT_DELAY = 3000;
const POLL_INTERVAL = 2000;

function MirrorContent() {
  const searchParams = useSearchParams();
  const shouldFlip = searchParams.get("flip") !== "false";
  const isLandscape = searchParams.get("landscape") !== null;

  // Camera + portrait stream
  const { stream: cameraStream, requestCamera } = useMirrorCamera();
  const portraitStream = usePortraitStream(isLandscape ? null : cameraStream);
  const streamToSend = isLandscape ? cameraStream : portraitStream;

  // Decart realtime
  const { status, error: connectionError, connect, disconnect, clientRef } =
    useDecartRealtime();

  // Session state
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [hasController, setHasController] = useState(false);
  const [hasRemoteStream, setHasRemoteStream] = useState(false);
  const [currentItemId, setCurrentItemId] = useState<string | null>(null);
  const [isLoadingModel, setIsLoadingModel] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const lastProcessedRef = useRef<string | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch a client token
  const fetchToken = useCallback(async (): Promise<string | null> => {
    try {
      const res = await fetch("/api/tokens", { method: "POST" });
      if (!res.ok) return null;
      const { apiKey } = await res.json();
      return apiKey;
    } catch {
      return null;
    }
  }, []);

  // Auto-request camera on mount
  useEffect(() => {
    requestCamera();
  }, [requestCamera]);

  // Attach camera to local video
  useEffect(() => {
    if (localVideoRef.current && cameraStream) {
      localVideoRef.current.srcObject = cameraStream;
    }
  }, [cameraStream]);

  // Create session on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/mirror/session", { method: "POST" });
        const { sessionId: id } = await res.json();
        setSessionId(id);
      } catch (err) {
        console.error("Failed to create session:", err);
      }
    })();
  }, []);

  // Poll for controller + selections
  useEffect(() => {
    if (!sessionId) return;

    const poll = async () => {
      try {
        const res = await fetch(
          `/api/mirror/poll?sessionId=${sessionId}`
        );
        if (!res.ok) return;
        const data = await res.json();

        setHasController(data.hasController);

        if (data.selection) {
          const key = `${data.selection.itemId}-${data.selection.timestamp}`;
          if (key !== lastProcessedRef.current) {
            lastProcessedRef.current = key;
            setCurrentItemId(data.selection.itemId);
            processSelection(data.selection.itemId);
          }
        }
      } catch {
        // Silently ignore poll errors
      }
    };

    poll();
    pollRef.current = setInterval(poll, POLL_INTERVAL);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // Connect Decart when phone claims; disconnect when it leaves
  useEffect(() => {
    if (hasController && streamToSend) {
      (async () => {
        setIsLoadingModel(true);
        const key = await fetchToken();
        if (key && streamToSend) {
          connect({
            apiKey: key,
            stream: streamToSend,
            onRemoteStream: (remoteStream) => {
              if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = remoteStream;
              }
              setIsLoadingModel(false);
              setHasRemoteStream(true);
            },
          });
        }
      })();
    } else if (!hasController) {
      disconnect();
      setHasRemoteStream(false);
      setCurrentItemId(null);
      lastProcessedRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasController, streamToSend]);

  // Auto-reconnect on disconnect/error while controller is connected
  useEffect(() => {
    if (
      (status === "disconnected" || status === "error") &&
      streamToSend &&
      hasRemoteStream &&
      hasController
    ) {
      reconnectTimerRef.current = setTimeout(async () => {
        setIsLoadingModel(true);
        const newKey = await fetchToken();
        if (newKey && streamToSend) {
          connect({
            apiKey: newKey,
            stream: streamToSend,
            onRemoteStream: (remoteStream) => {
              if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = remoteStream;
              }
              setIsLoadingModel(false);
              setHasRemoteStream(true);
            },
          });
        }
      }, AUTO_RECONNECT_DELAY);
    }
    return () => {
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  // Process a product selection
  const processSelection = useCallback(
    async (itemId: string) => {
      if (!clientRef.current) return;

      const product = getProductById(itemId);
      if (!product) return;

      try {
        const imageBlob = await urlToImageBlob(product.image);
        await clientRef.current.setImage(imageBlob, {
          prompt: product.prompt,
          enhance: false,
          timeout: 30000,
        });
      } catch (err) {
        console.error("Failed to process selection:", err);
      }
    },
    [clientRef]
  );

  const videoTransform = shouldFlip ? "scaleX(-1)" : undefined;
  const showProminentQR = !hasController;
  const currentProduct = currentItemId ? getProductById(currentItemId) : null;
  const remoteUrl =
    sessionId && typeof window !== "undefined"
      ? `${window.location.origin}/remote/${sessionId}`
      : null;

  return (
    <div className="h-screen w-screen bg-black overflow-hidden relative">
      {/* Local camera feed */}
      <video
        ref={(el) => {
          localVideoRef.current = el;
          if (el && cameraStream) el.srcObject = cameraStream;
        }}
        autoPlay
        playsInline
        muted
        className={`absolute inset-0 w-full h-full object-cover transition-[filter] duration-500 ${
          hasRemoteStream ? "hidden" : ""
        } ${!hasController ? "blur-[6px]" : ""}`}
        style={{ transform: videoTransform }}
      />

      {/* Remote / AI feed */}
      <video
        ref={(el) => {
          remoteVideoRef.current = el;
        }}
        autoPlay
        playsInline
        className={`absolute inset-0 w-full h-full object-cover ${
          hasRemoteStream ? "" : "hidden"
        }`}
        style={{ transform: videoTransform }}
      />

      {/* Connection status indicator */}
      {status !== "idle" && (
        <div className="absolute top-[16px] left-[16px] z-10 flex items-center gap-[6px]">
          <span className="relative flex w-[8px] h-[8px]">
            {(status === "connecting" ||
              status === "reconnecting" ||
              status === "generating") && (
              <span
                className={`absolute inset-0 rounded-full ${
                  status === "generating"
                    ? "bg-emerald-400"
                    : "bg-yellow-400"
                } animate-pulse`}
              />
            )}
            <span
              className={`relative w-[8px] h-[8px] rounded-full transition-colors duration-300 ${
                status === "connected" || status === "generating"
                  ? "bg-emerald-400"
                  : status === "connecting" || status === "reconnecting"
                    ? "bg-yellow-400"
                    : status === "error"
                      ? "bg-red-400"
                      : "bg-gray-400"
              }`}
            />
          </span>
          <span className="text-white/40 text-[12px]">
            {status === "generating"
              ? "Live"
              : status === "connected"
                ? "Connected"
                : status === "connecting"
                  ? "Connecting..."
                  : status === "reconnecting"
                    ? "Reconnecting..."
                    : status === "error"
                      ? "Error"
                      : "Disconnected"}
          </span>
        </div>
      )}

      {/* Loading model overlay */}
      {isLoadingModel && status === "connected" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60 backdrop-blur-sm z-20">
          <div className="w-[40px] h-[40px] border-2 border-white/20 border-t-white rounded-full animate-spin" />
          <p className="text-white/70 text-[16px]">Loading model...</p>
        </div>
      )}

      {/* Camera not available */}
      {!cameraStream && status === "idle" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black z-20">
          <p className="text-white/50 text-[18px]">Starting camera...</p>
        </div>
      )}

      {/* Connection error */}
      {status === "error" && connectionError && (
        <div className="absolute top-[16px] right-[16px] z-10 bg-red-500/20 border border-red-500/30 rounded-[12px] px-[16px] py-[8px]">
          <p className="text-red-300 text-[13px]">{connectionError}</p>
          <p className="text-red-300/50 text-[11px]">Auto-reconnecting...</p>
        </div>
      )}

      {/* Currently trying on indicator */}
      {currentProduct && hasController && (
        <div className="absolute top-[16px] right-[16px] z-10 bg-white rounded-[12px] p-[8px] flex items-center gap-[10px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={currentProduct.image}
            alt={currentProduct.name}
            className="w-[80px] h-[80px] rounded-[8px] object-cover bg-white"
          />
          <div className="pr-[8px]">
            <p className="text-black/90 text-[13px] font-medium">
              {currentProduct.name}
            </p>
          </div>
        </div>
      )}

      {/* QR Code overlay */}
      {remoteUrl && sessionId && (
        <div
          className={`absolute z-30 transition-all duration-500 ${
            showProminentQR
              ? "top-[60%] left-1/2 -translate-x-1/2 -translate-y-1/2"
              : "bottom-[20px] right-[20px]"
          }`}
        >
          <div
            className={`bg-white rounded-[16px] flex flex-col items-center transition-all duration-500 ${
              showProminentQR ? "p-[24px]" : "p-[12px]"
            }`}
          >
            {showProminentQR && (
              <p className="text-black/70 text-[16px] font-medium mb-[16px]">
                Virtual Try-On
              </p>
            )}
            <QRCodeSVG
              value={remoteUrl}
              size={showProminentQR ? 180 : 100}
              level="M"
              bgColor="white"
              fgColor="black"
            />
            {showProminentQR && (
              <p className="text-black/50 text-[16px] mt-[16px] animate-pulse">
                Scan to browse &amp; try on
              </p>
            )}
          </div>
        </div>
      )}

      {/* Controller connected indicator */}
      {hasController && (
        <div className="absolute bottom-[20px] left-[20px] z-10 flex items-center gap-[6px] bg-black/50 backdrop-blur-md rounded-full px-[12px] py-[6px]">
          <span className="w-[6px] h-[6px] rounded-full bg-emerald-400" />
          <span className="text-white/60 text-[12px]">Phone connected</span>
        </div>
      )}
    </div>
  );
}

export default function MirrorPage() {
  return (
    <Suspense>
      <MirrorContent />
    </Suspense>
  );
}
