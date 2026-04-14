# WebSocket Flow — Quick Visual Guide

## What is a WebSocket?

```
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║  HTTP (Request-Response)                                 ║
║  ─────────────────────────                              ║
║                                                          ║
║  Browser: "GET /data?"  ──────→  Server                ║
║  Browser: ←──── "Here's your data"                      ║
║  (Connection closes)                                    ║
║                                                          ║
║  Browser: "GET /data again?"  ──────→  Server          ║
║  Browser: ←──── "Here's fresh data"                     ║
║  (Connection closes)                                    ║
║                                                          ║
║  → Wasteful: must ask repeatedly                        ║
║  → Slow: delay waiting for response                     ║
║  → Good for: one-time requests (forms, page loads)      ║
║                                                          ║
╚════════════════════════════════════════════════════════════╝

╔════════════════════════════════════════════════════════════╗
║                                                            ║
║  WebSocket (Persistent Push)                            ║
║  ────────────────────────────                           ║
║                                                          ║
║  Browser: Opens connection (like phone call)           ║
║  Browser ←──────→ Server (connection stays open)       ║
║                                                          ║
║  Server: "New message!" (push, no request needed)      ║
║  Server: "User joined!" (push, no request needed)      ║
║  Server: "Stream ended!" (push, no request needed)     ║
║                                                          ║
║  Browser: "Switch to #pokimane" (send anytime)        ║
║  Server: "Joined #pokimane" (respond anytime)         ║
║                                                          ║
║  → Efficient: only send when there's data              ║
║  → Fast: no request round-trip delay                  ║
║  → Good for: real-time apps (chat, notifications)     ║
║                                                          ║
╚════════════════════════════════════════════════════════════╝
```

---

## This Project: The Message Flow

### Step 1: Browser Opens WebSocket

```javascript
// Frontend: useChat.ts
const ws = new WebSocket('ws://localhost:3001');

ws.onopen = () => {
  console.log('[ws] Connected');
  // Connection is now open and ready
};
```

```javascript
// Backend: wsServer.ts
wss.on('connection', (ws) => {
  console.log('[ws] Client connected');
  // Send current state to this new client
  send(ws, { type: 'status', data: { channel: 'pokimane', event: 'joined' }});
  send(ws, { type: 'history', data: [last 50 messages] });
});
```

**At this point**: Connection is open, browser knows what channel we're watching.

---

### Step 2: User Enters Streamer Name and Clicks "Watch"

```
User types "pokimane" → Clicks "Watch"
  ↓
Frontend (StreamerInput.tsx):
  - onSubmit calls joinChannel('pokimane')
  ↓
Frontend (useChat.ts - joinChannel function):
  - Validate: "pokimane" is valid format ✓
  - REST call: GET /api/streams?login=pokimane
  ↓
Backend (routes/streams.ts):
  - Query Twitch Helix API
  - Return: { isLive: true, displayName: "Pokimane", viewerCount: 14200, title: "chill stream" }
  ↓
Frontend (useChat.ts - received REST response):
  - Save to state: setStreamerInfo(info)
  - Show "LIVE 14.2K" badge
  - THEN send WebSocket message...
```

---

### Step 3: Browser Sends Join Command Over WebSocket

```javascript
// Frontend: useChat.ts
ws.send(JSON.stringify({ type: 'join', channel: 'pokimane' }));
```

This travels over the open WebSocket connection to the backend.

---

### Step 4: Backend Receives Join Command

```javascript
// Backend: wsServer.ts
ws.on('message', async (raw) => {
  const command = JSON.parse(raw.toString());
  
  if (command.type === 'join') {
    console.log(`[ws] Join request for #${command.channel}`);
    
    // Tell tmi.js to switch channels
    await twitchClient.joinChannel(command.channel);
    
    // Tell ALL connected browsers we switched
    broadcast(wss, {
      type: 'status',
      data: { channel: command.channel, event: 'joined' }
    });
  }
});
```

---

### Step 5: Backend Joins Twitch IRC Channel

```javascript
// Backend: twitchIRC.ts
async joinChannel(login: string) {
  await this.client.join(`#${login}`);  // tmi.js sends IRC JOIN to Twitch
  console.log(`[irc] Joined #${login}`);
}
```

This tells the tmi.js library to connect to #pokimane on Twitch IRC.

---

### Step 6: Twitch Starts Sending Messages

```
Twitch IRC Server receives our JOIN command
  ↓
Twitch confirms: we're now listening to #pokimane
  ↓
Twitch: "pokimane sent: hey everyone!"
Twitch: "xqc_fan sent: I love this stream!"
Twitch: "coolest_mod sent: no spam please"
... (dozens per second)
  ↓
All sent to our backend via the IRC connection
```

---

### Step 7: Backend Receives Twitch Messages

```javascript
// Backend: twitchIRC.ts
this.client.on('message', (_channel, tags, text, self) => {
  const msg: ChatMessage = {
    id: tags['id'],
    channel: _channel.replace('#', ''),
    username: tags['display-name'],
    color: tags.color,
    text: text,
    timestamp: Date.now(),
    badges: tags.badges
  };
  
  this.onMessage(msg);  // Call the callback
});
```

The callback was defined in index.ts:

```javascript
const twitchClient = new TwitchIRCClient((msg) => {
  chatStore.push(msg);  // Save in memory buffer
  broadcast(wss, { type: 'chat', data: msg });  // Send to all browsers
});
```

---

### Step 8: Backend Broadcasts to All Connected Browsers

```javascript
// Backend: wsServer.ts
export function broadcast(wss: WebSocketServer, payload: WSPayload): void {
  const message = JSON.stringify(payload);
  
  // Send to EVERY connected browser client
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);  // Send immediately, no request needed
    }
  });
}
```

This happens in milliseconds. As soon as the backend receives a Twitch message, it's sent to all browsers.

---

### Step 9: Browser Receives Message Over WebSocket

```javascript
// Frontend: useChat.ts
ws.onmessage = (event) => {
  const payload = JSON.parse(event.data);
  
  if (payload.type === 'chat') {
    // New message from Twitch!
    setMessages((prev) => {
      const next = [...prev, payload.data];
      return next.length > MAX_MESSAGES ? next.slice(-MAX_MESSAGES) : next;
    });
    // React re-renders immediately
  }
};
```

The `setMessages` call triggers React to re-render the ChatFeed component.

---

### Step 10: React Renders the Message

```javascript
// Frontend: ChatFeed.tsx renders inside the message list
messages.map((msg) => <ChatMessage key={msg.id} message={msg} />)

// ChatMessage.tsx displays:
// [Sub] pokimane: hey everyone!
```

AutoScroll logic: if user hasn't scrolled up, scroll to the new message.

---

## Complete Timeline (From Click to Screen)

```
0ms:    User clicks "Watch"
10ms:   Frontend validates input
20ms:   REST call sent to backend
50ms:   Backend queries Twitch API
100ms:  Frontend receives response
110ms:  Frontend shows "LIVE 14.2K" badge
120ms:  Frontend sends WebSocket join command
130ms:  Backend receives join command
140ms:  Backend tells tmi.js to join #pokimane
150ms:  tmi.js connects to Twitch IRC
180ms:  Twitch confirms we're in the channel
200ms:  Twitch sends first chat message: "hey everyone!"
210ms:  Backend receives message
220ms:  Backend broadcasts to all browsers
230ms:  Browser receives message
240ms:  React re-renders ChatFeed
250ms:  Screen updates with message

----
        Total: ~250ms (user to screen)
        Feel: Instant, no lag
```

---

## Key Points

### 1. The Connection is Persistent
```
Connection opens: ─────────────────────────────────────────
                  Many messages flow here  ↓  ↓  ↓  ↓  ↓
                  No new connections needed
User closes tab:  ─────────────────────────────────────────(close)
```

### 2. The Connection is Bidirectional
```
Browser: "Join #pokimane" ──────→ Backend
Browser: ←──── "Status: joined"
Browser: ←──── "Message: hey everyone!"
Browser: ←──── "Message: nice stream!"
Browser: "Join #xqc" ──────→ Backend
Browser: ←──── "Status: left pokimane"
Browser: ←──── "Status: joined xqc"
```

### 3. Messages are JSON
```
Browser sends:    { "type": "join", "channel": "pokimane" }
Backend sends:    { "type": "chat", "data": { "username": "...", "text": "..." } }
Backend sends:    { "type": "history", "data": [...] }
Backend sends:    { "type": "status", "data": { "event": "joined", ... } }
```

### 4. Broadcast Means "Send to All"
```
Twitch → Backend receives message
  ↓
broadcast(wss, message)
  ├─ Send to Browser A
  ├─ Send to Browser B
  ├─ Send to Browser C
  └─ Send to Browser D
  
All 4 browsers show the message simultaneously
```

### 5. REST + WebSocket Division
```
REST (/api/streams):
  ✓ Validates user input
  ✓ Checks if streamer exists
  ✓ One-time request-response
  
WebSocket:
  ✓ Streams messages in real-time
  ✓ No request needed
  ✓ Push-based, not pull-based
  
Together:
  = Efficient validation + fast streaming
```

---

## Debugging Tips

### Check Browser Console (F12)
```javascript
// You'll see logs like:
[ws] Connected
[ws] Received chat message: "hey everyone!"
```

### Check Backend Console
```javascript
// You'll see logs like:
[server] Backend running at http://localhost:3001
[irc] Connected to irc-ws.chat.twitch.tv:443
[irc] Joined #pokimane
[ws] Client connected
[ws] Join request for #pokimane
[irc] User cooldude: nice stream!
```

### Check Network Tab (F12 → Network)
```
Look for the WebSocket connection:
- Filter by "WS"
- See the persistent connection to ws://localhost:3001
- Click it to see messages being sent/received
```

### Test Manually with wscat
```bash
# Install: npm install -g wscat
wscat -c ws://localhost:3001

# Then type:
> {"type":"join","channel":"pokimane"}

# You'll receive messages like:
< {"type":"status","data":{"channel":"pokimane","event":"joined"}}
< {"type":"chat","data":{"username":"cooldude","text":"hey!",...}}
```

---

## Summary

1. **Browser opens WebSocket connection** (stays open)
2. **User enters streamer name** (REST validates)
3. **Browser sends join command over WebSocket**
4. **Backend joins Twitch IRC channel**
5. **Twitch sends messages to backend**
6. **Backend broadcasts to ALL browser clients**
7. **Browsers receive and display instantly**

The whole flow is real-time, bidirectional, and efficient. This is why WebSockets are used for chat, notifications, dashboards, and multiplayer games.
