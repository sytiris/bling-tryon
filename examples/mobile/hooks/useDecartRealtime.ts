"use client";

import { useState, useCallback, useRef } from "react";
import { createDecartClient, models } from "@decartai/sdk";
import type {
  ConnectionQualityReport,
  ConnectivityReport,
} from "@decartai/sdk";

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
  onRemoteStream: (stream: MediaStream) => void;
}

/**
 * Preflight network check. A fast, network-only reachability probe: no
 * session is opened and nothing is billed. Returns the SDK's verdict on a
 * shared "good" | "fair" | "poor" | "critical" scale, plus the transport it
 * managed to establish (udp / relay / failed) and the measured round trip.
 */
export async function checkConnectivity(apiKey: string): Promise<ConnectivityReport> {
  const client = createDecartClient({ apiKey });
  return client.realtime.checkConnectivity();
}

export function useDecartRealtime() {
  const [status, setStatus] = useState<ConnectionStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  // Latest in-session verdict from the SDK, or null before the first sample.
  const [quality, setQuality] = useState<ConnectionQualityReport | null>(null);
  const clientRef = useRef<RealtimeClient | null>(null);

  const connect = useCallback(async (options: ConnectOptions) => {
    const { apiKey, stream, onRemoteStream } = options;
    setStatus("connecting");
    setError(null);
    setQuality(null);

    try {
      const client = createDecartClient({ apiKey });
      const model = models.realtime("lucy-vton-latest");

      const rtClient = await client.realtime.connect(stream, {
        model,
        onRemoteStream,
        // The SDK derives a smoothed verdict from live WebRTC stats (latency,
        // packet loss, bandwidth headroom, frame rate) and names the dimension
        // that is currently the bottleneck.
        onConnectionQuality: (report) => {
          setQuality(report);
        },
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
    setQuality(null);
    setStatus("disconnected");
  }, []);

  return { status, error, quality, connect, disconnect, clientRef };
}
