"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useCamera } from "@/hooks/useCamera";
import { useDecartRealtime } from "@/hooks/useDecartRealtime";
import { useHandGesture } from "@/hooks/useHandGesture";
import { useFittingQueue } from "@/hooks/useFittingQueue";
import { useFittingRotation } from "@/hooks/useFittingRotation";
import { urlToImageBlob } from "@/lib/image-utils";
import { PRODUCTS } from "@/lib/products";
import type { Product } from "@/lib/products";
import { ShoppingView } from "@/components/ShoppingView";
import { FitRoomView } from "@/components/FitRoomView";

export default function FittingRoomPage() {
  const [phase, setPhase] = useState<"shopping" | "fitroom">("shopping");
  const [intervalSeconds, setIntervalSeconds] = useState(30);
  const [processingStatus, setProcessingStatus] = useState<string | null>(null);
  const [hasRemoteStream, setHasRemoteStream] = useState(false);

  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);

  const { stream, startCamera, stopCamera } = useCamera();
  const { status, connect, disconnect, clientRef } = useDecartRealtime();
  const { queue, addToQueue, removeFromQueue, isInQueue } = useFittingQueue();

  const isConnected = status === "connected" || status === "generating";

  // Apply a product to the AI stream
  const applyProduct = useCallback(
    async (product: Product) => {
      if (!clientRef.current) return;
      setProcessingStatus("Applying...");
      try {
        const blob = await urlToImageBlob(product.image);
        await clientRef.current.setImage(blob, {
          prompt: product.prompt,
          enhance: false,
          timeout: 30_000,
        });
      } catch (err) {
        console.error("Failed to apply product:", err);
      }
      setProcessingStatus(null);
    },
    [clientRef]
  );

  const rotation = useFittingRotation({
    queue,
    intervalSeconds,
    isActive: phase === "fitroom" && isConnected,
    onApplyProduct: applyProduct,
  });

  const gesture = useHandGesture({
    videoRef: localVideoRef,
    enabled: phase === "fitroom" && isConnected,
  });

  // Wire gesture events to skip navigation
  const skipNextRef = useRef(rotation.skipToNext);
  skipNextRef.current = rotation.skipToNext;
  const skipPrevRef = useRef(rotation.skipToPrevious);
  skipPrevRef.current = rotation.skipToPrevious;
  const lastGestureRef = useRef(gesture.lastGesture);
  lastGestureRef.current = gesture.lastGesture;

  useEffect(() => {
    if (gesture.gestureCount === 0) return;
    if (lastGestureRef.current === "right") skipNextRef.current();
    else if (lastGestureRef.current === "left") skipPrevRef.current();
  }, [gesture.gestureCount]);

  const fetchToken = useCallback(async (): Promise<string> => {
    const res = await fetch("/api/tokens", { method: "POST" });
    const { apiKey } = await res.json();
    return apiKey;
  }, []);

  const enterFitRoom = useCallback(async () => {
    if (queue.length === 0) return;
    setPhase("fitroom");

    const [cameraStream, token, firstBlob] = await Promise.all([
      stream ?? startCamera(),
      fetchToken(),
      urlToImageBlob(queue[0].image).catch(() => undefined),
    ]);

    if (cameraStream && token) {
      await connect({
        apiKey: token,
        stream: cameraStream,
        ...(firstBlob && { image: firstBlob }),
        onRemoteStream: (remoteStream) => {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStream;
          }
          setHasRemoteStream(true);
        },
      });
    }
  }, [queue, stream, startCamera, fetchToken, connect]);

  const exitFitRoom = useCallback(() => {
    setPhase("shopping");
    setHasRemoteStream(false);
    disconnect();
    stopCamera();
  }, [disconnect, stopCamera]);

  useEffect(() => {
    return () => {
      disconnect();
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (phase === "fitroom") {
    return (
      <FitRoomView
        localStream={stream}
        onLocalVideoRef={(el) => { localVideoRef.current = el; }}
        onRemoteVideoRef={(el) => { remoteVideoRef.current = el; }}
        hasRemoteStream={hasRemoteStream}
        status={status}
        currentIndex={rotation.currentIndex}
        isTransitioning={rotation.isTransitioning}
        transitionProduct={rotation.transitionProduct}
        queue={queue}
        onSkipNext={rotation.skipToNext}
        onSkipPrevious={rotation.skipToPrevious}
        secondsRemaining={rotation.secondsRemaining}
        processingStatus={processingStatus}
        onSwitchCamera={() => {}}
        onExit={exitFitRoom}
        activeHand={gesture.activeHand}
        dwellProgress={gesture.dwellProgress}
      />
    );
  }

  return (
    <ShoppingView
      products={PRODUCTS}
      queue={queue}
      intervalSeconds={intervalSeconds}
      onIntervalChange={setIntervalSeconds}
      onAddToQueue={addToQueue}
      onRemoveFromQueue={removeFromQueue}
      isInQueue={isInQueue}
      onEnterFitRoom={enterFitRoom}
    />
  );
}
