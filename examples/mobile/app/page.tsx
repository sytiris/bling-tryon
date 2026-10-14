"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ConnectivityReport } from "@decartai/sdk";
import { useCamera } from "@/hooks/useCamera";
import { checkConnectivity, useDecartRealtime } from "@/hooks/useDecartRealtime";
import { useConnectionWarning } from "@/hooks/useConnectionWarning";
import { useFitGate } from "@/hooks/useFitGate";
import { urlToImageBlob } from "@/lib/image-utils";
import { OUTFITS } from "@/lib/outfits";
import type { Outfit } from "@/lib/outfits";
import { StartScreen } from "@/components/StartScreen";
import { NetworkGate } from "@/components/NetworkGate";
import { TryOnView } from "@/components/TryOnView";

type Phase = "start" | "preflight" | "tryon";

export default function MobileTryOnPage() {
  const [phase, setPhase] = useState<Phase>("start");
  const [preflight, setPreflight] = useState<ConnectivityReport | null>(null);
  const [preflightError, setPreflightError] = useState<string | null>(null);
  const [selectedOutfit, setSelectedOutfit] = useState<Outfit | null>(null);
  const [processingStatus, setProcessingStatus] = useState<string | null>(null);
  const [hasRemoteStream, setHasRemoteStream] = useState(false);

  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const tokenRef = useRef<string | null>(null);
  // Guards against a preflight that resolves after the user backed out.
  const preflightRunRef = useRef(0);

  const { stream, facingMode, error: cameraError, startCamera, switchCamera, stopCamera } = useCamera();
  const { status, error, quality, connect, disconnect, clientRef } = useDecartRealtime();
  const connectionWarning = useConnectionWarning(quality);
  const { fitWarning, awaitFitClearance, dismissFitWarning } = useFitGate(stream);

  const fetchToken = useCallback(async (): Promise<string> => {
    const res = await fetch("/api/tokens", { method: "POST" });
    if (!res.ok) throw new Error("Could not create a session token");
    const { apiKey } = await res.json();
    return apiKey;
  }, []);

  // --- Preflight: SDK network check before opening a session -----------------

  const runPreflight = useCallback(async () => {
    const run = ++preflightRunRef.current;
    setPreflight(null);
    setPreflightError(null);
    try {
      tokenRef.current ??= await fetchToken();
      const report = await checkConnectivity(tokenRef.current);
      if (preflightRunRef.current !== run) return;
      setPreflight(report);
    } catch (err) {
      if (preflightRunRef.current !== run) return;
      setPreflightError(err instanceof Error ? err.message : "Connectivity check failed");
    }
  }, [fetchToken]);

  const handleStart = useCallback(() => {
    setPhase("preflight");
    // Camera permission and the network probe are independent, so ask for
    // both at once: the camera prompt shows while the probe runs.
    void startCamera();
    void runPreflight();
  }, [startCamera, runPreflight]);

  // --- Try-on session --------------------------------------------------------

  const handleRemoteStream = useCallback((remoteStream: MediaStream) => {
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
    setHasRemoteStream(true);
  }, []);

  const applyOutfit = useCallback(
    async (outfit: Outfit) => {
      if (!clientRef.current) return;
      setSelectedOutfit(outfit);
      // A full outfit needs the knees in frame. This parks the send behind a
      // "move your phone back" card until the framing is right or the user
      // taps Ignore; a newer tap supersedes an older parked send.
      if ((await awaitFitClearance()) === "superseded") return;
      if (!clientRef.current) return;
      setProcessingStatus("Applying outfit...");
      try {
        const blob = await urlToImageBlob(outfit.image);
        await clientRef.current.setImage(blob, {
          prompt: outfit.prompt,
          enhance: false,
          timeout: 30_000,
        });
      } catch (err) {
        console.error("Failed to apply outfit:", err);
      }
      setProcessingStatus(null);
    },
    [clientRef, awaitFitClearance]
  );

  const startSession = useCallback(
    async (cameraStream: MediaStream) => {
      const token = tokenRef.current ?? (await fetchToken());
      tokenRef.current = token;
      const rtClient = await connect({
        apiKey: token,
        stream: cameraStream,
        onRemoteStream: handleRemoteStream,
      });
      return rtClient;
    },
    [fetchToken, connect, handleRemoteStream]
  );

  const enterTryOn = useCallback(async () => {
    preflightRunRef.current += 1;
    setPhase("tryon");
    const cameraStream = stream ?? (await startCamera());
    if (!cameraStream) return;
    const rtClient = await startSession(cameraStream);
    if (rtClient) await applyOutfit(OUTFITS[0]);
  }, [stream, startCamera, startSession, applyOutfit]);

  // Auto-continue when the preflight verdict is good or fair. "poor" and
  // "critical" wait for the user in the NetworkGate.
  useEffect(() => {
    if (phase !== "preflight" || !preflight) return;
    if (preflight.quality === "good" || preflight.quality === "fair") {
      void enterTryOn();
    }
  }, [phase, preflight, enterTryOn]);

  // The SDK connection is bound to the stream it was opened with, so a camera
  // flip means a fresh session. A client token stays valid for a new connect.
  const handleSwitchCamera = useCallback(async () => {
    setProcessingStatus("Switching camera...");
    disconnect();
    setHasRemoteStream(false);
    const newStream = await switchCamera();
    if (!newStream) {
      setProcessingStatus(null);
      return;
    }
    const rtClient = await startSession(newStream);
    setProcessingStatus(null);
    if (rtClient && selectedOutfit) await applyOutfit(selectedOutfit);
  }, [disconnect, switchCamera, startSession, selectedOutfit, applyOutfit]);

  const exit = useCallback(() => {
    preflightRunRef.current += 1;
    disconnect();
    stopCamera();
    setHasRemoteStream(false);
    setSelectedOutfit(null);
    setProcessingStatus(null);
    setPreflight(null);
    setPreflightError(null);
    setPhase("start");
  }, [disconnect, stopCamera]);

  useEffect(() => {
    return () => {
      disconnect();
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (phase === "start") {
    return <StartScreen onStart={handleStart} />;
  }

  if (phase === "preflight") {
    return (
      <NetworkGate
        report={preflight}
        error={preflightError}
        onRetry={runPreflight}
        onContinue={enterTryOn}
        onCancel={exit}
      />
    );
  }

  return (
    <TryOnView
      localStream={stream}
      cameraError={cameraError}
      onRetryCamera={enterTryOn}
      facingMode={facingMode}
      onRemoteVideoRef={(el) => { remoteVideoRef.current = el; }}
      hasRemoteStream={hasRemoteStream}
      status={status}
      connectionError={error}
      quality={quality}
      outfits={OUTFITS}
      selectedOutfit={selectedOutfit}
      onSelectOutfit={applyOutfit}
      processingStatus={processingStatus}
      showLowQualityWarning={connectionWarning.showWarning}
      limitingFactor={connectionWarning.limitingFactor}
      onDismissLowQualityWarning={connectionWarning.dismiss}
      fitWarning={fitWarning}
      onDismissFitWarning={dismissFitWarning}
      onSwitchCamera={handleSwitchCamera}
      onExit={exit}
    />
  );
}
