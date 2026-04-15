import http from "http";
import express from "express";
import cors from "cors";
import { config } from "./config";
import { TwitchIRCClient } from "./twitchIRC";
import { chatStore } from "./chatStore";
import { broadcast, createWsServer } from "./wsServer";
import { getAccessToken } from "./twitchAuth";
import streamsRouter from "./routes/streams";

/**
 * Main backend entry point.
 *
 * This server does three things:
 * 1. REST API: Provides endpoints like GET /api/streams to check if a streamer is live
 * 2. WebSocket Server: Maintains persistent connections to browser clients and sends real-time chat
 * 3. Twitch IRC Connection: Connects to Twitch's IRC chat servers and listens for messages
 *
 * The HTTP server is shared between Express (REST) and WebSocket, so they run on the same port.
 */
async function main() {
  // Initialize Express app for REST endpoints
  const app = express();
  app.use(cors());
  app.use(express.json());

  // Health check endpoint — browsers use this to verify the backend is running
  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  // REST API routes — GET /api/streams?login=<name> validates streamer info
  app.use("/api/streams", streamsRouter);

  // Create the HTTP server that will handle both Express and WebSocket
  // When Vite proxies REST calls to :3001, they hit this server.
  // When browsers open a WebSocket connection, they also connect here.
  const server = http.createServer(app);

  /**
   * Set up Twitch IRC client.
   * This instance connects to Twitch's IRC servers and listens for chat messages.
   * When a message arrives, the callback pushes it to chatStore and broadcasts to all connected browser clients.
   */
  const twitchClient = new TwitchIRCClient((msg) => {
    chatStore.push(msg); // Save message in memory ring buffer
    broadcast(wss, { type: "chat", data: msg }); // Send to all connected browser clients
  });

  // Set up WebSocket server on the same HTTP server
  // This accepts WebSocket connections from browsers (ws://localhost:3001)
  const wss = createWsServer(server, twitchClient);

  // Pre-fetch the Twitch app access token so it's ready for REST calls
  // This validates that TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET are set
  try {
    await getAccessToken();
  } catch (err) {
    console.error("[startup] Warning: failed to pre-fetch Twitch token:", err);
    console.error(
      "[startup] Make sure TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET are set in backend/.env",
    );
  }

  // Connect to Twitch IRC servers (wss://irc-ws.chat.twitch.tv)
  // Once connected, we can join channels and listen for messages
  await twitchClient.connect();

  // Start the HTTP + WebSocket server
  server.listen(config.port, () => {
    console.log(
      `\n[server] Backend running at http://localhost:${config.port}`,
    );
    console.log(
      "[server] WebSocket available at ws://localhost:" + config.port,
    );
    console.log(
      "[server] Health: http://localhost:" + config.port + "/health\n",
    );
  });
}

main().catch((err) => {
  console.error("[startup] Fatal error:", err);
  process.exit(1);
});
