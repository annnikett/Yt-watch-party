const { ROLES } = require("../rooms/Participant");

/** Playback events (play/pause/seek/change_video) require Host or Moderator. */
function canControlPlayback(participant) {
  return !!participant && participant.canControlPlayback();
}

/** Room-management events (assign_role/remove_participant/transfer_host) require Host. */
function canManageRoom(participant) {
  return !!participant && participant.canManageRoom();
}

function isValidRole(role) {
  return Object.values(ROLES).includes(role);
}

module.exports = { canControlPlayback, canManageRoom, isValidRole };
