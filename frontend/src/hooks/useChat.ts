import { useState, useEffect, useRef, useCallback } from "react";
import { ChatMessage, StreamerInfo, WSPayload } from "../types";

const WS_URL = "ws://localhost:3001";
const MAX_MESSAGES = 200; // Cap DOM messages to avoid performance issues
const BASE_RECONNECT_DELAY = 1000;
const MAX_RECONNECT_DELAY = 30000;

export type ConnectionStatus = "disconnected" | "connecting" | "connected";

interface UseChatReturn {
  messages: ChatMessage[];
  status: ConnectionStatus;
  currentChannel: string | null;
  streamerInfo: StreamerInfo | null;
  inputError: string | null;
  joinChannel: (login: string) => Promise<void>;
  leaveChannel: () => void;
  clearMessages: () => void;
  streamerHistory: string[];
}

export const useChat = (): UseChatReturn => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [currentChannel, setCurrentChannel] = useState<string | null>(null);
  const [streamerInfo, setStreamerInfo] = useState<StreamerInfo | null>(null);
  const [inputError, setInputError] = useState<string | null>(null);
  const [streamerHistory, setStreamerHistory] = useState<string[]>([]);

  // useRef so we can access the WS in callbacks without stale closures
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectDelay = useRef(BASE_RECONNECT_DELAY);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shouldReconnect = useRef(true);

  // Fetch streamer history on mount
  useEffect(() => {
    fetchStreamerHistory();
  }, []);

  // Fetch streamer history from the server (DB)
  const fetchStreamerHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/streamers/");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const streamers = await res.json()
      setStreamerHistory(streamers.map(s => s.username));
    } catch (err) {
      console.error("Failed to fetch streamer history:", err);
    }
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    setStatus("connecting");
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("[ws] Connected");
      setStatus("connected");
      reconnectDelay.current = BASE_RECONNECT_DELAY; // reset backoff on success
    };

    ws.onmessage = (event) => {
      let payload: WSPayload;
      try {
        payload = JSON.parse(event.data as string) as WSPayload;
      } catch {
        console.warn("[ws] Received non-JSON message");
        return;
      }

      if (payload.type === "chat") {
        setMessages((prev) => {
          const next = [...prev, payload.data];
          // Keep only the most recent MAX_MESSAGES messages
          return next.length > MAX_MESSAGES ? next.slice(-MAX_MESSAGES) : next;
        });
      } else if (payload.type === "history") {
        setMessages(payload.data.slice(-MAX_MESSAGES));
      } else if (payload.type === "status") {
        if (payload.data.event === "joined") {
          setCurrentChannel(payload.data.channel ?? null);
        } else if (payload.data.event === "parted") {
          // Channel was left — clear local state
          setCurrentChannel(null);
          clearMessages();
        } else if (payload.data.event === "error") {
          setInputError(payload.data.message ?? "Failed to join channel");
        }
      }
    };

    ws.onclose = () => {
      console.log("[ws] Disconnected");
      setStatus("disconnected");
      wsRef.current = null;

      if (shouldReconnect.current) {
        console.log(`[ws] Reconnecting in ${reconnectDelay.current}ms...`);
        reconnectTimer.current = setTimeout(() => {
          connect();
        }, reconnectDelay.current);
        // Exponential backoff: double the delay, cap at MAX
        reconnectDelay.current = Math.min(
          reconnectDelay.current * 2,
          MAX_RECONNECT_DELAY,
        );
      }
    };

    ws.onerror = (err) => {
      console.error("[ws] Error:", err);
    };
  }, []);

  useEffect(() => {
    shouldReconnect.current = true;
    connect();

    return () => {
      shouldReconnect.current = false;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const joinChannel = useCallback(
    async (login: string) => {
      setInputError(null);

      // Client-side validation
      const trimmed = login.trim().toLowerCase();
      if (!trimmed) {
        setInputError("Please enter a streamer name");
        return;
      }
      if (!/^[a-z0-9_]{1,25}$/.test(trimmed)) {
        setInputError(
          "Invalid streamer name (letters, numbers, underscores only)",
        );
        return;
      }

      // Validate via REST — checks if streamer exists and if they're live
      let info: StreamerInfo;
      try {
        const res = await fetch(`/api/streamers/streamerExists?login=${trimmed}`);
        if (res.status === 404) {
          const body = (await res.json()) as { error: string };
          setInputError(body.error ?? `Streamer '${login}' not found`);
          return;
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        info = (await res.json()) as StreamerInfo;
      } catch (err) {
        if (err instanceof Error && err.message.startsWith("HTTP")) {
          setInputError("Could not connect to server. Is the backend running?");
        } else {
          setInputError("Network error. Please try again.");
        }
        return;
      }

      // Set streamer info and clear old messages before joining new channel
      setStreamerInfo(info);
      clearMessages();

      // Save entered streamer to DB (for history) - do this before joining channel to ensure we have the display name
      if (info) {
        try {
          await fetch("/api/streamers/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: trimmed, displayName: info.displayName }),
          });
          // Refresh history after adding new streamer
          fetchStreamerHistory();
        } catch (err) {
          console.error("Failed to save streamer to DB:", err);
        }
      }

      // Send join command over WebSocket
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "join", channel: trimmed }));
      } else {
        setInputError(
          "Not connected to server yet. Please wait and try again.",
        );
      }
    },
    [clearMessages],
  );

  const leaveChannel = useCallback(() => {
    setStreamerInfo(null);

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      // leave the channel
      wsRef.current.send(JSON.stringify({ type: "leave" }));
    }
  }, [clearMessages]);

  return {
    messages,
    status,
    currentChannel,
    streamerInfo,
    inputError,
    joinChannel,
    leaveChannel,
    clearMessages,
    streamerHistory,
  };
};
