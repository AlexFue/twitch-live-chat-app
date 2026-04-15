import tmi from "tmi.js";
import { ChatMessage } from "./types";

type MessageHandler = (msg: ChatMessage) => void;

/**
 * Wraps the tmi.js library to handle Twitch IRC chat connection.
 *
 * **What is Twitch IRC?**
 * Twitch has its own IRC server where all chat messages flow.
 * By connecting to this server, we can read ANY public Twitch chat in real-time.
 * IRC is a text protocol that's been around for decades—Twitch uses it for chat.
 *
 * **Anonymous connection:**
 * We connect as a random "justinfan" user (e.g., justinfan12345).
 * Twitch allows anonymous read-only connections, so we don't need any OAuth tokens.
 * This is perfect for a learning project — no user authentication needed.
 *
 * **How it works:**
 * 1. We connect to Twitch's IRC server: wss://irc-ws.chat.twitch.tv
 * 2. We tell it which channel to join (e.g., #pokimane)
 * 3. Every message in that channel is sent to us
 * 4. We parse the message and pass it to our callback
 * 5. The callback sends it to all connected browser clients
 */
export class TwitchIRCClient {
  private client: tmi.Client;
  private currentChannel: string | null = null;
  private onMessage: MessageHandler;

  /**
   * Constructor: Set up the tmi.js client with anonymous credentials.
   *
   * @param onMessage Callback fired whenever a chat message arrives from Twitch.
   *                  We call this with parsed ChatMessage objects.
   */
  constructor(onMessage: MessageHandler) {
    this.onMessage = onMessage;

    // Create a tmi.js IRC client with anonymous connection settings.
    // tmi.js handles all the IRC protocol details—we just use the high-level API.
    this.client = new tmi.Client({
      options: { debug: false },
      connection: {
        reconnect: true, // Auto-reconnect if the connection drops
        secure: true, // Use wss:// (WebSocket Secure), not ws://
      },
      identity: {
        // Random justinfan username—Twitch allows these for read-only access
        username: `justinfan${Math.floor(Math.random() * 99999) + 1}`,
        // tmi.js uses this placeholder password for anonymous connections
        password: "SCHMOOPIIE",
      },
      channels: [], // Empty for now; we'll add channels with joinChannel()
    });

    /**
     * Message event: Fires when someone sends a message in the channel.
     * The 'message' event gives us the username, color, badges, and text.
     */
    this.client.on("message", (_channel, tags, text, self) => {
      // Ignore messages from our own bot account (never happens with anonymous)
      if (self) return;

      // Parse the Twitch message tags into our ChatMessage format
      const msg: ChatMessage = {
        // Each message gets a unique ID from Twitch
        id: (tags["id"] as string | undefined) ?? crypto.randomUUID(),
        // Channel name without the # (e.g., "pokimane" not "#pokimane")
        channel: _channel.replace("#", ""),
        // Display name (e.g., "Pokimane") or fallback to login name
        username:
          (tags["display-name"] as string | undefined) ??
          tags.username ??
          "unknown",
        // Hex color for the username (e.g., "#FF0000"), or null if not set
        color: (tags.color as string | undefined) ?? null,
        // The actual message text
        text,
        // Timestamp when we received it (for hover display in UI)
        timestamp: Date.now(),
        // Badges (broadcaster, moderator, subscriber, vip, etc.)
        badges: (tags.badges as Record<string, string> | undefined) ?? {},
      };

      // Call our callback so the backend can broadcast to browser clients
      this.onMessage(msg);
    });

    /**
     * Connected event: Fired when we successfully connect to Twitch IRC.
     */
    this.client.on("connected", (addr, port) => {
      console.log(`[irc] Connected to ${addr}:${port}`);
    });

    /**
     * Disconnected event: Fired when connection drops.
     * tmi.js will auto-reconnect due to { reconnect: true } above.
     */
    this.client.on("disconnected", (reason) => {
      console.log(`[irc] Disconnected: ${reason}`);
    });
  }

  /**
   * Connect to Twitch IRC servers.
   * This opens the initial connection; channels are joined separately with joinChannel().
   */
  async connect(): Promise<void> {
    await this.client.connect();
  }

  /**
   * Join a Twitch channel (switch channels).
   * If already watching a channel, we leave it first.
   *
   * @param login The streamer's login name (e.g., "pokimane")
   */
  async joinChannel(login: string): Promise<void> {
    const channel = login.toLowerCase();

    // If we're already watching a different channel, leave it first.
    // This keeps memory clean and only watches one channel at a time.
    if (this.currentChannel && this.currentChannel !== channel) {
      try {
        await this.client.part(`#${this.currentChannel}`);
        console.log(`[irc] Left #${this.currentChannel}`);
      } catch {
        // Ignore errors when leaving—channel may have been parted already
      }
    }

    // If we're already in this channel, do nothing
    if (this.currentChannel === channel) return;

    // Join the new channel on Twitch IRC
    // After this, we'll start receiving messages from #${channel}
    await this.client.join(`#${channel}`);
    this.currentChannel = channel;
    console.log(`[irc] Joined #${channel}`);
  }

  /**
   * Get the current channel we're watching.
   * Used to send state to newly connected browsers.
   */
  getCurrentChannel(): string | null {
    return this.currentChannel;
  }

  /**
   * Leave the current Twitch IRC channel.
   * Resets currentChannel to null.
   */
  async leaveChannel(): Promise<void> {
    if (!this.currentChannel) return;

    try {
      await this.client.part(`#${this.currentChannel}`);
      console.log(`[irc] Left #${this.currentChannel}`);
      this.currentChannel = null;
    } catch (err) {
      console.error(`[irc] Error leaving channel:`, err);
    }
  }
}
