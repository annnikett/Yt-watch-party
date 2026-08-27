require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const RoomManager = require("./rooms/RoomManager");
const MessageHandler = require("./socket/socketHandlers");
const buildRoomsRouter = require("./routes/rooms");

const PORT = process.env.PORT || 4000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";

const app = express();
app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(express.json());

const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: { origin: CLIENT_ORIGIN, methods: ["GET", "POST"] },
});

const roomManager = new RoomManager(io);

app.get("/health", (req, res) => res.json({ ok: true, ...roomManager.stats() }));
app.use("/api/rooms", buildRoomsRouter(roomManager));

io.on("connection", (socket) => {
  const handler = new MessageHandler(socket, io, roomManager);
  handler.register();
});

httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`Watch Party server listening on :${PORT}`);
});