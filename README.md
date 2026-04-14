# Twitch Live Chat Viewer

A full-stack web app that streams Twitch live chat in real-time. Built to learn WebSockets, REST APIs, and full-stack development.

**Built with:** Node.js, Express, TypeScript, React, WebSockets, Tailwind CSS

---

## Quick Start

### 1. Clone and Install Dependencies

```bash
cd twitch-chat-app

# Option A: One command (requires npm install of root package)
npm install
npm run install:all

# Option B: Install separately
npm install --prefix backend
npm install --prefix frontend
```

### 2. Get Twitch API Credentials

1. Go to [dev.twitch.tv/console](https://dev.twitch.tv/console)
2. Click **Register Your Application**
3. Choose a name (e.g., "Twitch Chat Viewer")
4. Set **OAuth Redirect URL** to `http://localhost`
5. Category: choose any (e.g., "Website Integration")
6. Copy your **Client ID**
7. Click **Generate** next to Client Secret and copy it

### 3. Create Backend Config

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` and fill in:
```
TWITCH_CLIENT_ID=your_client_id_here
TWITCH_CLIENT_SECRET=your_client_secret_here
PORT=3001
```

### 4. Start Both Servers

```bash
npm run dev
```

This starts:
- **Backend**: http://localhost:3001 (REST API + WebSocket)
- **Frontend**: http://localhost:5173 (Vite dev server)

Open your browser to **http://localhost:5173**

---

## How to Use

1. **Enter a streamer name** (e.g., "pokimane", "xqc", "ninja")
2. **Click "Watch"**
3. See live chat appear in real-time
4. **Scroll up** to read history (auto-scroll pauses)
5. **Enter another streamer** to switch channels

---

## Architecture Overview

**See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed explanation.**

### The Three Parts

```
Browser (React + WebSocket)
     ↓ REST /api/streams (validate streamer)
     ↓ WebSocket (real-time chat)
     
Backend (Node.js + Express)
     ↓ Twitch Helix API (check if live)
     ↓ Twitch IRC (get chat messages)
     
Twitch Servers
```

### Message Flow (Step by Step)

1. **User clicks "Watch pokimane"**
2. **Frontend**: REST call validates streamer exists
3. **Backend**: Queries Twitch API, returns `{ isLive: true, ... }`
4. **Frontend**: Shows "LIVE" badge, sends WebSocket `{ type: 'join', channel: 'pokimane' }`
5. **Backend**: tmi.js connects to Twitch IRC, joins #pokimane
6. **Twitch**: Starts sending us chat messages via IRC
7. **Backend**: Receives each message, broadcasts to ALL connected browsers
8. **Browser**: Receives via WebSocket, adds to message list
9. **React**: Re-renders, new message appears on screen

**Total latency**: <100ms from when Twitch sent it to when you see it.

---

## WebSocket Basics

### What is a WebSocket?

**HTTP (request-response):**
```
Browser: "GET /data"
Server: "Here's your data"
(connection closes)
Browser must request again for new data
```

**WebSocket (persistent, push):**
```
Browser: Opens connection to server
Server: Sends data anytime (no request needed)
Browser: Sends commands anytime
(connection stays open continuously)
```

### In This Project

- **Browser → Server**: `{ type: 'join', channel: 'pokimane' }` (user wants to switch channels)
- **Server → Browser**: `{ type: 'chat', data: ChatMessage }` (new message from Twitch)
- **Server → Browser**: `{ type: 'history', data: [ChatMessage, ...] }` (recent messages)
- **Server → Browser**: `{ type: 'status', data: { ... } }` (joined/error status)

The connection stays open indefinitely. When a new chat message arrives at the backend, it's pushed to all browsers instantly.

---

## Project Structure

```
twitch-chat-app/
├── backend/                    # Node.js + Express + WebSocket
│   ├── src/
│   │   ├── index.ts            # Entry point: wires Express + WS + IRC
│   │   ├── config.ts           # Loads .env variables
│   │   ├── types.ts            # TypeScript types (ChatMessage, WSPayload)
│   │   ├── twitchAuth.ts       # Twitch API authentication
│   │   ├── twitchIRC.ts        # tmi.js wrapper for Twitch chat
│   │   ├── wsServer.ts         # WebSocket server logic
│   │   ├── chatStore.ts        # In-memory message buffer
│   │   └── routes/
│   │       └── streams.ts      # GET /api/streams endpoint
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/                   # React + TypeScript + Tailwind
│   ├── src/
│   │   ├── main.tsx            # React entry point
│   │   ├── App.tsx             # Root component
│   │   ├── types.ts            # TypeScript types (mirrors backend)
│   │   ├── index.css           # Tailwind + custom styles
│   │   ├── hooks/
│   │   │   └── useChat.ts      # WebSocket hook (all the logic)
│   │   └── components/
│   │       ├── StreamerInput.tsx    # Input form + REST call
│   │       ├── StatusBadge.tsx      # LIVE badge + streamer info
│   │       ├── ChatFeed.tsx         # Message list + auto-scroll
│   │       └── ChatMessage.tsx      # Single message row
│   ├── index.html
│   ├── vite.config.ts
│   └── tsconfig.json
│
├── package.json                # Root (concurrently for npm run dev)
├── ARCHITECTURE.md             # Detailed architecture explanation
└── COMPONENT_COMMENTS.md       # React component code comments
```

---

## File Purposes

### Backend Files

| File | Purpose |
|------|---------|
| `index.ts` | Starts HTTP + WebSocket server, wires everything together |
| `twitchIRC.ts` | Connects to Twitch IRC, joins channels, parses messages |
| `wsServer.ts` | WebSocket server that broadcasts messages to browsers |
| `chatStore.ts` | Stores recent messages (last 500) in memory |
| `twitchAuth.ts` | Gets + caches Twitch API authentication token |
| `routes/streams.ts` | REST endpoint: `GET /api/streams?login=pokimane` |

### Frontend Files

| File | Purpose |
|------|---------|
| `App.tsx` | Root component, uses useChat hook, renders layout |
| `useChat.ts` | Custom hook: WebSocket connection + message state |
| `StreamerInput.tsx` | Input form, validates, calls REST API |
| `StatusBadge.tsx` | Shows LIVE/Offline + viewer count |
| `ChatFeed.tsx` | Scrollable message container, auto-scroll logic |
| `ChatMessage.tsx` | Single message: username, badges, text, timestamp |

---

## Key Concepts

### 1. REST for Validation, WebSocket for Real-Time

- **REST `/api/streams`**: Validates streamer exists, gets user info
- **WebSocket**: Streams real-time chat (100x more efficient than polling)

### 2. One Connection, Multiple Browsers

When one browser joins a channel via WebSocket:
```
Browser A: "Join #pokimane"
  → Backend joins Twitch IRC #pokimane
  → starts receiving Twitch messages
  ↓
Browser B: Opens (also connects via WebSocket)
  → Backend sends it current channel + recent messages
  → Both browsers get new messages simultaneously
```

### 3. useRef for WebSocket

The WebSocket connection changes over time (reconnects). Using React's `useRef` (not `useState`) prevents stale closures in event handlers.

### 4. Message Capping for Performance

Messages capped at 200 in DOM (MAX_MESSAGES). Without this, scrolling gets slow with thousands of messages. Old messages stay in `chatStore` (500 max) but don't render.

### 5. Exponential Backoff for Reconnection

If connection drops:
- Wait 1 second, try again
- Wait 2 seconds, try again
- Wait 4 seconds, try again
- ... up to 30 seconds max

This prevents hammering the server if it's down.

---

## Learning Notes

### For Frontend Developers

This project teaches:
- **WebSocket API**: `new WebSocket()`, `.onmessage`, `.send()`
- **React hooks**: `useState`, `useEffect`, `useRef`, `useCallback`
- **State management**: Lifting state, passing props, custom hooks
- **Async handling**: REST calls, reconnection logic, error handling
- **You don't need Redux**: For this scale of app, React hooks are enough

### For Backend Developers

This project teaches:
- **Express + TypeScript**: Building REST APIs
- **WebSocket server**: Broadcasting messages, handling connections
- **Real-time patterns**: Pub/sub, broadcast, channel subscription
- **Integration**: Connecting to external APIs (Twitch)
- **Protocol**: IRC (Twitch chat protocol), HTTP, WebSocket

### WebSocket Deep Dive

See **[ARCHITECTURE.md](./ARCHITECTURE.md)** for:
- How WebSocket differs from HTTP
- Message envelope pattern
- Broadcast pattern
- Reconnection logic
- Complete data flow diagrams

---

## Common Issues

### "Backend not running?"
- Check: `curl http://localhost:3001/health`
- Should return `{ ok: true }`
- If not, backend didn't start. Check console for errors.

### "Twitch API error?"
- Check your `.env`: TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET
- Go to dev.twitch.tv/console to verify they're correct
- Client Secret must match exactly (spaces matter)

### "No messages appearing?"
- Check browser console (F12 → Console tab)
- Look for error messages
- Verify streamer is currently live (not offline)
- Try reloading the page

### "Auto-scroll is jumpy?"
- This is intentional: scroll up to read history, it stops auto-scrolling
- Click "Live chat" button to resume
- Adjust `SCROLL_THRESHOLD` in `ChatFeed.tsx` if needed

---

## Future Enhancements

### Phase 2: LLM Integration
As mentioned in the plan, we can add:
- Textbox: "Summarize this chat's vibe"
- Backend: `POST /api/analyze` with last 500 messages
- Response: LLM analysis of chat sentiment/topics

The architecture is ready for this (chatStore.getRecent(500)).

### Phase 3: Official Twitch API
- Replace tmi.js with Twitch EventSub
- Requires user OAuth login
- More reliable long-term

### Phase 4: More Features
- Save chat logs to disk
- Screenshot messages
- Chat moderation (hide spam)
- Notifications (badges, followers)

---

## Resources

- **Twitch Docs**: https://dev.twitch.tv/docs
- **tmi.js**: https://github.com/tmijs/tmi.js
- **WebSocket**: https://developer.mozilla.org/en-US/docs/Web/API/WebSocket
- **Express**: https://expressjs.com
- **React Hooks**: https://react.dev/reference/react

---

## Questions?

Refer to:
1. **[ARCHITECTURE.md](./ARCHITECTURE.md)** — How it all works together
2. **[COMPONENT_COMMENTS.md](./COMPONENT_COMMENTS.md)** — Component-specific notes
3. Code comments throughout (added to each file)

The code is heavily commented. Read the comments!
