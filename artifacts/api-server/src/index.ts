import http from "node:http";
import "dotenv/config";
import app from "./app";
import { logger } from "./lib/logger";
import { attachRealtime } from "./realtime";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const server = http.createServer(app);
attachRealtime(server);

server.listen(port, () => {
  logger.info({ port }, "Server listening (HTTP + WebSocket /api/ws)");
});

server.on("error", (err) => {
  logger.error({ err }, "Error listening on port");
  process.exit(1);
});
