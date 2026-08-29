const { ROLES } = require("./Participant");

class Room {
  constructor(roomId, io) {
    this.roomId = roomId;
    this.io = io;

    this.participants = new Map();

    this.state = {
      videoId: null,

      playState: "paused",

      currentTime: 0,

      /*
       * Timestamp of the moment currentTime was recorded.
       *
       * Client uses this to calculate elapsed playback
       * time for late joiners.
       */
      lastUpdatedAt: Date.now(),
    };

    this.chatHistory = [];

    this.queue = [];

    this.createdAt = Date.now();
  }

  // ==================================================
  // PARTICIPANTS
  // ==================================================

  addParticipant(participant) {
    this.participants.set(
      participant.socketId,
      participant
    );
  }

  removeBySocketId(socketId) {
    const participant =
      this.participants.get(socketId);

    this.participants.delete(socketId);

    return participant;
  }

  getBySocketId(socketId) {
    return this.participants.get(socketId);
  }

  getByUserId(userId) {
    return [
      ...this.participants.values(),
    ].find(
      (participant) =>
        participant.userId === userId
    );
  }

  get size() {
    return this.participants.size;
  }

  isEmpty() {
    return this.participants.size === 0;
  }

  hasHost() {
    return [
      ...this.participants.values(),
    ].some((participant) =>
      participant.isHost()
    );
  }

  getHost() {
    return [
      ...this.participants.values(),
    ].find((participant) =>
      participant.isHost()
    );
  }

  listPublic() {
    return [
      ...this.participants.values(),
    ].map((participant) =>
      participant.toPublic()
    );
  }

  // ==================================================
  // PROMOTE NEXT HOST
  // ==================================================

  promoteNextHost() {
    const candidates = [
      ...this.participants.values(),
    ].sort(
      (a, b) =>
        a.joinedAt - b.joinedAt
    );

    const next = candidates[0];

    if (next) {
      next.role = ROLES.HOST;
    }

    return next;
  }

  // ==================================================
  // PLAYBACK
  // ==================================================

  applyPlay(currentTime) {
    const time = Number(currentTime);

    this.state.playState =
      "playing";

    this.state.currentTime =
      Number.isFinite(time)
        ? Math.max(0, time)
        : 0;

    this.state.lastUpdatedAt =
      Date.now();
  }

  applyPause(currentTime) {
    const time = Number(currentTime);

    this.state.playState =
      "paused";

    this.state.currentTime =
      Number.isFinite(time)
        ? Math.max(0, time)
        : 0;

    this.state.lastUpdatedAt =
      Date.now();
  }

  applySeek(time) {
    const newTime = Number(time);

    if (!Number.isFinite(newTime)) {
      return;
    }

    this.state.currentTime =
      Math.max(0, newTime);

    /*
     * Reset timestamp after every seek.
     *
     * If video is currently playing,
     * the client will calculate elapsed time
     * from this new position.
     */
    this.state.lastUpdatedAt =
      Date.now();
  }

  applyChangeVideo(videoId) {
    this.state.videoId =
      String(videoId);

    this.state.currentTime = 0;

    /*
     * New video starts paused.
     *
     * Host/Moderator can press play afterwards.
     */
    this.state.playState =
      "paused";

    this.state.lastUpdatedAt =
      Date.now();
  }

  // ==================================================
  // CHAT
  // ==================================================

  addChatMessage(message) {
    this.chatHistory.push(message);

    if (
      this.chatHistory.length > 100
    ) {
      this.chatHistory.shift();
    }

    return message;
  }

  // ==================================================
  // QUEUE
  // ==================================================

  addToQueue(item) {
    this.queue.push(item);

    return item;
  }

  removeFromQueue(itemId) {
    const index = this.queue.findIndex(
      (item) => item.id === itemId
    );

    if (index === -1) {
      return null;
    }

    const [removed] = this.queue.splice(
      index,
      1
    );

    return removed;
  }

  broadcastQueue() {
    this.broadcast(
      "queue_updated",
      {
        queue: this.queue,
      }
    );
  }

  // ==================================================
  // BROADCAST
  // ==================================================

  broadcast(event, payload) {
    this.io
      .to(this.roomId)
      .emit(event, payload);
  }

  broadcastSyncState() {
    this.broadcast(
      "sync_state",
      {
        videoId:
          this.state.videoId,

        playState:
          this.state.playState,

        currentTime:
          this.state.currentTime,

        lastUpdatedAt:
          this.state.lastUpdatedAt,
      }
    );
  }

  broadcastParticipants(
    event,
    extra = {}
  ) {
    this.broadcast(event, {
      ...extra,

      participants:
        this.listPublic(),
    });
  }
}

module.exports = Room;