import {
  useEffect,
  useRef,
  useState,
} from "react";
//
import {
  useNavigate,
  useParams,
} from "react-router-dom";

import { socket } from "../socket.js";

import YouTubePlayer from "../components/YouTubePlayer.jsx";
import ParticipantList from "../components/ParticipantList.jsx";
import ChangeVideoBar from "../components/ChangeVideoBar.jsx";
import Chat from "../components/Chat.jsx";

export default function Room() {
  const { roomId } = useParams();
  const navigate = useNavigate();

  const playerRef = useRef(null);

  const [connected, setConnected] =
    useState(false);

  const [you, setYou] =
    useState(null);

  const [participants, setParticipants] =
    useState([]);

  const [videoId, setVideoId] =
    useState(null);

  const [messages, setMessages] =
    useState([]);

  const [banner, setBanner] =
    useState("");

  const [fatalError, setFatalError] =
    useState("");

  const canControl =
    you?.role === "host" ||
    you?.role === "moderator";

  const isHost =
    you?.role === "host";

  // ==================================================
  // JOIN ROOM
  // ==================================================

  useEffect(() => {
    const username =
      localStorage.getItem(
        "wp_username"
      );

    /*
     * localStorage is important here.
     *
     * It allows the copied room link to
     * work when opened in a new browser tab.
     */
    if (!username) {
      navigate("/", {
        replace: true,
      });

      return;
    }

    socket.connect();

    socket.emit(
      "join_room",
      {
        roomId,
        username,
      }
    );

    // ==================================================
    // JOINED
    // ==================================================

    const onJoined = ({
      you,
      state,
      participants,
      chatHistory,
    }) => {
      setYou(you);

      setParticipants(
        participants || []
      );

      setMessages(
        chatHistory || []
      );

      setVideoId(
        state?.videoId || null
      );

      setConnected(true);

      /*
       * IMPORTANT:
       *
       * Do not directly call loadVideo().
       *
       * YouTubePlayer may not be ready yet.
       * It stores the state and applies it
       * automatically inside onReady().
       */
      setTimeout(() => {
        if (state) {
          playerRef.current?.syncState(
            state
          );
        }
      }, 0);
    };

    // ==================================================
    // USER JOINED
    // ==================================================

    const onUserJoined = ({
      username,
      participants,
    }) => {
      setParticipants(
        participants || []
      );

      setBanner(
        `${username} joined`
      );
    };

    // ==================================================
    // USER LEFT
    // ==================================================

    const onUserLeft = ({
      username,
      participants,
    }) => {
      setParticipants(
        participants || []
      );

      setBanner(
        `${username} left`
      );
    };

    // ==================================================
    // ROLE ASSIGNED
    // ==================================================

    const onRoleAssigned = ({
      userId,
      role,
      participants,
    }) => {
      setParticipants(
        participants || []
      );

      setYou((prev) => {
        if (!prev) {
          return prev;
        }

        if (
          prev.userId === userId
        ) {
          setBanner(
            `Your role is now ${role}`
          );

          return {
            ...prev,
            role,
          };
        }

        return prev;
      });

      /*
       * IMPORTANT:
       *
       * Role change must NOT reload
       * the YouTube player.
       *
       * Existing video continues playing.
       */
    };

    // ==================================================
    // PARTICIPANT REMOVED
    // ==================================================

    const onParticipantRemoved = ({
      participants,
    }) => {
      setParticipants(
        participants || []
      );
    };

    // ==================================================
    // YOU WERE REMOVED
    // ==================================================

    const onYouWereRemoved = () => {
      setFatalError(
        "The host removed you from this room."
      );

      socket.disconnect();
    };

    // ==================================================
    // SYNC STATE
    // ==================================================

    const onSyncState = (state) => {
      if (!state) {
        return;
      }

      /*
       * Update React state.
       */
      setVideoId(
        state.videoId || null
      );

      /*
       * Pass the complete state to
       * YouTubePlayer.
       *
       * YouTubePlayer handles:
       *
       * - initial video load
       * - player not ready
       * - video change
       * - play
       * - pause
       * - seek
       * - late join timing
       */
      playerRef.current?.syncState(
        state
      );
    };

    // ==================================================
    // CHAT
    // ==================================================

    const onChatMessage = (msg) => {
      setMessages((prev) => [
        ...prev,
        msg,
      ]);
    };

    // ==================================================
    // ERROR
    // ==================================================

    const onErrorEvent = ({
      message,
    }) => {
      setBanner(
        message ||
          "Something went wrong"
      );
    };

    // ==================================================
    // SOCKET LISTENERS
    // ==================================================

    socket.on(
      "joined",
      onJoined
    );

    socket.on(
      "user_joined",
      onUserJoined
    );

    socket.on(
      "user_left",
      onUserLeft
    );

    socket.on(
      "role_assigned",
      onRoleAssigned
    );

    socket.on(
      "participant_removed",
      onParticipantRemoved
    );

    socket.on(
      "you_were_removed",
      onYouWereRemoved
    );

    socket.on(
      "sync_state",
      onSyncState
    );

    socket.on(
      "chat_message",
      onChatMessage
    );

    socket.on(
      "error_event",
      onErrorEvent
    );

    // ==================================================
    // CLEANUP
    // ==================================================

    return () => {
      socket.emit(
        "leave_room"
      );

      socket.off(
        "joined",
        onJoined
      );

      socket.off(
        "user_joined",
        onUserJoined
      );

      socket.off(
        "user_left",
        onUserLeft
      );

      socket.off(
        "role_assigned",
        onRoleAssigned
      );

      socket.off(
        "participant_removed",
        onParticipantRemoved
      );

      socket.off(
        "you_were_removed",
        onYouWereRemoved
      );

      socket.off(
        "sync_state",
        onSyncState
      );

      socket.off(
        "chat_message",
        onChatMessage
      );

      socket.off(
        "error_event",
        onErrorEvent
      );

      socket.disconnect();
    };
  }, [
    roomId,
    navigate,
  ]);

  // ==================================================
  // BANNER AUTO HIDE
  // ==================================================

  useEffect(() => {
    if (!banner) {
      return;
    }

    const timer =
      setTimeout(() => {
        setBanner("");
      }, 3000);

    return () => {
      clearTimeout(timer);
    };
  }, [banner]);

  // ==================================================
  // ROOM ACTION
  // ==================================================

  const handleRoomAction = (
    event,
    payload
  ) => {
    socket.emit(
      event,
      payload
    );
  };

  // ==================================================
  // CHANGE VIDEO
  // ==================================================

  const handleChangeVideo = (
    id
  ) => {
    if (!id) {
      return;
    }

    /*
     * IMPORTANT:
     *
     * Don't directly load the YouTube
     * video here.
     *
     * Server is the source of truth.
     *
     * change_video
     *       ↓
     * server updates room state
     *       ↓
     * server emits sync_state
     *       ↓
     * all clients load same video
     */
    socket.emit(
      "change_video",
      {
        videoId: id,
      }
    );
  };

  // ==================================================
  // PLAY
  // ==================================================

  const handlePlay = (
    time
  ) => {
    if (!canControl) {
      return;
    }

    socket.emit(
      "play",
      {
        currentTime:
          Number(time) || 0,
      }
    );
  };

  // ==================================================
  // PAUSE
  // ==================================================

  const handlePause = (
    time
  ) => {
    if (!canControl) {
      return;
    }

    socket.emit(
      "pause",
      {
        currentTime:
          Number(time) || 0,
      }
    );
  };

  // ==================================================
  // SEEK
  // ==================================================

  const handleSeek = (
    time
  ) => {
    if (!canControl) {
      return;
    }

    socket.emit(
      "seek",
      {
        time:
          Number(time) || 0,
      }
    );
  };

  // ==================================================
  // COPY INVITE LINK
  // ==================================================

  const copyInvite = async () => {
    /*
     * We copy a link to the ROOT page with the
     * room code as a query param (?code=XXXXXX),
     * NOT a link straight into /room/:roomId.
     *
     * Why:
     * - The root path always resolves correctly,
     *   even on static hosts (no 404).
     * - Home.jsx reads ?code= and pre-fills the
     *   room code field, but the visitor still
     *   has to type their OWN name and press
     *   Join — nothing auto-joins with the
     *   host's name.
     */
    const inviteUrl =
      `${window.location.origin}/?code=${roomId}`;

    try {
      await navigator.clipboard.writeText(
        inviteUrl
      );

      setBanner(
        "Invite link copied"
      );
    } catch (error) {
      console.error(
        "Copy invite failed:",
        error
      );

      /*
       * Fallback copy method.
       */
      try {
        const textarea =
          document.createElement(
            "textarea"
          );

        textarea.value =
          inviteUrl;

        textarea.style.position =
          "fixed";

        textarea.style.left =
          "-9999px";

        document.body.appendChild(
          textarea
        );

        textarea.select();

        document.execCommand(
          "copy"
        );

        document.body.removeChild(
          textarea
        );

        setBanner(
          "Invite link copied"
        );
      } catch {
        setBanner(
          "Could not copy invite link"
        );
      }
    }
  };

  // ==================================================
  // FATAL ERROR SCREEN
  // ==================================================

  if (fatalError) {
    return (
      <div className="screen home-screen">
        <div className="card">

          <p className="error-text">
            {fatalError}
          </p>

          <button
            className="btn btn-primary"
            onClick={() =>
              navigate("/")
            }
          >
            Back home
          </button>

        </div>
      </div>
    );
  }

  // ==================================================
  // ROOM UI
  // ==================================================

  return (
    <div className="screen room-screen">

      {/* ==========================================
          HEADER
      ========================================== */}

      <header className="room-header">

        <div>
          <span className="room-code-label">
            Room
          </span>

          <span className="room-code">
            {roomId}
          </span>
        </div>

        {banner && (
          <div className="banner">
            {banner}
          </div>
        )}

        <div className="header-actions">

          <button
            className="btn btn-teal"
            onClick={
              copyInvite
            }
          >
            Copy invite
          </button>

          <button
            className="btn btn-danger"
            onClick={() =>
              navigate("/")
            }
          >
            Leave
          </button>

        </div>

      </header>

      {/* ==========================================
          MAIN
      ========================================== */}

      <main className="room-body">

        {/* ========================================
            PLAYER
        ======================================== */}

        <section className="player-column">

          <div className="player-frame">

            {connected && (
              <YouTubePlayer
                ref={playerRef}
                videoId={videoId}
                canControl={
                  canControl
                }
                onPlay={
                  handlePlay
                }
                onPause={
                  handlePause
                }
                onSeek={
                  handleSeek
                }
              />
            )}

            {!videoId && (
              <div className="empty-player">

                {canControl
                  ? "Paste a YouTube link below to start the party."
                  : "Waiting for the host to start a video…"}

              </div>
            )}

          </div>

          {/* ======================================
              CHANGE VIDEO
          ====================================== */}

          <ChangeVideoBar
            canControl={
              canControl
            }
            onChangeVideo={
              handleChangeVideo
            }
          />

          {/* ======================================
              PARTICIPANT MESSAGE
          ====================================== */}

          {!canControl && (
            <p className="hint-text">
              You're watching as a
              Participant — playback
              is locked to
              Host/Moderator.
            </p>
          )}

        </section>

        {/* ========================================
            SIDEBAR
        ======================================== */}

        <aside className="side-column">

          <ParticipantList
            participants={
              participants
            }
            you={you}
            isHost={isHost}
            onAction={
              handleRoomAction
            }
          />

          <Chat
            messages={
              messages
            }
            you={you}
            onSend={(text) =>
              socket.emit(
                "chat_message",
                {
                  text,
                }
              )
            }
          />

        </aside>

      </main>
    </div>
  );
}