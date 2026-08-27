const { nanoid } = require("nanoid");

const {
  Participant,
  ROLES,
} = require("../rooms/Participant");

const {
  canControlPlayback,
  canManageRoom,
  isValidRole,
} = require("../utils/permissions");

class MessageHandler {
  constructor(
    socket,
    io,
    roomManager
  ) {
    this.socket = socket;

    this.io = io;

    this.roomManager =
      roomManager;

    this.roomId = null;
  }

  register() {
    this.socket.on(
      "join_room",
      (payload) =>
        this.handleJoinRoom(payload)
    );

    this.socket.on(
      "leave_room",
      () =>
        this.handleLeaveRoom()
    );

    this.socket.on(
      "play",
      (payload) =>
        this.handlePlay(payload)
    );

    this.socket.on(
      "pause",
      (payload) =>
        this.handlePause(payload)
    );

    this.socket.on(
      "seek",
      (payload) =>
        this.handleSeek(payload)
    );

    this.socket.on(
      "change_video",
      (payload) =>
        this.handleChangeVideo(
          payload
        )
    );

    this.socket.on(
      "assign_role",
      (payload) =>
        this.handleAssignRole(
          payload
        )
    );

    this.socket.on(
      "remove_participant",
      (payload) =>
        this.handleRemoveParticipant(
          payload
        )
    );

    this.socket.on(
      "transfer_host",
      (payload) =>
        this.handleTransferHost(
          payload
        )
    );

    this.socket.on(
      "chat_message",
      (payload) =>
        this.handleChatMessage(
          payload
        )
    );

    this.socket.on(
      "disconnect",
      () =>
        this.handleDisconnect()
    );
  }

  // ==================================================
  // HELPERS
  // ==================================================

  currentRoom() {
    return this.roomId
      ? this.roomManager.getRoom(
          this.roomId
        )
      : null;
  }

  currentParticipant() {
    const room =
      this.currentRoom();

    if (!room) return null;

    return room.getBySocketId(
      this.socket.id
    );
  }

  fail(event, message) {
    this.socket.emit(
      "error_event",
      {
        event,
        message,
      }
    );
  }

  // ==================================================
  // JOIN ROOM
  // ==================================================

  handleJoinRoom({
    roomId,
    username,
  } = {}) {
    if (!roomId || !username) {
      return this.fail(
        "join_room",
        "roomId and username are required"
      );
    }

    let room =
      this.roomManager.getRoom(
        roomId
      );

    if (!room) {
      return this.fail(
        "join_room",
        `Room ${roomId} does not exist`
      );
    }

    /*
     * First person becomes Host.
     * Everyone else becomes Participant.
     */
    const role =
      room.hasHost()
        ? ROLES.PARTICIPANT
        : ROLES.HOST;

    const participant =
      new Participant({
        socketId:
          this.socket.id,

        userId:
          nanoid(8),

        username:
          String(username).slice(
            0,
            30
          ),

        role,
      });

    room.addParticipant(
      participant
    );

    this.socket.join(roomId);

    this.roomId = roomId;

    // ----------------------------------------------
    // SEND CURRENT STATE TO JOINING USER
    // ----------------------------------------------

    this.socket.emit(
      "joined",
      {
        roomId,

        you:
          participant.toPublic(),

        state: {
          ...room.state,
        },

        participants:
          room.listPublic(),

        chatHistory:
          room.chatHistory,
      }
    );

    // ----------------------------------------------
    // NOTIFY OTHER USERS
    // ----------------------------------------------

    this.socket
      .to(roomId)
      .emit(
        "user_joined",
        {
          username:
            participant.username,

          userId:
            participant.userId,

          role:
            participant.role,

          participants:
            room.listPublic(),
        }
      );
  }

  // ==================================================
  // LEAVE
  // ==================================================

  handleLeaveRoom() {
    this._removeFromRoom(
      "leave_room"
    );
  }

  handleDisconnect() {
    this._removeFromRoom(
      "disconnect"
    );
  }

  _removeFromRoom(reason) {
    const room =
      this.currentRoom();

    if (!room) return;

    const leaving =
      room.removeBySocketId(
        this.socket.id
      );

    if (!leaving) return;

    this.socket.leave(
      this.roomId
    );

    // ----------------------------------------------
    // IF HOST LEFT
    // ----------------------------------------------

    if (
      leaving.isHost() &&
      !room.isEmpty()
    ) {
      const newHost =
        room.promoteNextHost();

      if (newHost) {
        room.broadcastParticipants(
          "role_assigned",
          {
            userId:
              newHost.userId,

            username:
              newHost.username,

            role:
              newHost.role,
          }
        );
      }
    }

    // ----------------------------------------------
    // NOTIFY USER LEFT
    // ----------------------------------------------

    room.broadcastParticipants(
      "user_left",
      {
        username:
          leaving.username,

        userId:
          leaving.userId,
      }
    );

    this.roomManager
      .deleteRoomIfEmpty(
        this.roomId
      );

    this.roomId = null;
  }

  // ==================================================
  // PLAY
  // ==================================================

  handlePlay({
    currentTime = 0,
  } = {}) {
    const room =
      this.currentRoom();

    const participant =
      this.currentParticipant();

    if (
      !room ||
      !participant
    ) {
      return;
    }

    if (
      !canControlPlayback(
        participant
      )
    ) {
      return this.fail(
        "play",
        "Only Host/Moderator can control playback"
      );
    }

    room.applyPlay(
      currentTime
    );

    room.broadcastSyncState();
  }

  // ==================================================
  // PAUSE
  // ==================================================

  handlePause({
    currentTime = 0,
  } = {}) {
    const room =
      this.currentRoom();

    const participant =
      this.currentParticipant();

    if (
      !room ||
      !participant
    ) {
      return;
    }

    if (
      !canControlPlayback(
        participant
      )
    ) {
      return this.fail(
        "pause",
        "Only Host/Moderator can control playback"
      );
    }

    room.applyPause(
      currentTime
    );

    room.broadcastSyncState();
  }

  // ==================================================
  // SEEK
  // ==================================================

  handleSeek({
    time,
  } = {}) {
    const room =
      this.currentRoom();

    const participant =
      this.currentParticipant();

    if (
      !room ||
      !participant
    ) {
      return;
    }

    if (
      typeof time !==
      "number"
    ) {
      return this.fail(
        "seek",
        "time must be a number"
      );
    }

    if (
      !Number.isFinite(time)
    ) {
      return this.fail(
        "seek",
        "time must be finite"
      );
    }

    if (
      !canControlPlayback(
        participant
      )
    ) {
      return this.fail(
        "seek",
        "Only Host/Moderator can control playback"
      );
    }

    room.applySeek(time);

    room.broadcastSyncState();
  }

  // ==================================================
  // CHANGE VIDEO
  // ==================================================

  handleChangeVideo({
    videoId,
  } = {}) {
    const room =
      this.currentRoom();

    const participant =
      this.currentParticipant();

    if (
      !room ||
      !participant
    ) {
      return;
    }

    if (!videoId) {
      return this.fail(
        "change_video",
        "videoId is required"
      );
    }

    if (
      !canControlPlayback(
        participant
      )
    ) {
      return this.fail(
        "change_video",
        "Only Host/Moderator can change video"
      );
    }

    room.applyChangeVideo(
      videoId
    );

    /*
     * Everyone receives exactly the same state.
     */
    room.broadcastSyncState();
  }

  // ==================================================
  // ASSIGN ROLE
  // ==================================================

  handleAssignRole({
    userId,
    role,
  } = {}) {
    const room =
      this.currentRoom();

    const participant =
      this.currentParticipant();

    if (
      !room ||
      !participant
    ) {
      return;
    }

    if (
      !canManageRoom(
        participant
      )
    ) {
      return this.fail(
        "assign_role",
        "Only Host can assign roles"
      );
    }

    if (
      !isValidRole(role) ||
      role === ROLES.HOST
    ) {
      return this.fail(
        "assign_role",
        "Invalid role. Use transfer_host to change Host"
      );
    }

    const target =
      room.getByUserId(
        userId
      );

    if (!target) {
      return this.fail(
        "assign_role",
        "Participant not found"
      );
    }

    target.role = role;

    room.broadcastParticipants(
      "role_assigned",
      {
        userId:
          target.userId,

        username:
          target.username,

        role:
          target.role,
      }
    );

    /*
     * IMPORTANT:
     *
     * Do NOT broadcast sync_state here.
     * Role change must not reload the video.
     */
  }

  // ==================================================
  // REMOVE PARTICIPANT
  // ==================================================

  handleRemoveParticipant({
    userId,
  } = {}) {
    const room =
      this.currentRoom();

    const participant =
      this.currentParticipant();

    if (
      !room ||
      !participant
    ) {
      return;
    }

    if (
      !canManageRoom(
        participant
      )
    ) {
      return this.fail(
        "remove_participant",
        "Only Host can remove participants"
      );
    }

    const target =
      room.getByUserId(
        userId
      );

    if (!target) {
      return this.fail(
        "remove_participant",
        "Participant not found"
      );
    }

    if (
      target.isHost()
    ) {
      return this.fail(
        "remove_participant",
        "Cannot remove the Host"
      );
    }

    room.removeBySocketId(
      target.socketId
    );

    room.broadcastParticipants(
      "participant_removed",
      {
        userId:
          target.userId,
      }
    );

    const targetSocket =
      this.io.sockets.sockets.get(
        target.socketId
      );

    if (targetSocket) {
      targetSocket.emit(
        "you_were_removed",
        {
          roomId:
            this.roomId,
        }
      );

      targetSocket.leave(
        this.roomId
      );
    }
  }

  // ==================================================
  // TRANSFER HOST
  // ==================================================

  handleTransferHost({
    userId,
  } = {}) {
    const room =
      this.currentRoom();

    const participant =
      this.currentParticipant();

    if (
      !room ||
      !participant
    ) {
      return;
    }

    if (
      !participant.isHost()
    ) {
      return this.fail(
        "transfer_host",
        "Only Host can transfer host"
      );
    }

    const target =
      room.getByUserId(
        userId
      );

    if (!target) {
      return this.fail(
        "transfer_host",
        "Participant not found"
      );
    }

    if (
      target.userId ===
      participant.userId
    ) {
      return this.fail(
        "transfer_host",
        "You are already the Host"
      );
    }

    /*
     * Old Host becomes Moderator.
     */
    participant.role =
      ROLES.MODERATOR;

    /*
     * Target becomes Host.
     */
    target.role =
      ROLES.HOST;

    room.broadcastParticipants(
      "role_assigned",
      {
        userId:
          participant.userId,

        username:
          participant.username,

        role:
          participant.role,
      }
    );

    room.broadcastParticipants(
      "role_assigned",
      {
        userId:
          target.userId,

        username:
          target.username,

        role:
          target.role,
      }
    );

    /*
     * IMPORTANT:
     *
     * Don't send sync_state here.
     *
     * Existing YouTube iframe continues playing.
     */
  }

  // ==================================================
  // CHAT
  // ==================================================

  handleChatMessage({
    text,
  } = {}) {
    const room =
      this.currentRoom();

    const participant =
      this.currentParticipant();

    if (
      !room ||
      !participant ||
      !text
    ) {
      return;
    }

    const cleanText =
      String(text)
        .trim()
        .slice(0, 500);

    if (!cleanText) {
      return;
    }

    const message =
      room.addChatMessage({
        id:
          nanoid(8),

        userId:
          participant.userId,

        username:
          participant.username,

        text:
          cleanText,

        sentAt:
          Date.now(),
      });

    room.broadcast(
      "chat_message",
      message
    );
  }
}

module.exports = MessageHandler;