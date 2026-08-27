const ROLES = Object.freeze({
  HOST: "host",
  MODERATOR: "moderator",
  PARTICIPANT: "participant",
});

/**
 * Represents a single connected user inside a Room.
 * Holds identity + role only; socket wiring stays in socketHandlers.js.
 */
class Participant {
  constructor({ socketId, userId, username, role = ROLES.PARTICIPANT }) {
    this.socketId = socketId;
    this.userId = userId;
    this.username = username;
    this.role = role;
    this.joinedAt = Date.now();
  }

  isHost() {
    return this.role === ROLES.HOST;
  }

  canControlPlayback() {
    return this.role === ROLES.HOST || this.role === ROLES.MODERATOR;
  }

  canManageRoom() {
    // assign roles, remove participants, transfer host
    return this.role === ROLES.HOST;
  }

  toPublic() {
    return {
      userId: this.userId,
      username: this.username,
      role: this.role,
    };
  }
}

module.exports = { Participant, ROLES };
