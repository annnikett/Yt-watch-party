# Watch Party

Watch YouTube videos in sync with friends. One person hosts, everyone else's
player follows along in real time — play, pause, seek, and video changes all
broadcast instantly over WebSockets.

**Live demo:** _add your deployed URL here after deploying, e.g._
`https://yt-watch-party-client.onrender.com/`

## Stack

| Layer     | Tech                                  |
|-----------|----------------------------------------|
| Frontend  | React + Vite, `react-router-dom`       |
| Backend   | Node.js + Express                      |
| Realtime  | Socket.IO                              |
| Video     | YouTube IFrame Player API              |
| State     | In-memory (per server process)         |

No database is required for the MVP — rooms live in memory and disappear
when the last participant leaves. See [Persistence](#persistence-bonus) for
how to add one.

## Project layout

```
watch-party/
├── server/                 # Express + Socket.IO backend
│   └── src/
│       ├── index.js        # app entry: HTTP server + Socket.IO wiring
│       ├── routes/rooms.js # REST: create room, look up room
│       ├── rooms/
│       │   ├── Room.js         # per-room state + broadcast helpers
│       │   ├── Participant.js  # role model (host/moderator/participant)
│       │   └── RoomManager.js  # in-memory registry of all rooms
│       ├── socket/socketHandlers.js  # MessageHandler: binds all socket events
│       └── utils/permissions.js      # RBAC checks
└── client/                 # React + Vite frontend
    └── src/
        ├── pages/Home.jsx  # create / join a room
        ├── pages/Room.jsx  # the watch party itself
        ├── components/
        │   ├── YouTubePlayer.jsx   # IFrame API wrapper (imperative ref)
        │   ├── ParticipantList.jsx # roster + host controls
        │   ├── ChangeVideoBar.jsx  # paste a link to change video
        │   └── Chat.jsx            # bonus text chat
        └── socket.js        # shared Socket.IO client instance
```

## Running locally

Requires Node 18+.

```bash
# 1. Backend
cd server
cp .env.example .env
npm install
npm run dev          # http://localhost:4000

# 2. Frontend (separate terminal)
cd client
cp .env.example .env
npm install
npm run dev           # http://localhost:5173
```

Open `http://localhost:5173` in two browser windows (or two browsers) to
try a party with yourself: create a room in one tab, copy the room code,
join from the other.

## Architecture overview

**Room creation** goes through a small REST endpoint (`POST /api/rooms`)
that just allocates a 6-character room code and an in-memory `Room` object —
no socket needed yet, since the creator hasn't connected.

**Joining** happens over a socket: the client connects, then emits
`join_room { roomId, username }`. The server looks up the `Room`, decides
the role (first person in becomes **Host**, everyone else becomes
**Participant**), joins the underlying Socket.IO room (`socket.join(roomId)`),
and sends the joining client its full state back (`joined` event) while
broadcasting `user_joined` to everyone else already in the room.

**Playback sync** is state-driven, not just event-relayed: the server keeps
one authoritative `state` object per room (`videoId`, `playState`,
`currentTime`, `lastUpdatedAt`). When Host/Moderator sends `play`, `pause`,
`seek`, or `change_video`, the server updates that state object and then
broadcasts a single `sync_state` event with the full state to the room
(`io.to(roomId).emit(...)`) — so a client that reconnects or joins late
just needs the latest `sync_state`/`joined` payload to catch up, rather
than replaying a history of events.

**Role enforcement** happens entirely server-side in
`socketHandlers.js` + `utils/permissions.js`: every playback event checks
`participant.canControlPlayback()` (Host or Moderator) and every
room-management event (`assign_role`, `remove_participant`,
`transfer_host`) checks `participant.canManageRoom()` (Host only) *before*
touching room state. A Participant emitting `change_video` directly (e.g.
via devtools) gets an `error_event` back and nothing happens to the shared
state — the client-side hiding of controls is a UX nicety, not the
security boundary.

**Client-side loop prevention:** `YouTubePlayer.jsx` uses an
`applyingRemoteRef` flag so that when `Room.jsx` calls `playVideo()` /
`pauseVideo()` / `seekTo()` in response to an incoming `sync_state`, the
resulting YouTube `onStateChange` event is *not* re-emitted back to the
server as if the local user had pressed play. Local seeks are detected by
polling `getCurrentTime()` while playing (the IFrame API has no native
"user scrubbed" event) and comparing against the expected elapsed time.

### WebSocket events

| Event | Direction | Payload | Notes |
|---|---|---|---|
| `join_room` | C→S | `{ roomId, username }` | assigns role, joins socket room |
| `leave_room` | C→S | `{}` | also fires on disconnect |
| `play` / `pause` | C→S | `{ currentTime }` | Host/Moderator only |
| `seek` | C→S | `{ time }` | Host/Moderator only |
| `change_video` | C→S | `{ videoId }` | Host/Moderator only |
| `assign_role` | C→S | `{ userId, role }` | Host only |
| `remove_participant` | C→S | `{ userId }` | Host only |
| `transfer_host` | C→S | `{ userId }` | Host only |
| `chat_message` | C↔S | `{ text }` | bonus |
| `joined` | S→C | `{ you, state, participants, chatHistory }` | ack to the joiner |
| `sync_state` | S→room | `{ videoId, playState, currentTime, lastUpdatedAt }` | authoritative state |
| `user_joined` / `user_left` | S→room | `{ …, participants }` | |
| `role_assigned` / `participant_removed` | S→room | `{ …, participants }` | |
| `you_were_removed` | S→C | `{ roomId }` | targeted at the removed user |
| `error_event` | S→C | `{ event, message }` | permission/validation failures |

## RBAC model

- **Host** — auto-assigned to whoever's socket first joins a room; full
  control of playback, roles, and removal; can transfer host to someone else.
- **Moderator** — assigned by Host; can control playback (play/pause/seek/
  change video) but cannot manage roles or remove people.
- **Participant** — default for everyone who joins after the Host;
  watch-only, native YouTube controls are hidden client-side and any
  control events are rejected server-side.

If the Host disconnects, the server promotes the longest-tenured remaining
participant to Host (`Room.promoteNextHost()`), so a room is never
leaderless while people are still in it.

## Deployment

The backend and frontend deploy as two separate services (Socket.IO needs a
long-lived process, so it can't run on a purely static host or basic
serverless function).

**Render (recommended, one platform for both):**
1. Push this repo to GitHub.
2. New **Web Service** → root `server/` → build `npm install` → start
   `npm start`. Set env var `CLIENT_ORIGIN` to your frontend's URL.
3. New **Static Site** (or a second Web Service) → root `client/` →
   build `npm install && npm run build` → publish dir `dist`. Set env var
   `VITE_SERVER_URL` to your backend's URL.
4. Once both are live, put the frontend URL back into the backend's
   `CLIENT_ORIGIN` (for CORS + Socket.IO's allowed origin) and redeploy.

**Vercel/Netlify** work well for the `client/` static build; pair with
**Railway** or **Render** for the `server/` WebSocket process, same env var
wiring as above.

## Trade-offs & known limitations

- **State is in-memory** — restarting the server drops all rooms. Fine for
  a demo; see below for how to persist it.
- **Seek detection is polling-based** (1s interval) because the YouTube
  IFrame API doesn't expose a native scrub event — there's a small delay
  before a manual seek propagates to other viewers.
- **No auth** — usernames are self-reported and not verified. Good enough
  for a link-and-code based watch party, not for anything sensitive.
- **Single server instance** — Socket.IO rooms live on one process; see
  Scalability below for scaling past that.

## Persistence (bonus)

To persist rooms, swap `RoomManager`'s in-memory `Map` for reads/writes
against Postgres/Mongo: persist `Room.state` and a `participants` table
keyed by `roomId`, and hydrate a `Room` from the DB on first access after a
restart instead of only ever constructing a fresh one in `createRoom()`.
`Room`'s public methods (`applyPlay`, `applySeek`, etc.) are the natural
place to add a `await db.save(...)` call.

## Scalability (bonus)

To scale past a single process: run multiple Socket.IO server instances
behind a load balancer with sticky sessions, and add the
[Socket.IO Redis adapter](https://socket.io/docs/v4/redis-adapter/) so
`io.to(roomId).emit(...)` broadcasts across instances via Redis Pub/Sub
instead of only to sockets on the same process. `RoomManager` would then
need to either shard rooms consistently across instances or move room
membership/state into Redis as well, since two instances can't safely
share one in-memory `Map`.
