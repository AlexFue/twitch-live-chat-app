// Mirrors backend/src/types.ts

export interface ChatMessage {
  id: string;
  channel: string;
  username: string;
  color: string | null;
  text: string;
  timestamp: number;
  badges: Record<string, string>;
}

export interface StreamerInfo {
  isLive: boolean;
  displayName: string;
  title?: string;
  viewerCount?: number;
  thumbnailUrl?: string;
}

export type WSPayload =
  | { type: 'chat';    data: ChatMessage }
  | { type: 'history'; data: ChatMessage[] }
  | { type: 'status';  data: { channel: string; event: 'joined' | 'parted' | 'error'; message?: string } };
