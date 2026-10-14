"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Product } from "@/lib/products";
import { useCamera } from "@/hooks/useCamera";
import { useDecartRealtime } from "@/hooks/useDecartRealtime";
import { usePersonDetection } from "@/hooks/usePersonDetection";
import {
  urlToImageBlob,
  resizeImageBlob,
  captureVideoFrame,
  extractClothing,
  checkHasPerson,
  generateExtremePrecision,
} from "@/lib/image-utils";
import { enhancePrompt } from "@/lib/enhance-prompt";
import { ProductSidebar } from "@/components/ProductSidebar";
import { CombinedView } from "@/components/CombinedView";

export default function FullFeaturedPage() {
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  const [prompt, setPrompt] = useState("");
  const [processingStatus, setProcessingStatus] = useState<string | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isUploadActive, setIsUploadActive] = useState(false);
  const [autoExtract, setAutoExtract] = useState(false);
  const [extremePrecision, setExtremePrecision] = useState(false);
  const [debugSnapshot, setDebugSnapshot] = useState<string | null>(null);
  const [debugGenerated, setDebugGenerated] = useState<string | null>(null);

  const { stream, startCamera, stopCamera } = useCamera();
  const { status, error, connect, disconnect, clientRef } =
    useDecartRealtime();

  const remoteVideoRef = useRef<React.RefObject<HTMLVideoElement | null>>(null);
  const [localVideoElement, setLocalVideoElement] =
    useState<HTMLVideoElement | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const garmentBlobRef = useRef<Blob | null>(null);
  const lastPromptRef = useRef<string>("");
  const connectingRef = useRef(false);
  const uploadedImageRef = useRef<string | null>(null);

  const { personPresent, isReady: detectionReady } =
    usePersonDetection(localVideoElement);

  const handleRemoteStreamRef = useCallback(
    (ref: React.RefObject<HTMLVideoElement | null>) => {
      remoteVideoRef.current = ref;
    },
    []
  );

  const handleLocalVideoRef = useCallback(
    (ref: React.RefObject<HTMLVideoElement | null>) => {
      setLocalVideoElement(ref.current);
      localVideoRef.current = ref.current;
    },
    []
  );

  // Start camera on mount
  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  // Connect/disconnect based on person detection
  useEffect(() => {
    if (!detectionReady || !stream) return;

    if (personPresent && !clientRef.current && !connectingRef.current) {
      connectingRef.current = true;

      (async () => {
        try {
          const res = await fetch("/api/tokens", { method: "POST" });
          if (!res.ok) throw new Error(`Token fetch failed: ${res.status}`);
          const { apiKey } = await res.json();

          const rtClient = await connect({
            apiKey,
            stream,
            onRemoteStream: (remoteStream) => {
              if (remoteVideoRef.current?.current) {
                remoteVideoRef.current.current.srcObject = remoteStream;
              }
            },
          });

          // Re-apply last garment if reconnecting
          if (rtClient && garmentBlobRef.current && lastPromptRef.current) {
            rtClient.setImage(garmentBlobRef.current, {
              prompt: lastPromptRef.current,
              enhance: false,
            });
          }
        } finally {
          connectingRef.current = false;
        }
      })();
    } else if (!personPresent && clientRef.current && !connectingRef.current) {
      disconnect();
    }
  }, [personPresent, detectionReady, stream, connect, disconnect, clientRef]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
      if (uploadedImageRef.current) {
        URL.revokeObjectURL(uploadedImageRef.current);
      }
    };
  }, [disconnect]);

  // Apply garment blob + generate prompt (shared by product select and upload)
  const applyGarment = useCallback(
    async (blob: Blob, label: string) => {
      let cleaned = await resizeImageBlob(blob);

      if (!clientRef.current) {
        garmentBlobRef.current = cleaned;
        return;
      }

      // Step 1: Auto-extract clothing if enabled
      if (autoExtract) {
        setProcessingStatus("Analyzing image...");
        const hasPerson = await checkHasPerson(await resizeImageBlob(blob));
        if (hasPerson) {
          setProcessingStatus("Extracting clothing from image...");
          cleaned = await extractClothing(blob);
        }
      }

      garmentBlobRef.current = cleaned;

      // Step 2: Generate prompt
      setProcessingStatus(`Generating try-on prompt for ${label}...`);
      let generatedPrompt: string | null = null;
      try {
        generatedPrompt = await enhancePrompt(cleaned, localVideoRef.current);
      } catch (err) {
        console.error("Prompt generation failed:", err);
      }

      const finalPrompt = generatedPrompt || "Try on this garment";
      setPrompt(finalPrompt);
      lastPromptRef.current = finalPrompt;

      // Step 3: Extreme precision if enabled
      let finalImage: Blob = cleaned;
      if (extremePrecision && localVideoRef.current) {
        const snapshot = await captureVideoFrame(localVideoRef.current, 1024);
        if (snapshot) {
          setDebugSnapshot((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return URL.createObjectURL(snapshot);
          });
          setProcessingStatus("Generating high-precision try-on...");
          finalImage = await generateExtremePrecision(cleaned, snapshot);
          setDebugGenerated((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return URL.createObjectURL(finalImage);
          });
        }
      }

      setProcessingStatus(null);

      if (!clientRef.current) return;
      clientRef.current.setImage(finalImage, {
        prompt: finalPrompt,
        enhance: false,
      });
    },
    [clientRef, autoExtract, extremePrecision]
  );

  const handleSelectProduct = useCallback(
    async (product: Product) => {
      setActiveProduct(product);
      setIsUploadActive(false);

      const blob = await urlToImageBlob(product.image);
      await applyGarment(blob, product.name);
    },
    [applyGarment]
  );

  const handleUploadGarment = useCallback(
    async (file: File) => {
      if (file.size === 0) return;

      if (uploadedImageRef.current) {
        URL.revokeObjectURL(uploadedImageRef.current);
      }

      const previewUrl = URL.createObjectURL(file);
      uploadedImageRef.current = previewUrl;
      setUploadedImage(previewUrl);
      setIsUploadActive(true);
      setActiveProduct(null);

      await applyGarment(file, "your upload");
    },
    [applyGarment]
  );

  const handleReactivateUpload = useCallback(() => {
    if (!garmentBlobRef.current || !lastPromptRef.current) return;
    setIsUploadActive(true);
    setActiveProduct(null);

    if (!clientRef.current) return;
    clientRef.current.setImage(garmentBlobRef.current, {
      prompt: lastPromptRef.current,
      enhance: false,
    });
  }, [clientRef]);

  const handleClearUpload = useCallback(() => {
    if (uploadedImageRef.current) {
      URL.revokeObjectURL(uploadedImageRef.current);
      uploadedImageRef.current = null;
    }
    setUploadedImage(null);
    setIsUploadActive(false);
  }, []);

  const handlePromptSubmit = useCallback(() => {
    if (!clientRef.current || !garmentBlobRef.current) return;
    lastPromptRef.current = prompt;
    clientRef.current.setImage(garmentBlobRef.current, {
      prompt,
      enhance: false,
    });
  }, [clientRef, prompt]);

  return (
    <div className="h-screen flex">
      <ProductSidebar
        activeProduct={activeProduct}
        uploadedImage={uploadedImage}
        isUploadActive={isUploadActive}
        onSelectProduct={handleSelectProduct}
        onUploadGarment={handleUploadGarment}
        onReactivateUpload={handleReactivateUpload}
        onClearUpload={handleClearUpload}
        autoExtract={autoExtract}
        onAutoExtractChange={setAutoExtract}
        extremePrecision={extremePrecision}
        onExtremePrecisionChange={setExtremePrecision}
        precisionSnapshot={debugSnapshot}
        precisionGenerated={debugGenerated}
      />
      <CombinedView
        localStream={stream}
        status={status}
        error={error}
        personPresent={personPresent}
        detectionReady={detectionReady}
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
