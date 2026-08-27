# 🎬 WatchParty

### Watch YouTube together with friends, in real time.

WatchParty is a real-time YouTube watch party application where friends can join the same room and watch videos together with synchronized playback.

Create a room, share the room code, and enjoy YouTube videos together with real-time play, pause, seek, video changes, and live chat.

## 🚀 Live Demo

👉 https://yt-watch-party-client.onrender.com/

---

## ✨ Features

- 🎥 Synchronized YouTube playback
- ▶️ Real-time Play / Pause
- ⏩ Synchronized Seek
- 🔄 Change YouTube videos together
- 👥 Multiple users in the same room
- 👑 Host controls
- 🛡️ Moderator role
- 👤 Participant role
- 💬 Real-time chat
- 🔗 Simple room-code sharing
- ⚡ Real-time updates using Socket.IO
- 📱 Responsive interface
- 🔐 Server-side role-based permissions

---

## 🎯 How It Works

### 1. Create a Room

Create a new watch party and get a unique 6-character room code.

### 2. Share the Code

Share the room code with your friends.

### 3. Join the Room

Friends enter their name and the room code to join.

### 4. Watch Together

The Host or Moderator can:

- Play
- Pause
- Seek
- Change the YouTube video

All playback actions are synchronized with the other users in the room.

### 5. Chat

Participants can communicate through the real-time chat while watching.

---

## 👑 Roles & Permissions

| Role | Playback | Manage Users | Change Roles |
|------|----------|--------------|--------------|
| 👑 Host | ✅ | ✅ | ✅ |
| 🛡️ Moderator | ✅ | ❌ | ❌ |
| 👤 Participant | ❌ | ❌ | ❌ |

### Host

The Host has complete control over the room.

- Play / Pause
- Seek
- Change video
- Assign Moderator
- Remove participants
- Transfer Host role

### Moderator

Moderators can control playback but cannot manage other participants.

### Participant

Participants can watch the video and use the chat but cannot control playback.

---

## 🛠️ Tech Stack

### Frontend

- React
- Vite
- React Router
- CSS
- YouTube IFrame Player API

### Backend

- Node.js
- Express.js
- Socket.IO

### State Management

- In-memory room state

### Deployment

- Render

---

## 📁 Project Structure

```text
watch-party/
│
├── server/
│   └── src/
│       ├── index.js
│       │
│       ├── routes/
│       │   └── rooms.js
│       │
│       ├── rooms/
│       │   ├── Room.js
│       │   ├── Participant.js
│       │   └── RoomManager.js
│       │
│       ├── socket/
│       │   └── socketHandlers.js
│       │
│       └── utils/
│           └── permissions.js
│
└── client/
    └── src/
        ├── pages/
        │   ├── Home.jsx
        │   └── Room.jsx
        │
        ├── components/
        │   ├── YouTubePlayer.jsx
        │   ├── ParticipantList.jsx
        │   ├── ChangeVideoBar.jsx
        │   └── Chat.jsx
        │
        └── socket.js
