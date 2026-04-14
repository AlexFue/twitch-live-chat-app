# Twitch Live Chat App — Complete Guide

## Project Overview

This is a full-stack application that streams Twitch live chat in real-time to a web page. It demonstrates:
- **Backend skills**: REST APIs, WebSockets, real-time message broadcasting
- **Frontend skills**: React hooks, state management, real-time UI updates
- **WebSocket architecture**: Persistent connections, bidirectional communication

---

## File-by-File Explanation

### **Backend Files**

#### `backend/src/index.ts` — Main Entry Point
**What it does:**
- Starts the HTTP server that handles both REST and WebSocket connections
- Connects to Twitch IRC servers
- Wires everything together

**Key parts:**
1. **Express app**: HTTP server for REST calls (`GET /api/streams`)
2. **HTTP server**: Shared by both Express and WebSocket
3. **Twitch IRC client**: Listens for messages from Twitch
4. **WebSocket server**: Relays Twitch messages to all browser clients

---

#### `backend/src/twitchIRC.ts` — Twitch Chat Connection
**What it does:**
- Wraps `tmi.js` library for connecting to Twitch IRC
- Joins/leaves Twitch chat channels
- Parses chat messages and sends them to the backend

**Key concepts:**
- **tmi.js**: A JavaScript library that handles Twitch IRC protocol
- **IRC**: Internet Relay Chat — Twitch's chat protocol
- **Anonymous connection**: Using "justinfan" username (Twitch allows this for read-only)
- **One channel at a time**: Only connects to one Twitch streamer's chat at a time

**Example flow:**
```
Backend calls twitchClient.joinChannel('pokimane')
  → tmi.js connects to Twitch IRC
  → Twitch starts sending messages from #pokimane to us
  → tmi.js 'message' event fires for each message
  → We parse it and send to backend callback
  → Backend broadcasts to all browser clients
```

---

#### `backend/src/wsServer.ts` — WebSocket Server
**What it does:**
- Accepts WebSocket connections from browsers
- Receives `join` commands from browsers
- Broadcasts Twitch chat messages to all connected browsers
- Maintains the persistent connection

**Key WebSocket concepts:**
- **Persistent connection**: Unlike HTTP (request → response → close), WebSocket stays open
- **Bidirectional**: Both browser and server can send messages anytime
- **Real-time**: No polling needed — server pushes data immediately
- **Broadcast**: When a Twitch message arrives, we send it to ALL connected browsers instantly

**Message types sent to browser:**
1. **`chat`**: A new message from Twitch chat
2. **`history`**: Recent messages (when browser joins a channel)
3. **`status`**: Channel joined/left/error events

**Message types received from browser:**
1. **`join`**: Browser asks to switch to a different Twitch channel

---

#### `backend/src/chatStore.ts` — Message Buffer
**What it does:**
- Stores the last 500 chat messages in memory
- Provides recent messages to new WebSocket connections
- Clears when switching channels

**Why it's important:**
- When a new browser connects, we send them historical context (last 50 messages)
- Ring buffer: keeps memory usage bounded (max 500 messages)
- Future: for LLM integration, we'll use `getRecent(500)` to provide context

---

#### `backend/src/twitchAuth.ts` — Twitch API Authentication
**What it does:**
- Fetches an App Access Token from Twitch
- Caches the token so we don't request it every time
- Refreshes if it expires

**Why it's needed:**
- REST endpoint `/api/streams` calls Twitch Helix API
- Helix API requires authentication
- We use "app access token" (client credentials flow) — no user login needed

---

#### `backend/src/routes/streams.ts` — GET /api/streams
**What it does:**
- Validates a streamer name
- Checks if they're live using Twitch Helix API
- Returns `{ isLive, displayName, viewerCount, title }`

**Error handling:**
- 404 if streamer doesn't exist
- 200 with `isLive: false` if they exist but are offline
- 200 with `isLive: true` if they're live

**Frontend uses this to:**
- Show a "Live" badge with viewer count
- Show "Offline" if not streaming
- Show an error if the name is invalid

---

### **Frontend Files**

#### `frontend/src/hooks/useChat.ts` — WebSocket Logic
**What it does:**
- Establishes WebSocket connection on mount
- Listens for incoming messages from backend
- Sends commands to backend (join channel)
- Manages reconnection with exponential backoff
- Holds all chat and connection state

**State managed:**
- `messages`: Array of ChatMessage objects
- `status`: 'connecting' | 'connected' | 'disconnected'
- `currentChannel`: Which Twitch channel we're watching
- `inputError`: Error messages for the UI

**Why use `useRef` for WebSocket:**
- The WebSocket changes over time (reconnects, new instance)
- `useRef` persists the latest reference across re-renders
- This prevents stale closures in event handlers
- Unlike `useState`, changing a `useRef` doesn't trigger a re-render

**Reconnection logic:**
- If connection drops, waits 1 second, then reconnects
- Each fail doubles the wait time (1s → 2s → 4s → ... → max 30s)
- This avoids hammering the server if it's down

**Message flow example (user types "pokimane"):**
```
1. User types "pokimane" and clicks "Watch"
2. Frontend calls REST `/api/streams?login=pokimane`
3. Backend returns { isLive: true, displayName: "Pokimane", viewerCount: 14200 }
4. Frontend updates status badge (shows "LIVE 14.2K viewers")
5. Frontend sends { type: 'join', channel: 'pokimane' } over WebSocket
6. Backend receives join command
7. Backend tells tmi.js to join Twitch IRC #pokimane channel
8. Twitch IRC starts sending messages
9. Backend pushes each message to all WebSocket clients
10. Frontend's ws.onmessage fires
11. Frontend sets messages state
12. React re-renders ChatFeed with new messages
```

---

#### `frontend/src/components/StreamerInput.tsx` — Input Form
**What it does:**
- Text input for streamer name
- Submit button to call `joinChannel()`
- Shows loading spinner while requesting
- Shows error messages

**User flow:**
```
User types "pokimane" → clicks "Watch"
  → Input disables, spinner shows
  → REST call validates
    → If error: shows message, input re-enables, user can retry
    → If success: WebSocket join sent, status badge updates
```

---

#### `frontend/src/components/StatusBadge.tsx` — Status Indicator
**What it does:**
- Shows "LIVE" with viewer count (if live)
- Shows "Offline" (if not streaming)
- Shows "Connecting..." (while WebSocket is connecting)
- Displays streamer name and title

**States:**
- **Connecting**: Animated yellow dot + "Connecting to server..."
- **Live**: Red pulsing dot + "LIVE" + viewer count
- **Offline**: Gray dot + "Offline" + "chat may be quiet"

---

#### `frontend/src/components/ChatFeed.tsx` — Message List
**What it does:**
- Displays all messages in a scrollable container
- Auto-scrolls to bottom when new messages arrive
- Pauses auto-scroll if user scrolls up (to read older messages)
- Shows "Scroll to live chat" button when paused

**Smart scroll logic:**
```
if user hasn't scrolled up (or is within 80px of bottom) {
  → Auto-scroll to bottom on new messages
} else if user scrolled up {
  → Pause auto-scroll so they can read
  → Show "Scroll to live chat" button
  → Button re-enables auto-scroll when clicked
}
```

This prevents annoying auto-scrolling when you're reading history.

---

#### `frontend/src/components/ChatMessage.tsx` — Single Message
**What it does:**
- Renders one chat message with:
  - Username in Twitch color
  - Badges (broadcaster, moderator, subscriber, etc.)
  - Message text
  - Timestamp (shown on hover)

**Badge display:**
- Broadcaster: Red badge
- Moderator: Green badge
- Subscriber: Indigo badge
- Others: different colors

**Username color:**
- Uses the color provided by Twitch (each user sets their own)
- Falls back to gray if not set

---

#### `frontend/src/App.tsx` — Root Component
**What it does:**
- Uses the `useChat` hook
- Passes data to child components
- Provides the overall layout

**Component tree:**
```
App
├── Header
│   ├── Twitch logo
│   ├── StreamerInput (input form)
│   └── StatusBadge (live indicator)
└── Main
    └── ChatFeed (message list)
        └── ChatMessage (for each message)
```

---

## How WebSockets Work in This Project

### **What is a WebSocket?**

**HTTP (traditional):**
```
Browser: "GET /data"
Server: "Here's your data"
Connection closes
Browser: "GET /data again" (new request needed)
```

**WebSocket (real-time):**
```
Browser: Opens persistent connection (like a phone call)
Server: Can send data anytime (no request needed)
Browser: Can send data anytime
Both: Connection stays open continuously
```

### **The WebSocket Connection Lifecycle**

**1. Browser connects:**
```javascript
const ws = new WebSocket('ws://localhost:3001');
```
This opens a TCP connection to the backend.

**2. Backend accepts:**
```javascript
wss.on('connection', (ws) => {
  console.log('[ws] Client connected');
  // Send current state to browser
  send(ws, { type: 'status', data: { channel: 'pokimane', event: 'joined' }});
  send(ws, { type: 'history', data: [...last 50 messages...] });
});
```

**3. Browser listens for messages:**
```javascript
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  // Handle { type: 'chat', data: ChatMessage }
  setMessages(prev => [...prev, message.data]);
};
```

**4. Browser sends commands:**
```javascript
ws.send(JSON.stringify({ type: 'join', channel: 'pokimane' }));
```

**5. Backend receives and reacts:**
```javascript
ws.on('message', (raw) => {
  const command = JSON.parse(raw.toString());
  if (command.type === 'join') {
    // Switch to new channel
    await twitchClient.joinChannel(command.channel);
    // Broadcast to ALL clients
    broadcast(wss, { type: 'status', data: { ... } });
  }
});
```

**6. Real-time message flow:**
```
Twitch IRC sends chat message
  ↓
tmi.js 'message' event fires
  ↓
Callback pushes to chatStore
  ↓
broadcast() sends to all WebSocket clients
  ↓
All browsers' ws.onmessage fire simultaneously
  ↓
All browsers show the new message (in <100ms)
```

### **Why WebSocket Instead of REST Polling?**

**REST Polling (wasteful):**
```
Browser: "GET /messages"
Browser: "GET /messages"  (1 second later)
Browser: "GET /messages"  (1 second later)
... (100x per second if fast)
Most requests return "no new messages"
Lots of wasted bandwidth and CPU
```

**WebSocket (efficient):**
```
Browser ←→ Server (open connection)
Server: "New message!" (pushes immediately)
Server: "New message!" (pushes immediately)
... (only when there's actual data)
No wasted requests
Real-time (no delay)
```

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                          BROWSER (Frontend)                      │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ App Component                                            │   │
│  │  ├─ useChat() hook                                       │   │
│  │  │  ├─ WebSocket connection (ws://localhost:3001)        │   │
│  │  │  ├─ messages state                                    │   │
│  │  │  └─ joinChannel() function                            │   │
│  │  │                                                       │   │
│  │  ├─ StreamerInput (RESTcall to /api/streams)            │   │
│  │  ├─ StatusBadge (isLive, viewerCount)                   │   │
│  │  └─ ChatFeed (renders messages)                         │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                          │
                          ↓ REST /api/streams
                    (validate streamer)
                          │
                          ↓ WebSocket { type: 'join', channel: 'X' }
                    (switch channels)
                          │
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND (Node.js + Express)                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ index.ts (Main Server)                                  │   │
│  │  ├─ wsServer.ts (WebSocket connections)                │   │
│  │  │  ├─ On browser 'join' command                        │   │
│  │  │  │  └─ Call twitchClient.joinChannel()             │   │
│  │  │  │                                                  │   │
│  │  │  └─ On broadcast(message)                          │   │
│  │  │     └─ Send to ALL connected browsers             │   │
│  │  │                                                    │   │
│  │  ├─ twitchIRC.ts (Twitch IRC connection)             │   │
│  │  │  ├─ Connect to wss://irc-ws.chat.twitch.tv        │   │
│  │  │  ├─ Join #channel (e.g., #pokimane)              │   │
│  │  │  └─ On 'message' event from Twitch IRC           │   │
│  │  │     ├─ Parse message                             │   │
│  │  │     ├─ Push to chatStore                         │   │
│  │  │     └─ Callback(message)                         │   │
│  │  │        └─ broadcast() to browsers               │   │
│  │  │                                                 │   │
│  │  ├─ routes/streams.ts (GET /api/streams)          │   │
│  │  │  └─ Call Twitch Helix API (isLive, viewers)   │   │
│  │  │                                                │   │
│  │  ├─ chatStore.ts (Message buffer)                │   │
│  │  │  └─ Ring buffer of last 500 messages         │   │
│  │  │                                               │   │
│  │  └─ twitchAuth.ts (Token cache)                  │   │
│  │     └─ Helix API authentication                 │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                          │
                          ↓ Twitch IRC Protocol
                   (wss://irc-ws.chat.twitch.tv)
                          │
┌─────────────────────────────────────────────────────────────────┐
│                    TWITCH SERVICES                               │
│  ├─ IRC Server (chat messages from streamers)                   │
│  └─ Helix API (streamer info, viewer count)                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Example Interaction

### **User Action: Clicks "Watch" button for "pokimane"**

```
1. Browser (React):
   - onSubmit handler calls joinChannel('pokimane')

2. Frontend (useChat.ts):
   - Validate input: "pokimane" is valid
   - REST call: GET /api/streams?login=pokimane
   - Set loading state, disable button

3. Backend (routes/streams.ts):
   - Query Twitch Helix API for user "pokimane"
   - Query Twitch Helix API for stream status
   - Return: { isLive: true, displayName: "Pokimane", viewerCount: 14200, title: "chill stream" }

4. Frontend (useChat.ts):
   - Receive REST response
   - Save to streamerInfo state
   - Send WebSocket: { type: 'join', channel: 'pokimane' }

5. Backend (wsServer.ts):
   - Receive join command from browser
   - Clear chatStore
   - Call twitchClient.joinChannel('pokimane')

6. Backend (twitchIRC.ts):
   - Leave current channel (if any)
   - Tell tmi.js to join #pokimane on Twitch IRC
   - tmi.js sends IRC JOIN command to Twitch servers

7. Twitch:
   - Confirms we're now watching #pokimane
   - Starts sending us chat messages

8. Backend (twitchIRC.ts onmessage handler):
   - Receives: "cooldude: nice stream!"
   - Parse into ChatMessage object
   - Call callback(message)

9. Backend (index.ts callback):
   - chatStore.push(message) [save in buffer]
   - broadcast(wss, { type: 'chat', data: message })

10. Backend (wsServer.ts broadcast):
    - Send JSON message to all connected WebSocket clients
    - { "type": "chat", "data": { "username": "cooldude", "text": "nice stream!", ... } }

11. Frontend (useChat.ts onmessage):
    - Receive message
    - setMessages(prev => [...prev, message])
    - React re-renders

12. Frontend (ChatFeed, ChatMessage):
    - New message appears on screen
    - If autoscroll enabled, scroll to bottom
    - Display username in Twitch color, message text

13. Browser display:
    ✓ Streamer name and "LIVE 14.2K" badge
    ✓ Chat message from cooldude appears immediately
```

All of this happens in milliseconds—the message appears on screen in <100ms from when Twitch sent it.

---

## Key Takeaways

1. **WebSockets enable real-time**: Backend pushes changes immediately, no polling needed
2. **Separation of concerns**: REST validates, WebSocket does real-time
3. **Broadcast pattern**: When one backend event happens, all browsers get updated simultaneously
4. **Persistent connection**: WebSocket stays open, reducing latency vs. repeated HTTP requests
5. **Message buffering**: Recent history is cached so new connections have context

This architecture is the foundation for real-time apps: chat, notifications, live dashboards, multiplayer games, etc.
