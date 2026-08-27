const { customAlphabet } = require("nanoid");
const Room = require("./Room");

// Short, unambiguous room codes (no 0/O/1/I) e.g. "K7QX9B"
const generateCode = customAlphabet("ABCDEFGHJKMNPQRSTUVWXYZ23456789", 6);

/**
 * Owns the lifecycle of all rooms. Rooms live in memory (a Map) for the MVP;
 * swapping in Postgres/Mongo later just means persisting Room.state and
 * participant rows instead of/alongside this Map.
 */
class RoomManager {
  constructor(io) {
    this.io = io;
    this.rooms = new Map(); // roomId -> Room
  }

  createRoom() {
    let roomId = generateCode();
    while (this.rooms.has(roomId)) roomId = generateCode();
    const room = new Room(roomId, this.io);
    this.rooms.set(roomId, room);
    return room;
  }

  getRoom(roomId) {
    return this.rooms.get(roomId);
  }

  roomExists(roomId) {
    return this.rooms.has(roomId);
  }

  deleteRoomIfEmpty(roomId) {
    const room = this.rooms.get(roomId);
    if (room && room.isEmpty()) {
      this.rooms.delete(roomId);
      return true;
    }
    return false;
  }

  stats() {
    let users = 0;
    for (const room of this.rooms.values()) users += room.size;
    return { rooms: this.rooms.size, users };
  }
}

module.exports = RoomManager;
