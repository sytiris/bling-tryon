"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { PRODUCTS, Product } from "@/lib/products";
import { useCamera } from "@/hooks/useCamera";
import { useDecartRealtime, ConnectionStatus } from "@/hooks/useDecartRealtime";
import { urlToImageBlob, resizeImageBlob } from "@/lib/image-utils";

interface TryOnModalProps {
  product: Product;
  onClose: () => void;
}

const STATUS_LABELS: Record<ConnectionStatus, string> = {
  idle: "等待打开摄像头",
  connecting: "正在连接 Decart…",
  connected: "已连接，等待试穿画面…",
  generating: "实时试穿中",
  reconnecting: "网络中断，正在重连…",
  disconnected: "已断开连接",
  error: "连接失败",
};

export function TryOnModal({ product, onClose }: TryOnModalProps) {
  const { stream, error: camError, startCamera, stopCamera } = useCamera();
  const { status, error: rtError, phase, connectionMs, warmToken, connect, disconnect, clientRef } = useDecartRealtime();
  const cameraVideoRef = useRef<HTMLVideoElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const operationRef = useRef(0);
  const sessionStartedRef = useRef<number | null>(null);
  const connectStartedRef = useRef<number | null>(null);
  const garmentBlobRef = useRef<Blob | null>(null);
  const imageCacheRef = useRef(new Map<string, Promise<Blob>>());
  const [selectedProduct, setSelectedProduct] = useState(product);
  const [prompt, setPrompt] = useState(product.prompt);
  const [showPrompt, setShowPrompt] = useState(false);
  const [busy, setBusy] = useState<"camera" | "connecting" | "garment" | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [firstFrameMs, setFirstFrameMs] = useState<number | null>(null);
  const [startupSeconds, setStartupSeconds] = useState(0);
  const active = ["connecting", "connected", "generating", "reconnecting"].includes(status);

  const handleStop = useCallback(() => {
    operationRef.current++;
    disconnect();
    stopCamera();
    remoteStreamRef.current?.getTracks().forEach((track) => track.stop());
    remoteStreamRef.current = null;
    if (sessionStartedRef.current !== null) {
      setElapsedSeconds(Math.floor((performance.now() - sessionStartedRef.current) / 1000));
    }
    sessionStartedRef.current = null;
    connectStartedRef.current = null;
    garmentBlobRef.current = null;
    setBusy(null);
    if (videoRef.current) videoRef.current.srcObject = null;
    if (cameraVideoRef.current) cameraVideoRef.current.srcObject = null;
  }, [disconnect, stopCamera]);

  useEffect(() => {
    window.addEventListener("pagehide", handleStop);
    window.addEventListener("beforeunload", handleStop);
    return () => {
      window.removeEventListener("pagehide", handleStop);
      window.removeEventListener("beforeunload", handleStop);
      handleStop();
    };
  }, [handleStop]);

  useEffect(() => {
    if (cameraVideoRef.current) cameraVideoRef.current.srcObject = stream;
  }, [stream]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (connectStartedRef.current !== null && firstFrameMs === null) {
        const waiting = Math.floor((performance.now() - connectStartedRef.current) / 1000);
        setStartupSeconds(waiting);
        if (waiting >= 30) {
          handleStop();
          setLocalError("30 秒内未收到试穿画面，已停止；请检查网络后重试");
        }
      }
      if (sessionStartedRef.current === null) return;
      const elapsed = Math.floor((performance.now() - sessionStartedRef.current) / 1000);
      setElapsedSeconds(elapsed);
      if (elapsed >= 120) handleStop();
    }, 250);
    return () => window.clearInterval(timer);
  }, [handleStop, firstFrameMs]);

  useEffect(() => {
    if (status !== "error" && status !== "disconnected") return;
    connectStartedRef.current = null;
    stopCamera();
    remoteStreamRef.current?.getTracks().forEach((track) => track.stop());
    remoteStreamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    if (sessionStartedRef.current !== null) {
      setElapsedSeconds(Math.floor((performance.now() - sessionStartedRef.current) / 1000));
      sessionStartedRef.current = null;
    }
  }, [status, stopCamera]);

  const handleRemoteStream = useCallback((remoteStream: MediaStream) => {
    remoteStreamRef.current = remoteStream;
    if (videoRef.current) videoRef.current.srcObject = remoteStream;
  }, []);

  function prepareGarment(item: Product) {
    let image = imageCacheRef.current.get(item.image);
    if (!image) {
      image = urlToImageBlob(item.image).then(resizeImageBlob).catch((error) => {
        imageCacheRef.current.delete(item.image);
        throw error;
      });
      imageCacheRef.current.set(item.image, image);
    }
    return image;
  }

  async function handleOpenCamera() {
    const operation = ++operationRef.current;
    setLocalError(null);
    setBusy("camera");
    const mediaStream = await startCamera();
    if (mediaStream && operation === operationRef.current) {
      // Token minting is not an AI session. Keep the credential only in memory.
      void warmToken().catch(() => {});
      void prepareGarment(selectedProduct).catch(() => {});
    }
    if (operation === operationRef.current) setBusy(null);
  }

  async function handleStart() {
    if (!stream || busy || active) return;
    const operation = ++operationRef.current;
    setLocalError(null);
    setBusy("connecting");
    setElapsedSeconds(0);
    setFirstFrameMs(null);
    setStartupSeconds(0);
    connectStartedRef.current = performance.now();
    try {
      // Prepare the original garment before opening a paid realtime session.
      const image = await prepareGarment(selectedProduct);
      if (operation !== operationRef.current) return;
      garmentBlobRef.current = image;
      const rtClient = await connect({
        stream, image, prompt, onRemoteStream: handleRemoteStream,
      });
      if (operation !== operationRef.current) return;
      if (rtClient) sessionStartedRef.current = performance.now();
      else stopCamera();
    } catch {
      if (operation !== operationRef.current) return;
      handleStop();
      setLocalError("服装图片加载失败，请检查本地素材后重试");
    } finally {
      if (operation === operationRef.current) setBusy(null);
    }
  }

  async function applyGarment(nextProduct: Product, nextPrompt: string) {
    const rtClient = clientRef.current;
    if (!rtClient || busy || !rtClient.isConnected()) return;
    const operation = operationRef.current;
    setBusy("garment");
    setLocalError(null);
    try {
      const image = nextProduct === selectedProduct && garmentBlobRef.current
        ? garmentBlobRef.current
        : await prepareGarment(nextProduct);
      if (operation !== operationRef.current) return;
      await rtClient.setImage(image, { prompt: nextPrompt, enhance: false });
      if (operation !== operationRef.current) return;
      garmentBlobRef.current = image;
      setSelectedProduct(nextProduct);
      setPrompt(nextPrompt);
    } catch {
      if (operation === operationRef.current) {
        setLocalError("服装切换失败，可重新选择或停止后重试");
      }
    } finally {
      if (operation === operationRef.current) setBusy(null);
    }
  }

  function handleProductChange(name: string) {
    const nextProduct = PRODUCTS.find((item) => item.name === name);
    if (!nextProduct) return;
    if (clientRef.current) void applyGarment(nextProduct, nextProduct.prompt);
    else { setSelectedProduct(nextProduct); setPrompt(nextProduct.prompt); }
  }

  function handleClose() {
    handleStop();
    onClose();
  }

  const error = localError || camError || rtError;
  const duration = `${Math.floor(elapsedSeconds / 60).toString().padStart(2, "0")}:${(elapsedSeconds % 60).toString().padStart(2, "0")}`;
  const waitingForFrame = firstFrameMs === null && (busy === "connecting" || active);
  const startupLabel = phase === "token" ? "申请短期令牌"
    : phase === "handshake" ? "建立实时连接"
    : phase === "ready" || status === "generating" ? "等待首帧"
    : "准备服装";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 md:p-8">
      <div role="dialog" aria-modal="true" aria-label="实时试穿" className="relative w-full max-w-5xl max-h-full bg-white rounded-2xl overflow-auto shadow-2xl flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div>
            <h2 className="font-semibold text-lg">试穿：{selectedProduct.name}</h2>
            <p role="status" className="text-sm text-gray-500">
              {waitingForFrame ? `${startupLabel}… 已等待 ${startupSeconds} 秒` : busy === "camera" ? "等待摄像头授权…" : busy === "garment" ? "正在切换服装…" : stream && !active && status !== "error" ? "摄像头已就绪，尚未连接" : STATUS_LABELS[status]}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              lucy-vton-latest · 会话 {duration} / 02:00
              {connectionMs !== null && ` · 连接 ${(connectionMs / 1000).toFixed(2)} 秒`}
              {firstFrameMs !== null && ` · 首帧 ${(firstFrameMs / 1000).toFixed(2)} 秒`}
            </p>
          </div>
          <button aria-label="关闭试穿" onClick={handleClose} className="w-10 h-10 rounded-full hover:bg-gray-100 text-gray-500">✕</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 bg-gray-900">
          <div className="relative aspect-[4/3] min-h-0">
            <span className="absolute top-3 left-3 z-10 text-xs text-white bg-black/50 rounded px-2 py-1">原始摄像头</span>
            <video ref={cameraVideoRef} aria-label="原始摄像头画面" autoPlay playsInline muted className="w-full h-full object-contain" style={{ transform: "scaleX(-1)" }} />
          </div>
          <div className="relative aspect-[4/3] min-h-0">
            <span className="absolute top-3 left-3 z-10 text-xs text-white bg-black/50 rounded px-2 py-1">AI 试穿</span>
            <video ref={videoRef} aria-label="AI 试穿画面" autoPlay playsInline muted className="w-full h-full object-contain" onLoadedData={() => {
              if (connectStartedRef.current !== null) {
                const elapsed = performance.now() - connectStartedRef.current;
                setFirstFrameMs((current) => current ?? elapsed);
              }
            }} />
            {waitingForFrame && <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white bg-gray-900/90">
              <span className="w-7 h-7 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <p className="text-sm">{startupLabel}… {startupSeconds} 秒</p>
              <p className="text-xs text-gray-400">首次启动通常需数秒，可随时停止</p>
            </div>}
          </div>
        </div>

        <div className="p-4 border-t border-gray-100 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={handleOpenCamera} disabled={Boolean(stream) || Boolean(busy) || active} className="text-sm px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-40">打开摄像头</button>
            <button onClick={handleStart} disabled={!stream || Boolean(busy) || active} className="text-sm px-4 py-2 bg-black text-white rounded-lg disabled:opacity-40">开始试穿</button>
            <button onClick={handleStop} className="text-sm px-4 py-2 border border-red-300 text-red-700 rounded-lg">停止试穿</button>
            <select aria-label="切换服装" value={selectedProduct.name} onChange={(event) => handleProductChange(event.target.value)} disabled={Boolean(busy) || status === "reconnecting"} className="text-sm border border-gray-200 rounded-lg px-3 py-2">
              {PRODUCTS.map((item) => <option key={item.name} value={item.name}>{item.name}</option>)}
            </select>
          </div>
          <p className="text-xs text-gray-500">打开摄像头仅本机预览；开始试穿后向 Decart 传输画面。单次最多 2 分钟，停止、关闭或离开页面会释放摄像头并断开连接。</p>
          <button onClick={() => setShowPrompt(!showPrompt)} className="text-sm text-gray-500 hover:text-gray-700">
            {showPrompt ? "隐藏提示词" : "显示提示词"}
          </button>
          {showPrompt && (
            <div className="flex gap-2">
              <input aria-label="服装提示词" type="text" value={prompt} onChange={(event) => setPrompt(event.target.value)} onKeyDown={(event) => event.key === "Enter" && void applyGarment(selectedProduct, prompt)} className="flex-1 min-w-0 text-sm border border-gray-200 rounded-lg px-3 py-2" />
              <button onClick={() => void applyGarment(selectedProduct, prompt)} disabled={!clientRef.current || Boolean(busy)} className="text-sm px-4 py-2 bg-black text-white rounded-lg disabled:opacity-40">应用</button>
            </div>
          )}
        </div>
        {error && <div role="alert" className="p-4 bg-red-50 text-red-700 text-sm">{error}</div>}
      </div>
    </div>
  );
}
