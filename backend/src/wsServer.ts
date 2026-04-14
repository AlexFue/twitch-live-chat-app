import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { WSPayload, WSCommand } from './types';
import { chatStore } from './chatStore';
import { TwitchIRCClient } from './twitchIRC';

/**
 * Creates and configures the WebSocket server.
 *
 * **What is a WebSocket?**
 * A WebSocket is a persistent, two-way communication channel between browser and server.
 * Unlike HTTP (request → response → connection closes), WebSocket stays open so:
 * - Server can push data to the browser anytime (no request needed)
 * - Both sides can send messages at any time
 *
 * **What happens here:**
 * - Browser opens a WebSocket connection: ws://localhost:3001
 * - Connection stays open for real-time chat updates
 * - When Twitch sends a new message, backend immediately pushes it to all connected browsers
 *
 * @param server The HTTP server instance (shared with Express)
 * @param twitchClient The Twitch IRC client that listens for chat messages
 * @returns The WebSocket server instance
 */
export function createWsServer(
  server: import('http').Server,
  twitchClient: TwitchIRCClient
): WebSocketServer {
  // Create a WebSocket server that runs on the same port as Express
  const wss = new WebSocketServer({ server });

  /**
   * Fires when a browser connects via WebSocket.
   * Each connection is a separate `ws` object.
   */
  wss.on('connection', (ws: WebSocket, _req: IncomingMessage) => {
    console.log('[ws] Client connected');

    // Send the current state to the newly connected client
    // This way, if they join a channel that's already being watched, they get recent history
    const currentChannel = twitchClient.getCurrentChannel();
    if (currentChannel) {
      // Tell them which channel we're watching
      send(ws, {
        type: 'status',
        data: { channel: currentChannel, event: 'joined' },
      });
      // Send the last 50 messages from the buffer so they have context
      send(ws, {
        type: 'history',
        data: chatStore.getRecent(50),
      });
    }

    /**
     * Fires when a browser sends a message to the WebSocket.
     * The browser sends commands like { type: 'join', channel: 'pokimane' }
     */
    ws.on('message', async (raw) => {
      let command: WSCommand;
      try {
        command = JSON.parse(raw.toString()) as WSCommand;
      } catch {
        console.warn('[ws] Received non-JSON message, ignoring');
        return;
      }

      // Handle the 'join' command: switch to a new channel
      if (command.type === 'join') {
        const channel = command.channel.toLowerCase().trim();
        if (!channel) return;

        console.log(`[ws] Join request for #${channel}`);

        // Clear old messages since we're switching channels
        chatStore.clear();

        try {
          // Tell the Twitch IRC client to join this channel
          // This will leave the old channel (if any) and join the new one
          await twitchClient.joinChannel(channel);

          // Notify all connected browsers that we switched channels
          broadcast(wss, {
            type: 'status',
            data: { channel, event: 'joined' },
          });

          // Send recent messages (will be empty after clear, but good for consistency)
          broadcast(wss, {
            type: 'history',
            data: chatStore.getRecent(50),
          });
        } catch (err) {
          console.error(`[ws] Failed to join #${channel}:`, err);
          // Tell the client there was an error
          send(ws, {
            type: 'status',
            data: { channel, event: 'error', message: 'Failed to join channel' },
          });
        }
      }
    });

    // Handle client disconnect
    ws.on('close', () => {
      console.log('[ws] Client disconnected');
    });

    ws.on('error', (err) => {
      console.error('[ws] Client error:', err);
    });
  });

  return wss;
}

/**
 * Sends a message to all connected WebSocket clients.
 * This is how the server pushes real-time updates.
 *
 * @param wss The WebSocket server instance
 * @param payload The message to send (typed as WSPayload)
 *
 * **Example flow:**
 * 1. Twitch sends a chat message
 * 2. Backend receives it in twitchIRC.ts
 * 3. Backend calls broadcast() to send to all browsers
 * 4. All browsers immediately show the new message
 */
export function broadcast(wss: WebSocketServer, payload: WSPayload): void {
  const message = JSON.stringify(payload);

  // Iterate over all connected clients
  wss.clients.forEach((client) => {
    // Only send if the connection is actively open (OPEN = 1)
    // We skip CONNECTING, CLOSING, CLOSED states
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

/**
 * Sends a message to a single WebSocket client.
 * Used when we need to notify just one browser (e.g., an error).
 */
function send(ws: WebSocket, payload: WSPayload): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}
