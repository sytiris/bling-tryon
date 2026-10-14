"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Product } from "@/lib/products";
import { useCamera } from "@/hooks/useCamera";
import { useDecartRealtime } from "@/hooks/useDecartRealtime";
import { urlToImageBlob, resizeImageBlob } from "@/lib/image-utils";
import { enhancePrompt } from "@/lib/enhance-prompt";
import { ProductSidebar } from "@/components/ProductSidebar";
import { TryOnView } from "@/components/TryOnView";

export default function StandalonePage() {
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  const [prompt, setPrompt] = useState("");
  const [processingStatus, setProcessingStatus] = useState<string | null>(null);
  const { stream, startCamera, stopCamera } = useCamera();
  const { status, error, connect, disconnect, clientRef } =
    useDecartRealtime();
  const remoteVideoRef = useRef<React.RefObject<HTMLVideoElement | null>>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const garmentBlobRef = useRef<Blob | null>(null);

  const handleRemoteStreamRef = useCallback(
    (ref: React.RefObject<HTMLVideoElement | null>) => {
      remoteVideoRef.current = ref;
    },
    []
  );

  const handleLocalVideoRef = useCallback(
    (ref: React.RefObject<HTMLVideoElement | null>) => {
      localVideoRef.current = ref.current;
    },
    []
  );

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const mediaStream = await startCamera();
      if (!mediaStream || cancelled) return;

      const res = await fetch("/api/tokens", { method: "POST" });
      const { apiKey } = await res.json();
      if (cancelled) return;

      await connect({
        apiKey,
        stream: mediaStream,
        onRemoteStream: (remoteStream) => {
          if (remoteVideoRef.current?.current) {
            remoteVideoRef.current.current.srcObject = remoteStream;
          }
        },
      });
    }

    init();

    return () => {
      cancelled = true;
      disconnect();
      stopCamera();
    };
  }, [startCamera, stopCamera, connect, disconnect]);

  const handleSelectProduct = useCallback(
    async (product: Product) => {
      setActiveProduct(product);

      if (!clientRef.current) return;

      const blob = await urlToImageBlob(product.image);
      const resized = await resizeImageBlob(blob);
      garmentBlobRef.current = resized;

      // Generate a prompt from the garment image + person camera frame
      setProcessingStatus("Generating try-on prompt...");
      const generatedPrompt = await enhancePrompt(
        resized,
        localVideoRef.current
      );
      setProcessingStatus(null);

      const finalPrompt = generatedPrompt || "Try on this garment";
      setPrompt(finalPrompt);
      clientRef.current.setImage(resized, {
        prompt: finalPrompt,
        enhance: false,
      });
    },
    [clientRef]
  );

  const handlePromptSubmit = useCallback(() => {
    if (!clientRef.current || !garmentBlobRef.current) return;
    clientRef.current.setImage(garmentBlobRef.current, {
      prompt,
      enhance: false,
    });
  }, [clientRef, prompt]);

  return (
    <div className="h-screen flex">
      <ProductSidebar
        activeProduct={activeProduct}
        onSelectProduct={handleSelectProduct}
      />
      <TryOnView
        localStream={stream}
        status={status}
        error={error}
        prompt={prompt}
        processingStatus={processingStatus}
        onPromptChange={setPrompt}
        onPromptSubmit={handlePromptSubmit}
        onRemoteStream={handleRemoteStreamRef}
        onLocalVideo={handleLocalVideoRef}
      />
    </div>
  );
}
