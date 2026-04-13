import type { Server } from "node:http";
import { WebSocketServer, type WebSocket } from "ws";
import { verifyAccessToken } from "./lib/jwt";
import { logger } from "./lib/logger";

/** userId -> sockets */
const socketsByUser = new Map<number, Set<WebSocket>>();

export function attachRealtime(server: Server): void {
  const wss = new WebSocketServer({ server, path: "/api/ws" });

  wss.on("connection", (ws, req) => {
    void (async () => {
      try {
        const host = req.headers.host ?? "localhost";
        const url = new URL(req.url ?? "", `http://${host}`);
        const token = url.searchParams.get("token");
        if (!token) {
          ws.close(4401, "missing_token");
          return;
        }
        const payload = await verifyAccessToken(token);
        const userId = payload?.sub ? Number(payload.sub) : NaN;
        if (!payload || !Number.isFinite(userId)) {
          ws.close(4401, "invalid_token");
          return;
        }

        if (!socketsByUser.has(userId)) socketsByUser.set(userId, new Set());
        socketsByUser.get(userId)!.add(ws);

        ws.send(
          JSON.stringify({
            type: "connected",
            userId,
            at: new Date().toISOString(),
          }),
        );

        ws.on("close", () => {
          const set = socketsByUser.get(userId);
          if (!set) return;
          set.delete(ws);
          if (set.size === 0) socketsByUser.delete(userId);
        });
      } catch (err) {
        logger.warn({ err }, "WebSocket handshake failed");
        try {
          ws.close(1011, "handshake_error");
        } catch {
          /* ignore */
        }
      }
    })();
  });
}

export function pushToUser(userId: number, message: Record<string, unknown>): void {
  const set = socketsByUser.get(userId);
  if (!set?.size) return;
  const payload = JSON.stringify(message);
  for (const ws of set) {
    if (ws.readyState === 1) {
      try {
        ws.send(payload);
      } catch {
        /* ignore */
      }
    }
  }
}
