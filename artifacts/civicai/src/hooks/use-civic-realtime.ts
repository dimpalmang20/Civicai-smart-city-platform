import { useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";

/**
 * Subscribes to `/api/ws` when a JWT is present so users see toast alerts for server events.
 */
export function useCivicRealtime(enabled: boolean) {
  const { toast } = useToast();
  const ref = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const token = localStorage.getItem("civicai_token");
    if (!token) return;

    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    const url = `${proto}//${window.location.host}/api/ws?token=${encodeURIComponent(token)}`;
    const ws = new WebSocket(url);
    ref.current = ws;

    ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data as string) as { type?: string; title?: string; body?: string };
        if (data.type === "notification" && data.title) {
          toast({ title: data.title, description: data.body });
        }
      } catch {
        /* ignore malformed */
      }
    };

    return () => {
      ws.close();
      ref.current = null;
    };
  }, [enabled, toast]);
}
