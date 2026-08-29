import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";

const YouTubePlayer = forwardRef(function YouTubePlayer(
  {
    videoId,
    canControl,
    onPlay,
    onPause,
    onSeek,
  },
  ref
) {
  const containerRef = useRef(null);
  const playerRef = useRef(null);

  const readyRef = useRef(false);

  // ==================================================
  // IMPORTANT: LATEST PROPS
  // ==================================================

  const canControlRef =
    useRef(canControl);

  const onPlayRef =
    useRef(onPlay);

  const onPauseRef =
    useRef(onPause);

  const onSeekRef =
    useRef(onSeek);

  // ==================================================
  // LATEST SERVER STATE
  // ==================================================

  const pendingStateRef =
    useRef(null);

  // ==================================================
  // REMOTE COMMAND
  // ==================================================

  const applyingRemoteRef =
    useRef(false);

  const remoteCommandIdRef =
    useRef(0);

  // ==================================================
  // SEEK POLLING
  // ==================================================

  const pollRef =
    useRef(null);

  const lastKnownTimeRef =
    useRef(0);

  // ==================================================
  // STUCK-VIDEO WATCHDOG
  // ==================================================

  const watchdogRef =
    useRef(null);

  const stuckSinceRef =
    useRef(0);

  // ==================================================
  // UPDATE ALL LATEST REFS
  // ==================================================

  useEffect(() => {
    canControlRef.current =
      canControl;
  }, [canControl]);

  useEffect(() => {
    onPlayRef.current =
      onPlay;
  }, [onPlay]);

  useEffect(() => {
    onPauseRef.current =
      onPause;
  }, [onPause]);

  useEffect(() => {
    onSeekRef.current =
      onSeek;
  }, [onSeek]);

  // ==================================================
  // LOG ROLE
  // ==================================================

  useEffect(() => {
    console.log(
      "PLAYER ROLE:",
      canControl
        ? "HOST / MODERATOR"
        : "PARTICIPANT"
    );
  }, [canControl]);

  // ==================================================
  // VALID YOUTUBE ID
  // ==================================================

  const isValidVideoId = (id) => {
    return (
      typeof id === "string" &&
      /^[a-zA-Z0-9_-]{11}$/.test(id)
    );
  };

  // ==================================================
  // STOP POLLING
  // ==================================================

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(
        pollRef.current
      );

      pollRef.current = null;
    }
  };

  // ==================================================
  // START POLLING
  // ==================================================

  const startPolling = () => {
    stopPolling();

    if (
      !canControlRef.current
    ) {
      return;
    }

    pollRef.current =
      setInterval(() => {
        const player =
          playerRef.current;

        if (!player) {
          return;
        }

        if (
          !canControlRef.current
        ) {
          return;
        }

        /*
         * Don't detect seek while
         * remote command is executing.
         */
        if (
          applyingRemoteRef.current
        ) {
          lastKnownTimeRef.current =
            player.getCurrentTime?.() ||
            0;

          return;
        }

        const current =
          player.getCurrentTime?.();

        if (
          typeof current !==
          "number"
        ) {
          return;
        }

        const previous =
          lastKnownTimeRef.current;

        const difference =
          current - previous;

        /*
         * Manual seek detected.
         */
        if (
          Math.abs(difference) >
          1.8
        ) {
          console.log(
            "LOCAL SEEK:",
            current
          );

          onSeekRef.current?.(
            current
          );
        }

        lastKnownTimeRef.current =
          current;
      }, 1000);
  };

  // ==================================================
  // STUCK-VIDEO WATCHDOG
  // ==================================================

  /*
   * Sometimes the browser silently
   * ignores a programmatic playVideo()
   * call (autoplay policy, slow buffer,
   * a stale command, etc).
   *
   * The video ends up "stuck" — server
   * says PLAYING but the iframe is
   * actually PAUSED / CUED / UNSTARTED.
   *
   * This checks periodically and
   * nudges it back to life.
   */
  const runWatchdog = () => {
    const player =
      playerRef.current;

    if (
      !player ||
      !readyRef.current
    ) {
      stuckSinceRef.current = 0;
      return;
    }

    /*
     * Don't fight an in-flight
     * remote command.
     */
    if (
      applyingRemoteRef.current
    ) {
      stuckSinceRef.current = 0;
      return;
    }

    const pending =
      pendingStateRef.current;

    if (
      !pending ||
      pending.playState !==
        "playing"
    ) {
      stuckSinceRef.current = 0;
      return;
    }

    const YT =
      window.YT;

    if (!YT) {
      return;
    }

    const playerState =
      player.getPlayerState?.();

    /*
     * Already playing (or buffering,
     * which usually resolves on its
     * own) — nothing to do.
     */
    if (
      playerState ===
        YT.PlayerState.PLAYING ||
      playerState ===
        YT.PlayerState.BUFFERING
    ) {
      stuckSinceRef.current = 0;
      return;
    }

    /*
     * PAUSED / CUED / UNSTARTED while
     * the server says PLAYING.
     *
     * Give it one watchdog tick's grace
     * before acting, to avoid fighting
     * a command that's about to land.
     */
    if (!stuckSinceRef.current) {
      stuckSinceRef.current =
        Date.now();
      return;
    }

    console.log(
      "WATCHDOG: video stuck, retrying play",
      playerState
    );

    const targetTime =
      getTargetTime(pending);

    try {
      if (
        !canControlRef.current
      ) {
        player.mute();
      }
    } catch {}

    try {
      player.seekTo(
        targetTime,
        true
      );
    } catch {}

    try {
      player.playVideo();
    } catch {}

    lastKnownTimeRef.current =
      targetTime;

    stuckSinceRef.current = 0;
  };

  // ==================================================
  // BEGIN REMOTE COMMAND
  // ==================================================

  const beginRemoteCommand = () => {
    const id =
      ++remoteCommandIdRef.current;

    applyingRemoteRef.current =
      true;

    return id;
  };

  // ==================================================
  // END REMOTE COMMAND
  // ==================================================

  const endRemoteCommand = (
    id,
    delay = 1000
  ) => {
    setTimeout(() => {
      if (
        id ===
        remoteCommandIdRef.current
      ) {
        applyingRemoteRef.current =
          false;
      }
    }, delay);
  };

  // ==================================================
  // TARGET TIME
  // ==================================================

  const getTargetTime = (
    state
  ) => {
    let target =
      Number(
        state.currentTime
      ) || 0;

    /*
     * Late join correction.
     */
    if (
      state.playState ===
        "playing" &&
      state.lastUpdatedAt
    ) {
      const elapsed =
        (
          Date.now() -
          Number(
            state.lastUpdatedAt
          )
        ) / 1000;

      if (
        elapsed > 0 &&
        elapsed < 120
      ) {
        target += elapsed;
      }
    }

    return Math.max(
      0,
      target
    );
  };

  // ==================================================
  // PARTICIPANT AUTOPLAY
  // ==================================================

  const playParticipant = (
    targetTime
  ) => {
    const player =
      playerRef.current;

    if (!player) {
      return;
    }

    /*
     * Muted autoplay.
     */
    try {
      player.mute();
    } catch {}

    const commandId =
      beginRemoteCommand();

    try {
      player.seekTo(
        targetTime,
        true
      );
    } catch {}

    /*
     * Play only because server
     * says PLAYING.
     */
    try {
      player.playVideo();
    } catch {}

    lastKnownTimeRef.current =
      targetTime;

    endRemoteCommand(
      commandId,
      1200
    );
  };

  // ==================================================
  // APPLY SERVER STATE
  // ==================================================

  const applyState = (
    state
  ) => {
    if (!state) {
      return;
    }

    /*
     * ALWAYS save newest state.
     */
    pendingStateRef.current =
      state;

    const player =
      playerRef.current;

    if (
      !player ||
      !readyRef.current
    ) {
      return;
    }

    if (
      !isValidVideoId(
        state.videoId
      )
    ) {
      return;
    }

    const targetTime =
      getTargetTime(state);

    // ==================================================
    // CURRENT VIDEO
    // ==================================================

    const loadedVideo =
      player
        .getVideoData?.()
        ?.video_id || "";

    // ==================================================
    // DIFFERENT VIDEO
    // ==================================================

    if (
      loadedVideo !==
      state.videoId
    ) {
      const commandId =
        beginRemoteCommand();

      console.log(
        "REMOTE VIDEO:",
        state.videoId,
        state.playState,
        targetTime
      );

      /*
       * Participant must be muted
       * before loading.
       */
      if (
        !canControlRef.current
      ) {
        try {
          player.mute();
        } catch {}
      }

      player.loadVideoById({
        videoId:
          state.videoId,

        startSeconds:
          targetTime,
      });

      lastKnownTimeRef.current =
        targetTime;

      stopPolling();

      /*
       * Wait for YouTube to load.
       */
      setTimeout(() => {
        if (
          commandId !==
          remoteCommandIdRef.current
        ) {
          return;
        }

        const p =
          playerRef.current;

        if (!p) {
          return;
        }

        /*
         * VERY IMPORTANT:
         *
         * Always use latest server state.
         */
        const latest =
          pendingStateRef.current;

        if (!latest) {
          endRemoteCommand(
            commandId,
            0
          );

          return;
        }

        const latestTime =
          getTargetTime(
            latest
          );

        // ==============================================
        // PAUSED
        // ==============================================

        if (
          latest.playState ===
          "paused"
        ) {
          /*
           * NEVER play.
           */
          try {
            p.pauseVideo();
          } catch {}

          try {
            p.seekTo(
              latestTime,
              true
            );
          } catch {}

          lastKnownTimeRef.current =
            latestTime;

          stopPolling();

          endRemoteCommand(
            commandId,
            500
          );

          return;
        }

        // ==============================================
        // PLAYING
        // ==============================================

        if (
          latest.playState ===
          "playing"
        ) {
          /*
           * Participant.
           */
          if (
            !canControlRef.current
          ) {
            try {
              p.mute();
            } catch {}

            try {
              p.seekTo(
                latestTime,
                true
              );
            } catch {}

            try {
              p.playVideo();
            } catch {}

            lastKnownTimeRef.current =
              latestTime;

            endRemoteCommand(
              commandId,
              1200
            );

            return;
          }

          /*
           * Host / Moderator.
           */
          try {
            p.seekTo(
              latestTime,
              true
            );
          } catch {}

          try {
            p.playVideo();
          } catch {}

          lastKnownTimeRef.current =
            latestTime;

          startPolling();

          endRemoteCommand(
            commandId,
            1000
          );
        }
      }, 800);

      return;
    }

    // ==================================================
    // SAME VIDEO
    // ==================================================

    const currentTime =
      player.getCurrentTime?.() ||
      0;

    const drift =
      Math.abs(
        currentTime -
          targetTime
      );

    // ==================================================
    // SERVER = PLAYING
    // ==================================================

    if (
      state.playState ===
      "playing"
    ) {
      /*
       * Participant.
       */
      if (
        !canControlRef.current
      ) {
        playParticipant(
          targetTime
        );

        return;
      }

      /*
       * Host / Moderator.
       */
      const commandId =
        beginRemoteCommand();

      try {
        player.seekTo(
          targetTime,
          true
        );
      } catch {}

      try {
        player.playVideo();
      } catch {}

      lastKnownTimeRef.current =
        targetTime;

      startPolling();

      endRemoteCommand(
        commandId,
        1000
      );

      return;
    }

    // ==================================================
    // SERVER = PAUSED
    // ==================================================

    /*
     * IMPORTANT:
     *
     * If server says paused,
     * nobody should play.
     */
    const commandId =
      beginRemoteCommand();

    try {
      player.pauseVideo();
    } catch {}

    if (
      drift > 0.3
    ) {
      try {
        player.seekTo(
          targetTime,
          true
        );
      } catch {}
    }

    lastKnownTimeRef.current =
      targetTime;

    stopPolling();

    endRemoteCommand(
      commandId,
      1000
    );
  };

  // ==================================================
  // IMPERATIVE API
  // ==================================================

  useImperativeHandle(
    ref,
    () => ({
      // ================================================
      // SYNC STATE
      // ================================================

      syncState(state) {
        if (!state) {
          return;
        }

        pendingStateRef.current =
          state;

        applyState(state);
      },

      // ================================================
      // PLAY
      // ================================================

      playVideo(time = 0) {
        const player =
          playerRef.current;

        if (
          !player ||
          !readyRef.current
        ) {
          return;
        }

        const target =
          Number(time) || 0;

        const commandId =
          beginRemoteCommand();

        try {
          player.seekTo(
            target,
            true
          );
        } catch {}

        try {
          player.playVideo();
        } catch {}

        lastKnownTimeRef.current =
          target;

        startPolling();

        endRemoteCommand(
          commandId,
          1000
        );
      },

      // ================================================
      // PAUSE
      // ================================================

      pauseVideo(time = 0) {
        const player =
          playerRef.current;

        if (
          !player ||
          !readyRef.current
        ) {
          return;
        }

        const target =
          Number(time) || 0;

        const commandId =
          beginRemoteCommand();

        try {
          player.pauseVideo();
        } catch {}

        try {
          player.seekTo(
            target,
            true
          );
        } catch {}

        lastKnownTimeRef.current =
          target;

        stopPolling();

        endRemoteCommand(
          commandId,
          1000
        );
      },

      // ================================================
      // SEEK
      // ================================================

      seekTo(time) {
        const player =
          playerRef.current;

        if (
          !player ||
          !readyRef.current
        ) {
          return;
        }

        const target =
          Number(time) || 0;

        const commandId =
          beginRemoteCommand();

        try {
          player.seekTo(
            target,
            true
          );
        } catch {}

        lastKnownTimeRef.current =
          target;

        endRemoteCommand(
          commandId,
          700
        );
      },

      // ================================================
      // LOAD VIDEO
      // ================================================

      loadVideo(
        id,
        startSeconds = 0
      ) {
        const player =
          playerRef.current;

        if (
          !player ||
          !readyRef.current
        ) {
          return;
        }

        if (
          !isValidVideoId(id)
        ) {
          console.error(
            "Invalid YouTube video ID:",
            id
          );

          return;
        }

        const commandId =
          beginRemoteCommand();

        const target =
          Number(
            startSeconds
          ) || 0;

        if (
          !canControlRef.current
        ) {
          try {
            player.mute();
          } catch {}
        }

        player.loadVideoById({
          videoId: id,
          startSeconds:
            target,
        });

        lastKnownTimeRef.current =
          target;

        stopPolling();

        endRemoteCommand(
          commandId,
          1500
        );
      },

      // ================================================
      // GET CURRENT TIME
      // ================================================

      getCurrentTime() {
        return (
          playerRef.current
            ?.getCurrentTime?.() ??
          0
        );
      },
    }),
    []
  );

  // ==================================================
  // YOUTUBE STATE CHANGE
  // ==================================================

  const handleStateChange = (
    event
  ) => {
    const YT =
      window.YT;

    const player =
      playerRef.current;

    if (
      !YT ||
      !player
    ) {
      return;
    }

    // ==================================================
    // PLAYING
    // ==================================================

    if (
      event.data ===
      YT.PlayerState.PLAYING
    ) {
      const time =
        player.getCurrentTime?.() ||
        0;

      /*
       * Remote command?
       */
      if (
        applyingRemoteRef.current
      ) {
        lastKnownTimeRef.current =
          time;

        return;
      }

      /*
       * Participant never sends
       * playback events.
       */
      if (
        !canControlRef.current
      ) {
        lastKnownTimeRef.current =
          time;

        return;
      }

      /*
       * REAL LOCAL PLAY
       *
       * IMPORTANT:
       * Use onPlayRef, not old onPlay.
       */
      console.log(
        "LOCAL PLAY:",
        time,
        "ROLE:",
        canControlRef.current
      );

      lastKnownTimeRef.current =
        time;

      onPlayRef.current?.(
        time
      );

      startPolling();

      return;
    }

    // ==================================================
    // PAUSED
    // ==================================================

    if (
      event.data ===
      YT.PlayerState.PAUSED
    ) {
      const time =
        player.getCurrentTime?.() ||
        0;

      /*
       * Remote command?
       */
      if (
        applyingRemoteRef.current
      ) {
        lastKnownTimeRef.current =
          time;

        stopPolling();

        return;
      }

      /*
       * Participant never sends
       * playback events.
       */
      if (
        !canControlRef.current
      ) {
        lastKnownTimeRef.current =
          time;

        stopPolling();

        return;
      }

      /*
       * REAL LOCAL PAUSE
       *
       * IMPORTANT:
       * Use onPauseRef.
       */
      console.log(
        "LOCAL PAUSE:",
        time,
        "ROLE:",
        canControlRef.current
      );

      lastKnownTimeRef.current =
        time;

      stopPolling();

      onPauseRef.current?.(
        time
      );

      return;
    }

    // ==================================================
    // BUFFERING
    // ==================================================

    if (
      event.data ===
      YT.PlayerState.BUFFERING
    ) {
      return;
    }

    // ==================================================
    // ENDED
    // ==================================================

    if (
      event.data ===
      YT.PlayerState.ENDED
    ) {
      stopPolling();

      return;
    }
  };

  // ==================================================
  // CREATE YOUTUBE PLAYER
  // ==================================================

  useEffect(() => {
    let cancelled = false;

    const createPlayer = () => {
      if (
        cancelled ||
        !containerRef.current ||
        playerRef.current
      ) {
        return;
      }

      const options = {
        playerVars: {
          /*
           * Always enabled.
           */
          controls: 1,

          /*
           * Never autoplay before server state
           * has been applied.
           */
          autoplay: 0,

          disablekb: 0,

          modestbranding: 1,

          rel: 0,

          playsinline: 1,

          origin:
            window.location.origin,
        },

        events: {
          // ==========================================
          // READY
          // ==========================================

          onReady: () => {
            if (cancelled) {
              return;
            }

            readyRef.current =
              true;

            const player =
              playerRef.current;

            if (!player) {
              return;
            }

            /*
             * Participant muted for
             * browser autoplay.
             */
            if (
              !canControlRef.current
            ) {
              try {
                player.mute();
              } catch {}
            }

            /*
             * Safety guard: never let the initial
             * YouTube player play before the server
             * state is known.
             */
            try {
              player.pauseVideo();
            } catch {}

            /*
             * Apply latest server state.
             */
            const pending =
              pendingStateRef.current;

            if (pending) {
              applyState(
                pending
              );
            }
          },

          // ==========================================
          // STATE CHANGE
          // ==========================================

          onStateChange:
            handleStateChange,

          // ==========================================
          // ERROR
          // ==========================================

          onError: (event) => {
            console.error(
              "YouTube Player Error:",
              event.data
            );
          },
        },
      };

      /*
       * IMPORTANT:
       *
       * Do NOT pass videoId while creating
       * the YouTube player.
       *
       * Server state is the source of truth.
       */
      playerRef.current =
        new window.YT.Player(
          containerRef.current,
          options
        );
    };

    // ==================================================
    // API ALREADY READY
    // ==================================================

    if (
      window.YT &&
      window.YT.Player
    ) {
      createPlayer();
    }

    // ==================================================
    // WAIT FOR API
    // ==================================================

    else {
      const previous =
        window.onYouTubeIframeAPIReady;

      window.onYouTubeIframeAPIReady =
        () => {
          previous?.();

          createPlayer();
        };
    }

    // ==================================================
    // CLEANUP
    // ==================================================

    return () => {
      cancelled = true;

      ++remoteCommandIdRef.current;

      applyingRemoteRef.current =
        false;

      stopPolling();

      readyRef.current =
        false;

      try {
        playerRef.current?.destroy?.();
      } catch {}

      playerRef.current =
        null;
    };

    /*
     * VERY IMPORTANT:
     *
     * Player is created only once.
     */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ==================================================
  // START WATCHDOG
  // ==================================================

  useEffect(() => {
    watchdogRef.current =
      setInterval(
        runWatchdog,
        2000
      );

    return () => {
      if (
        watchdogRef.current
      ) {
        clearInterval(
          watchdogRef.current
        );

        watchdogRef.current =
          null;
      }

      stuckSinceRef.current = 0;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ==================================================
  // ROLE CHANGE
  // ==================================================

  useEffect(() => {
    canControlRef.current =
      canControl;

    /*
     * Role change ONLY changes
     * permission.
     *
     * Don't reload/pause/play/seek.
     */
  }, [canControl]);

  // ==================================================
  // UI
  // ==================================================

  return (
    <div
      className="yt-player-wrapper"
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
      }}
    >
      <div
        ref={containerRef}
        className="yt-player"
        style={{
          width: "100%",
          height: "100%",
        }}
      />

      {/*
       * Participant cannot interact.
       *
       * Host / Moderator:
       * overlay removed.
       */}
      {!canControl && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 10,
            background:
              "transparent",
          }}
        />
      )}
    </div>
  );
});

export default YouTubePlayer;