"use client";

import { useState, useCallback, useRef } from "react";
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
  apiKey: string;
  stream: MediaStream;
  prompt?: string;
  image?: Blob;
  onRemoteStream: (stream: MediaStream) => void;
}

export function useDecartRealtime() {
  const [status, setStatus] = useState<ConnectionStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const clientRef = useRef<RealtimeClient | null>(null);

  const connect = useCallback(async (options: ConnectOptions) => {
    const { apiKey, stream, prompt, image, onRemoteStream } = options;
    setStatus("connecting");
    setError(null);

    try {
      const client = createDecartClient({ apiKey });
      const model = models.realtime("lucy-vton-latest");

      const rtClient = await client.realtime.connect(stream, {
        model,
        onRemoteStream,
        ...((prompt || image) && {
          initialState: {
            ...(image && { image }),
            ...(prompt && { prompt: { text: prompt, enhance: false } }),
          },
        }),
      });

      rtClient.on("connectionChange", (state) => {
        setStatus(state);
      });

      rtClient.on("error", (err) => {
        setError(err.message);
        setStatus("error");
      });

      clientRef.current = rtClient;
      return rtClient;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Connection failed";
      setError(msg);
      setStatus("error");
      return null;
    }
  }, []);

  const disconnect = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.disconnect();
      clientRef.current = null;
    }
    setStatus("disconnected");
  }, []);

  return { status, error, connect, disconnect, clientRef };
}
