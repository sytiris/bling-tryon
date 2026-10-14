"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { PRODUCTS } from "@/lib/products";
import type { Product } from "@/lib/products";

type RemoteState =
  | "loading"
  | "claiming"
  | "active"
  | "in_use"
  | "not_found"
  | "expired"
  | "done";

const HEARTBEAT_INTERVAL = 5000;
const CLAIM_RETRY_INTERVAL = 3000;

export default function RemotePage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [state, setState] = useState<RemoteState>("loading");
  const [controllerId, setControllerId] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const claimRetryRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const controllerIdRef = useRef<string | null>(null);

  // Keep ref in sync
  useEffect(() => {
    controllerIdRef.current = controllerId;
  }, [controllerId]);

  // Validate session + attempt claim
  useEffect(() => {
    if (!sessionId) return;

    (async () => {
      try {
        const res = await fetch(
          `/api/mirror/session?sessionId=${sessionId}`
        );
        if (!res.ok) {
          setState("not_found");
          return;
        }

        setState("claiming");
        attemptClaim();
      } catch {
        setState("not_found");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const attemptClaim = useCallback(async () => {
    try {
      const res = await fetch("/api/mirror/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });

      if (res.ok) {
        const { controllerId: id } = await res.json();
        setControllerId(id);
        setState("active");
        return true;
      } else {
        setState("in_use");
        return false;
      }
    } catch {
      setState("in_use");
      return false;
    }
  }, [sessionId]);

  // Auto-retry claim when in_use
  useEffect(() => {
    if (state !== "in_use") {
      if (claimRetryRef.current) {
        clearInterval(claimRetryRef.current);
        claimRetryRef.current = null;
      }
      return;
    }

    claimRetryRef.current = setInterval(async () => {
      const success = await attemptClaim();
      if (success && claimRetryRef.current) {
        clearInterval(claimRetryRef.current);
        claimRetryRef.current = null;
      }
    }, CLAIM_RETRY_INTERVAL);

    return () => {
      if (claimRetryRef.current) clearInterval(claimRetryRef.current);
    };
  }, [state, attemptClaim]);

  // Heartbeat when active
  useEffect(() => {
    if (state !== "active" || !controllerId) {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
      return;
    }

    const ping = async () => {
      try {
        const res = await fetch("/api/mirror/ping", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, controllerId }),
        });
        if (!res.ok) {
          setState("expired");
        }
      } catch {
        // Silently ignore ping errors
      }
    };

    ping();
    heartbeatRef.current = setInterval(ping, HEARTBEAT_INTERVAL);

    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    };
  }, [state, controllerId, sessionId]);

  // Release on unmount / visibility change
  useEffect(() => {
    const release = () => {
      if (controllerIdRef.current && sessionId) {
        navigator.sendBeacon(
          "/api/mirror/release",
          JSON.stringify({
            sessionId,
            controllerId: controllerIdRef.current,
          })
        );
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        release();
      }
    };

    window.addEventListener("beforeunload", release);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("beforeunload", release);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      release();
    };
  }, [sessionId]);

  // Select item
  const handleSelectItem = useCallback(
    async (product: Product) => {
      if (!controllerId) return;
      setSelectedItemId(product.id);

      try {
        await fetch("/api/mirror/select", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            itemId: product.id,
            controllerId,
          }),
        });
      } catch {
        // Selection failed silently
      }
    },
    [sessionId, controllerId]
  );

  // Done handler
  const handleDone = useCallback(async () => {
    if (controllerId) {
      await fetch("/api/mirror/release", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, controllerId }),
      }).catch(() => {});
    }
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    setControllerId(null);
    controllerIdRef.current = null;
    setState("done");
  }, [sessionId, controllerId]);

  // Loading / claiming
  if (state === "loading" || state === "claiming") {
    return (
      <div className="min-h-screen bg-[#1a1a1a] flex flex-col items-center justify-center gap-4 p-6">
        <div className="w-[32px] h-[32px] border-2 border-white/20 border-t-white rounded-full animate-spin" />
        <p className="text-white/50 text-[14px]">Connecting to mirror...</p>
      </div>
    );
  }

  // Not found
  if (state === "not_found") {
    return (
      <div className="min-h-screen bg-[#1a1a1a] flex flex-col items-center justify-center gap-4 p-6">
        <p className="text-white/70 text-[18px] font-medium">
          Session not found
        </p>
        <p className="text-white/40 text-[14px] text-center">
          This mirror session has expired or doesn&apos;t exist. Please scan
          the QR code again.
        </p>
      </div>
    );
  }

  // In use
  if (state === "in_use") {
    return (
      <div className="min-h-screen bg-[#1a1a1a] flex flex-col items-center justify-center gap-4 p-6">
        <div className="w-[56px] h-[56px] rounded-full bg-yellow-500/10 flex items-center justify-center">
          <svg
            className="w-[28px] h-[28px] text-yellow-400"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <p className="text-white/70 text-[18px] font-medium">
          Mirror is in use
        </p>
        <p className="text-white/40 text-[14px] text-center">
          Someone is already using this mirror. Please wait...
        </p>
        <div className="w-[24px] h-[24px] border-2 border-white/20 border-t-white/50 rounded-full animate-spin mt-2" />
      </div>
    );
  }

  // Done
  if (state === "done") {
    return (
      <div className="min-h-screen bg-[#1a1a1a] flex flex-col items-center justify-center gap-4 p-6">
        <div className="w-[56px] h-[56px] rounded-full bg-emerald-500/10 flex items-center justify-center">
          <svg
            className="w-[28px] h-[28px] text-emerald-400"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <p className="text-white/70 text-[18px] font-medium">Thanks!</p>
        <p className="text-white/40 text-[14px] text-center">
          You&apos;ve released the mirror. Feel free to scan the QR code to
          try again.
        </p>
      </div>
    );
  }

  // Expired
  if (state === "expired") {
    return (
      <div className="min-h-screen bg-[#1a1a1a] flex flex-col items-center justify-center gap-4 p-6">
        <p className="text-white/70 text-[18px] font-medium">
          Session expired
        </p>
        <p className="text-white/40 text-[14px] text-center">
          Your session has timed out. Please scan the QR code again.
        </p>
      </div>
    );
  }

  // Active — show product grid
  return (
    <div className="min-h-screen bg-[#1a1a1a] flex flex-col font-sans">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#1a1a1a] border-b border-white/10 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-[6px] h-[6px] rounded-full bg-emerald-400" />
          <span className="text-white/60 text-[13px]">Connected</span>
        </div>
        <button
          onClick={handleDone}
          className="px-4 py-1.5 bg-white/10 hover:bg-white/15 text-white/70 text-[13px] rounded-full transition-colors"
        >
          Done
        </button>
      </div>

      {/* Product grid */}
      <div className="flex-1 px-4 py-4 pb-8">
        <div className="grid grid-cols-2 gap-3">
          {PRODUCTS.map((product) => (
            <button
              key={product.id}
              onClick={() => handleSelectItem(product)}
              className={`rounded-[12px] overflow-hidden transition-all ${
                selectedItemId === product.id
                  ? "ring-2 ring-violet-500 shadow-[0_0_20px_rgba(139,92,246,0.3)]"
                  : "bg-white/5"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={product.image}
                alt={product.name}
                className="w-full aspect-[4/5] object-cover"
                loading="lazy"
              />
              <div className="px-3 py-2 bg-white/5">
                <p className="text-white/80 text-[12px] font-medium truncate">
                  {product.name}
                </p>
                {selectedItemId === product.id && (
                  <p className="text-violet-400 text-[11px] mt-0.5">
                    Trying on...
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Currently trying on bar */}
      {selectedItemId && (
        <div className="sticky bottom-0 bg-[#1a1a1a] border-t border-white/10 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
            <p className="text-white/60 text-[13px] flex-1">
              Trying on{" "}
              <span className="text-white/80 font-medium">
                {PRODUCTS.find((p) => p.id === selectedItemId)?.name}
              </span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
