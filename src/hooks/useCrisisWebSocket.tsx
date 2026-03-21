import { useEffect, useRef } from "react";
import type { CrisisNotification } from "@/lib/crisisApi";

type CrisisSocketHandler = (payload: CrisisNotification) => void;

function getWsUrl(): string {
  // Use relative paths - nginx will proxy to backend via Railway internal network
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/ws/crisis-alerts`;
}

export function useCrisisWebSocket(onMessage?: CrisisSocketHandler) {
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      const ws = new WebSocket(getWsUrl());
      socketRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as CrisisNotification;
          onMessage?.(data);
        } catch {
          // ignore malformed payloads
        }
      };

      ws.onclose = () => {
        if (reconnectTimer) clearTimeout(reconnectTimer);
        reconnectTimer = setTimeout(connect, 2000);
      };
    };

    connect();
    return () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      socketRef.current?.close();
    };
  }, [onMessage]);
}
