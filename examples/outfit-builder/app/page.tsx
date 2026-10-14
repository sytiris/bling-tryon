"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Product } from "@/lib/products";
import { useCamera } from "@/hooks/useCamera";
import { useDecartRealtime } from "@/hooks/useDecartRealtime";
import {
  urlToImageBlob,
  resizeImageBlob,
  combineClothingImages,
} from "@/lib/image-utils";
import {
  enhancePrompt,
  generateOutfitPrompt,
  validateFit,
} from "@/lib/enhance-prompt";
import { OutfitSidebar } from "@/components/OutfitSidebar";
import { TryOnView } from "@/components/TryOnView";

interface SlotState {
  product?: Product;
  file?: File;
  previewUrl?: string;
}

export default function OutfitBuilderPage() {
  const [topSlot, setTopSlot] = useState<SlotState | null>(null);
  const [bottomSlot, setBottomSlot] = useState<SlotState | null>(null);
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  const [prompt, setPrompt] = useState("");
  const [processingStatus, setProcessingStatus] = useState<string | null>(null);
  const [isCombining, setIsCombining] = useState(false);
  const [fitWarning, setFitWarning] = useState<string | null>(null);

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

  // Connect camera + Decart on mount
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

  // Get blob from a slot (product URL or uploaded file)
  const getSlotBlob = useCallback(async (slot: SlotState): Promise<Blob> => {
    if (slot.file) {
      return new Blob([slot.file], { type: slot.file.type });
    }
    if (slot.product) {
      return urlToImageBlob(slot.product.image);
    }
    throw new Error("Empty slot");
  }, []);

  // Try on a single item
  const handleTryOnSingle = useCallback(
    async (product: Product) => {
      if (!clientRef.current) return;

      setActiveProduct(product);
      setFitWarning(null);

      const blob = await urlToImageBlob(product.image);
      const resized = await resizeImageBlob(blob);
      garmentBlobRef.current = resized;

      // Validate fit
      const fit = await validateFit(resized, localVideoRef.current);
      if (!fit.ok) {
        setFitWarning(fit.message || "This item may not fit well.");
        return;
      }

      // Generate prompt
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

  // Try on combined outfit
  const handleTryOnOutfit = useCallback(async () => {
    if (!clientRef.current || !topSlot || !bottomSlot) return;

    setIsCombining(true);
    setFitWarning(null);

    try {
      const [topBlob, bottomBlob] = await Promise.all([
        getSlotBlob(topSlot).then(resizeImageBlob),
        getSlotBlob(bottomSlot).then(resizeImageBlob),
      ]);

      // Combine into single image
      const combined = await combineClothingImages(topBlob, bottomBlob);
      garmentBlobRef.current = combined;

      // Generate outfit prompt
      setProcessingStatus("Generating outfit prompt...");
      const generatedPrompt = await generateOutfitPrompt(
        topBlob,
        bottomBlob,
        localVideoRef.current
      );
      setProcessingStatus(null);

      const finalPrompt =
        generatedPrompt || "Substitute the current outfit with this outfit";
      setPrompt(finalPrompt);
      clientRef.current.setImage(combined, {
        prompt: finalPrompt,
        enhance: false,
      });

      setTopSlot(null);
      setBottomSlot(null);
    } catch (err) {
      console.error("Outfit try-on failed:", err);
      setProcessingStatus(null);
    } finally {
      setIsCombining(false);
    }
  }, [clientRef, topSlot, bottomSlot, getSlotBlob]);

  const handleSelectTop = useCallback((product: Product) => {
    setTopSlot({ product });
    setFitWarning(null);
  }, []);

  const handleSelectBottom = useCallback((product: Product) => {
    setBottomSlot({ product });
    setFitWarning(null);
  }, []);

  const handleUploadTop = useCallback((file: File) => {
    setTopSlot({ file, previewUrl: URL.createObjectURL(file) });
    setFitWarning(null);
  }, []);

  const handleUploadBottom = useCallback((file: File) => {
    setBottomSlot({ file, previewUrl: URL.createObjectURL(file) });
    setFitWarning(null);
  }, []);

  const handlePromptSubmit = useCallback(() => {
    if (!clientRef.current || !garmentBlobRef.current) return;
    clientRef.current.setImage(garmentBlobRef.current, {
      prompt,
      enhance: false,
    });
  }, [clientRef, prompt]);

  return (
    <div className="h-screen flex">
      <OutfitSidebar
        topSlot={topSlot}
        bottomSlot={bottomSlot}
        activeProduct={activeProduct}
        isCombining={isCombining}
        fitWarning={fitWarning}
        onSelectTop={handleSelectTop}
        onSelectBottom={handleSelectBottom}
        onUploadTop={handleUploadTop}
        onUploadBottom={handleUploadBottom}
        onClearTop={() => setTopSlot(null)}
        onClearBottom={() => setBottomSlot(null)}
        onTryOnOutfit={handleTryOnOutfit}
        onTryOnSingle={handleTryOnSingle}
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
