export interface ChatMessage {
  id: string;
  channel: string;       // streamer login, without '#'
  username: string;      // display name
  color: string | null;  // Twitch hex color e.g. "#FF0000", null if unset
  text: string;
  timestamp: number;     // Date.now()
  badges: Record<string, string>; // e.g. { broadcaster: "1", subscriber: "6" }
}

export interface StreamerInfo {
  isLive: boolean;
  displayName: string;
  title?: string;
  viewerCount?: number;
  thumbnailUrl?: string;
}

// Discriminated union of all messages the server sends to the browser.
// Adding a new type (e.g. llm_response) only requires extending this union.
export type WSPayload =
  | { type: 'chat';    data: ChatMessage }
  | { type: 'history'; data: ChatMessage[] }
  | { type: 'status';  data: { channel: string; event: 'joined' | 'parted' | 'error'; message?: string } };

// Messages the browser sends to the server
export type WSCommand =
  | { type: 'join'; channel: string };
