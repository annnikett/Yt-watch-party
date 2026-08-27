import { io } from "socket.io-client";

export const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:4000";

// autoConnect: false so the Room page controls exactly when we connect
// (after the user has picked a username), rather than connecting eagerly
// on app load and holding a socket open for nothing.
export const socket = io(SERVER_URL, {
  autoConnect: false,
  transports: ["websocket", "polling"],
});
