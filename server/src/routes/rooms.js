const express = require("express");

function buildRoomsRouter(roomManager) {
  const router = express.Router();

  // Create a new room; the socket that later joins with the first
  // connection becomes Host (see socketHandlers.handleJoinRoom).
  router.post("/", (req, res) => {
    const room = roomManager.createRoom();
    res.status(201).json({ roomId: room.roomId });
  });

  // Let the client check a room exists before trying to join it.
  router.get("/:roomId", (req, res) => {
    const room = roomManager.getRoom(req.params.roomId.toUpperCase());
    if (!room) return res.status(404).json({ error: "Room not found" });
    res.json({
      roomId: room.roomId,
      participantCount: room.size,
      videoId: room.state.videoId,
    });
  });

  return router;
}

module.exports = buildRoomsRouter;
