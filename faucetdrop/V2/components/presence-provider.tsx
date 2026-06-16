"use client";

import React, {
  createContext, useContext, useEffect, useState, useRef, useCallback,
} from "react";
import { useWallet } from "@/hooks/use-wallet";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "https://faucetpay-backend.koyeb.app";
const WS_BASE  = API_BASE.replace(/^https?/, (s) => s === "https" ? "wss" : "ws");

const PresenceContext = createContext<Set<string>>(new Set());

export function PresenceProvider({ children }: { children: React.ReactNode }) {
  const { address } = useWallet();
  const [onlineSet, setOnlineSet] = useState<Set<string>>(new Set());

  const wsRef        = useRef<WebSocket | null>(null);
  const addressRef   = useRef<string | null>(null);
  const retryTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pingTimer    = useRef<ReturnType<typeof setInterval> | null>(null);
  const unmounted    = useRef(false);

  // Keep addressRef in sync so callbacks always see the latest wallet
  useEffect(() => {
    addressRef.current = address?.toLowerCase() ?? null;
  }, [address]);

  const stopTimers = useCallback(() => {
    if (retryTimer.current) { clearTimeout(retryTimer.current);   retryTimer.current = null; }
    if (pingTimer.current)  { clearInterval(pingTimer.current);   pingTimer.current  = null; }
  }, []);

  const connect = useCallback(() => {
    if (unmounted.current) return;
    if (wsRef.current && wsRef.current.readyState <= WebSocket.OPEN) return; // already connecting/open

    const ws = new WebSocket(`${WS_BASE}/ws/presence`);
    wsRef.current = ws;

    ws.onopen = () => {
      if (unmounted.current) { ws.close(); return; }

      // Announce ourselves if wallet is already known
      if (addressRef.current) {
        ws.send(JSON.stringify({ type: "hello", wallet: addressRef.current }));
      }

      // Keepalive ping every 20s so the connection doesn't idle out
      stopTimers();
      pingTimer.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "ping" }));
        }
      }, 20_000);
    };

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === "presence" && Array.isArray(msg.online)) {
          setOnlineSet(new Set(msg.online.map((w: string) => w.toLowerCase())));
        }
      } catch {}
    };

    ws.onclose = () => {
      stopTimers();
      if (!unmounted.current) {
        // Exponential-ish backoff: retry after 3s
        retryTimer.current = setTimeout(connect, 3_000);
      }
    };

    ws.onerror = () => {
      ws.close(); // triggers onclose → retry
    };
  }, [stopTimers]);

  // Re-announce when wallet changes (e.g. user connects wallet after page load)
  useEffect(() => {
    if (!address) return;
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "hello", wallet: address.toLowerCase() }));
    }
  }, [address]);

  // Mount / unmount
  useEffect(() => {
    unmounted.current = false;
    connect();
    return () => {
      unmounted.current = true;
      stopTimers();
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [connect, stopTimers]);

  return (
    <PresenceContext.Provider value={onlineSet}>
      {children}
    </PresenceContext.Provider>
  );
}

export const usePresence = () => useContext(PresenceContext);