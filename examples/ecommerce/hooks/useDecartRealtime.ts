"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { createDecartClient, models } from "@decartai/sdk";

type RealtimeClient = Awaited<
  ReturnType<ReturnType<typeof createDecartClient>["realtime"]["connect"]>
>;

export type ConnectionStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "generating"
  | "reconnecting"
  | "disconnected"
  | "error";

interface ConnectOptions {
  stream: MediaStream;
  prompt?: string;
  image?: Blob;
  onRemoteStream: (stream: MediaStream) => void;
}

interface PreparedToken {
  apiKey: string;
  expiresAt: number;
}

export function useDecartRealtime() {
  const [status, setStatus] = useState<ConnectionStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [connectionMs, setConnectionMs] = useState<number | null>(null);
  const [phase, setPhase] = useState<"idle" | "token" | "handshake" | "ready">("idle");
  const clientRef = useRef<RealtimeClient | null>(null);
  const attemptRef = useRef<AbortController | null>(null);
  const tokenRef = useRef<PreparedToken | null>(null);
  const tokenRequestRef = useRef<{
    controller: AbortController;
    promise: Promise<PreparedToken>;
  } | null>(null);

  const warmToken = useCallback((): Promise<PreparedToken> => {
    if (tokenRef.current && tokenRef.current.expiresAt > Date.now() + 15000) {
      return Promise.resolve(tokenRef.current);
    }
    if (tokenRequestRef.current) return tokenRequestRef.current.promise;
    const controller = new AbortController();
    const promise: Promise<PreparedToken> = (async () => {
      const response = await fetch("/api/tokens", {
        method: "POST",
        cache: "no-store",
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]),
      });
      const data = await response.json();
      controller.signal.throwIfAborted();
      if (!response.ok) throw new Error(data.error || "短期令牌获取失败");
      const expiresAt = Date.parse(data.expiresAt);
      if (typeof data.apiKey !== "string" || !data.apiKey || !Number.isFinite(expiresAt)) {
        throw new Error("令牌响应格式不正确");
      }
      const token = { apiKey: data.apiKey, expiresAt };
      tokenRef.current = token;
      return token;
    })().finally(() => {
      if (tokenRequestRef.current?.controller === controller) tokenRequestRef.current = null;
    });
    tokenRequestRef.current = { controller, promise };
    return promise;
  }, []);

  const disconnect = useCallback(() => {
    attemptRef.current?.abort();
    attemptRef.current = null;
    clientRef.current?.disconnect();
    clientRef.current = null;
    tokenRequestRef.current?.controller.abort();
    tokenRequestRef.current = null;
    tokenRef.current = null;
    setPhase("idle");
    setStatus("disconnected");
  }, []);

  const connect = useCallback(async (options: ConnectOptions) => {
    // Keep the unused short-lived token prepared during camera preview.
    attemptRef.current?.abort();
    clientRef.current?.disconnect();
    clientRef.current = null;
    const controller = new AbortController();
    attemptRef.current = controller;
    const { stream, prompt, image, onRemoteStream } = options;
    const started = performance.now();
    setStatus("connecting");
    setError(null);
    setConnectionMs(null);
    setPhase("token");
    const timeout = setTimeout(() => {
      if (controller.signal.aborted || attemptRef.current !== controller) return;
      disconnect();
      setError("连接等待超过 30 秒，已断开；请检查网络后重试");
      setStatus("error");
    }, 30000);

    try {
      const client = createDecartClient({
        apiKeyProvider: async () => {
          controller.signal.throwIfAborted();
          setPhase("token");
          const token = await warmToken();
          controller.signal.throwIfAborted();
          tokenRef.current = null;
          setPhase("handshake");
          return token.apiKey;
        },
        logger: {
          debug() {}, info() {}, warn() {}, error() {},
        },
        telemetry: false,
      });
      const model = models.realtime("lucy-vton-latest");

      const rtClient = await client.realtime.connect(stream, {
        model,
        signal: controller.signal,
        retries: 0,
        mirror: "auto",
        onRemoteStream: (remoteStream) => {
          if (!controller.signal.aborted) onRemoteStream(remoteStream);
        },
        onConnectionChange: (state) => {
          if (!controller.signal.aborted) setStatus(state);
        },
        initialState: {
          ...(prompt && { prompt: { text: prompt, enhance: false } }),
          ...(image && { image }),
        },
      });

      if (controller.signal.aborted) {
        rtClient.disconnect();
        return null;
      }
      clientRef.current = rtClient;
      setPhase("ready");
      setStatus(rtClient.getConnectionState());
      setConnectionMs(performance.now() - started);

      rtClient.on("error", (err) => {
        if (controller.signal.aborted) return;
        setError(err.message.replace(/(?:dct_|ek_)[\w.-]+/g, "[redacted]"));
        setStatus("error");
        disconnect();
        setStatus("error");
      });
      rtClient.on("sessionEnded", ({ reason }) => {
        if (controller.signal.aborted) return;
        setError("会话已结束：" + reason);
        disconnect();
      });
      return rtClient;
    } catch (err) {
      if (controller.signal.aborted) return null;
      const msg = err && typeof err === "object" && "message" in err
        ? String(err.message).replace(/(?:dct_|ek_)[\w.-]+/g, "[redacted]")
        : "实时连接失败，请检查网络、余额和模型权限";
      setError(msg);
      disconnect();
      setStatus("error");
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }, [disconnect, warmToken]);

  useEffect(() => disconnect, [disconnect]);

  return { status, error, phase, connectionMs, warmToken, connect, disconnect, clientRef };
}
