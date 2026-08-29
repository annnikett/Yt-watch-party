import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

function formatTime(seconds) {
  const total = Math.max(
    0,
    Math.floor(
      Number(seconds) || 0
    )
  );

  const mins = Math.floor(
    total / 60
  );

  const secs = total % 60;

  return `${mins}:${String(
    secs
  ).padStart(2, "0")}`;
}

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
  const wrapperRef = useRef(null);

  const readyRef = useRef(false);

  /*
   * Participants (like the Host) get
   * auto-unmuted right after each video
   * actually starts playing -- see
   * safePlay() below. This tracks whether
   * THEY have chosen to mute themselves
   * with the small button, so that
   * preference survives video changes.
   * Default: sound ON.
   */
  const [
    participantMuted,
    setParticipantMuted,
  ] = useState(false);

  const participantMutedRef =
    useRef(false);

  useEffect(() => {
    participantMutedRef.current =
      participantMuted;
  }, [participantMuted]);

  /*
   * Our overlay blocks clicks straight
   * through to YouTube's own fullscreen
   * button too (same reason as mute), so
   * Participants get their own button
   * that fullscreens the whole player
   * wrapper (video + overlay together).
   */
  const [
    isFullscreen,
    setIsFullscreen,
  ] = useState(false);

  /*
   * Some browser extensions (ad blockers
   * etc) can silently disable clicks on
   * YouTube's OWN control bar inside the
   * iframe. Rather than depend on that,
   * Host/Moderator get their own guaranteed
   * Play/Pause button that goes through the
   * exact same server round-trip a real
   * click on the native controls would have
   * triggered (onPlay / onPause props).
   */
  const [
    hostPlaying,
    setHostPlaying,
  ] = useState(false);

  /*
   * Custom control bar state (Host/
   * Moderator only -- native controls
   * are off, see playerVars.controls
   * above).
   */
  const [
    hostMuted,
    setHostMuted,
  ] = useState(false);

  const [
    progress,
    setProgress,
  ] = useState({
    current: 0,
    duration: 0,
  });

  const seekBarRef =
    useRef(null);

  useEffect(() => {
    const handleChange = () => {
      setIsFullscreen(
        Boolean(
          document.fullscreenElement
        )
      );
    };

    document.addEventListener(
      "fullscreenchange",
      handleChange
    );

    return () => {
      document.removeEventListener(
        "fullscreenchange",
        handleChange
      );
    };
  }, []);

  /*
   * Shows a loading indicator while the
   * YouTube iframe's own content is still
   * fetching (slow network etc), instead
   * of a confusing plain black box.
   */
  const [
    videoLoading,
    setVideoLoading,
  ] = useState(false);

  const loadedVideoIdRef =
    useRef("");

  const videoLoadingTimeoutRef =
    useRef(null);

  const beginVideoLoading = () => {
    setVideoLoading(true);

    if (
      videoLoadingTimeoutRef.current
    ) {
      clearTimeout(
        videoLoadingTimeoutRef.current
      );
    }

    /*
     * Safety net: if the iframe never
     * fires a single state event (e.g.
     * embedding disabled for this
     * video), don't spin forever.
     */
    videoLoadingTimeoutRef.current =
      setTimeout(() => {
        setVideoLoading(false);
      }, 8000);
  };

  const clearVideoLoading = () => {
    if (
      videoLoadingTimeoutRef.current
    ) {
      clearTimeout(
        videoLoadingTimeoutRef.current
      );

      videoLoadingTimeoutRef.current =
        null;
    }

    setVideoLoading(false);
  };

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

        /*
         * Drive the custom seek bar.
         */
        setProgress({
          current,
          duration:
            player.getDuration?.() ||
            0,
        });

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

    safePlay(
      player,
      targetTime,
      canControlRef.current ||
        !participantMutedRef.current
    );

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
  // SAFE AUTOPLAY (avoid browser autoplay-block)
  // ==================================================

  /*
   * Browsers silently block a programmatic playVideo()
   * call that carries audio UNLESS it happens directly
   * inside a user gesture (a click handler).
   *
   * Our play/seek/load commands arrive after a socket
   * round-trip (and sometimes an extra setTimeout), so
   * by the time playVideo() actually runs, the browser
   * no longer considers it "the user just clicked
   * something" -- audible autoplay can get blocked with
   * no error, which is why the video sometimes looks
   * stuck / black until you interact with it.
   *
   * Fix: ALWAYS start muted (muted autoplay is never
   * blocked), then unmute right after playback has
   * begun. Unmuting AFTER playback already started is
   * not treated as "autoplay with sound" by browsers, so
   * it works reliably -- for BOTH Host/Moderator and
   * Participants. Whether to unmute is decided by the
   * caller (unmuteAfter), not by role.
   */
  const safePlay = (
    player,
    targetTime,
    unmuteAfter = false
  ) => {
    try {
      player.mute();
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

    if (unmuteAfter) {
      setTimeout(() => {
        try {
          playerRef.current?.unMute();
        } catch {}
      }, 300);
    }
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

    const commandId =
      beginRemoteCommand();

    /*
     * Starts muted (autoplay-safe), then
     * auto-unmutes -- unless the participant
     * has chosen to mute themselves.
     */
    safePlay(
      player,
      targetTime,
      !participantMutedRef.current
    );

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

    /*
     * Drives our own Play/Pause button
     * (see hostPlaying state below) --
     * server is the source of truth for
     * this, independent of whatever the
     * YouTube iframe's native UI is doing.
     */
    setHostPlaying(
      state.playState ===
        "playing"
    );

    /*
     * Seed the custom seek bar right
     * away from server state; the
     * polling loop keeps it live while
     * playing.
     */
    setProgress(
      (prev) => ({
        current: Number(
          state.currentTime
        ) || 0,
        duration:
          prev.duration,
      })
    );

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
       * ALWAYS mute before loading, for
       * EVERYONE (Host/Moderator too).
       *
       * loadVideoById() auto-plays the
       * video, but by the time this runs
       * we're several ticks removed from
       * any user click (socket round-trip
       * in between) -- browsers silently
       * block unmuted autoplay in that
       * case, which is exactly what made
       * the video look "stuck" for the
       * Host. Muting first guarantees the
       * load/autoplay always succeeds;
       * safePlay() below already handles
       * unmuting again once real playback
       * has genuinely started.
       */
      try {
        player.mute();
      } catch {}

      player.loadVideoById({
        videoId:
          state.videoId,

        startSeconds:
          targetTime,
      });

      loadedVideoIdRef.current =
        state.videoId;

      beginVideoLoading();

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
         * Duration is only known once
         * the new video's metadata has
         * loaded -- refresh the seek bar.
         */
        setProgress(
          (prev) => ({
            current:
              prev.current,
            duration:
              p.getDuration?.() ||
              0,
          })
        );

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
            safePlay(
              p,
              latestTime,
              !participantMutedRef.current
            );

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
          safePlay(
            p,
            latestTime,
            true
          );

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

      safePlay(
        player,
        targetTime,
        true
      );

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

        safePlay(
          player,
          target,
          canControlRef.current
        );

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

        /*
         * ALWAYS mute before loading (see
         * matching comment in applyState) --
         * avoids the blocked-autoplay "stuck
         * video" for Host/Moderator too.
         */
        try {
          player.mute();
        } catch {}

        player.loadVideoById({
          videoId: id,
          startSeconds:
            target,
        });

        loadedVideoIdRef.current =
          id;

        beginVideoLoading();

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

    /*
     * Any real state event means the
     * iframe's content has actually
     * loaded and is responding -- clear
     * the loading indicator.
     */
    clearVideoLoading();

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
           * Native YouTube controls are
           * OFF -- we render our own full
           * control bar below (Play/Pause,
           * Mute, Seek, Fullscreen). This
           * avoids any dependence on the
           * iframe's own clickable UI,
           * which some browser extensions
           * (ad blockers etc) can silently
           * break.
           */
          controls: 0,

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

      if (
        videoLoadingTimeoutRef.current
      ) {
        clearTimeout(
          videoLoadingTimeoutRef.current
        );

        videoLoadingTimeoutRef.current =
          null;
      }

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
  // PARTICIPANT MUTE TOGGLE
  // ==================================================

  const toggleParticipantMute = () => {
    const player =
      playerRef.current;

    if (!player) {
      return;
    }

    const next =
      !participantMuted;

    try {
      if (next) {
        player.mute();
      } else {
        player.unMute();
      }
    } catch {}

    setParticipantMuted(next);
  };

  // ==================================================
  // HOST PLAY/PAUSE TOGGLE
  // ==================================================

  /*
   * Bypasses YouTube's own iframe UI
   * entirely. Uses the exact same path
   * a real native-controls click would:
   * onPlay/onPause -> socket -> server
   * -> sync_state -> safePlay(), which
   * already handles the mute-then-unmute
   * autoplay workaround correctly.
   */
  const toggleHostPlayback = () => {
    const player =
      playerRef.current;

    if (!player) {
      return;
    }

    const time =
      player.getCurrentTime?.() ??
      pendingStateRef.current
        ?.currentTime ??
      0;

    if (hostPlaying) {
      onPauseRef.current?.(
        time
      );
    } else {
      onPlayRef.current?.(
        time
      );
    }
  };

  // ==================================================
  // HOST MUTE TOGGLE
  // ==================================================

  const toggleHostMute = () => {
    const player =
      playerRef.current;

    if (!player) {
      return;
    }

    const next =
      !hostMuted;

    try {
      if (next) {
        player.mute();
      } else {
        player.unMute();
      }
    } catch {}

    setHostMuted(next);
  };

  // ==================================================
  // HOST SEEK BAR
  // ==================================================

  const handleSeekBarClick = (
    event
  ) => {
    const player =
      playerRef.current;

    const bar =
      seekBarRef.current;

    if (
      !player ||
      !bar ||
      !progress.duration
    ) {
      return;
    }

    const rect =
      bar.getBoundingClientRect();

    const ratio =
      Math.min(
        1,
        Math.max(
          0,
          (event.clientX -
            rect.left) /
            rect.width
        )
      );

    const target =
      ratio *
      progress.duration;

    setProgress(
      (prev) => ({
        current: target,
        duration:
          prev.duration,
      })
    );

    /*
     * Goes through the same
     * onSeekRef -> socket -> server
     * -> sync_state round-trip a
     * detected native seek would
     * have used.
     */
    onSeekRef.current?.(
      target
    );
  };

  // ==================================================
  // FULLSCREEN TOGGLE
  // ==================================================

  const toggleFullscreen = () => {
    const el =
      wrapperRef.current;

    if (!el) {
      return;
    }

    try {
      if (
        document.fullscreenElement
      ) {
        document.exitFullscreen?.();
      } else {
        el.requestFullscreen?.();
      }
    } catch {}
  };

  // ==================================================
  // UI
  // ==================================================

  return (
    <div
      ref={wrapperRef}
      className="yt-player-wrapper"
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        background: "#000",
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
       * Shown while the YouTube iframe's
       * own content is still fetching
       * (slow network) -- so a loading
       * video doesn't look "stuck".
       */}
      {videoLoading && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 9,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent:
              "center",
            gap: 10,
            background:
              "rgba(0,0,0,0.55)",
            color: "#fff",
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              border:
                "3px solid rgba(255,255,255,0.25)",
              borderTopColor:
                "#fff",
              borderRadius: "50%",
              animation:
                "yt-spin 0.8s linear infinite",
            }}
          />

          <span
            style={{
              fontSize: 13,
              opacity: 0.85,
            }}
          >
            Video load ho raha
            hai…
          </span>

          <style>
            {`@keyframes yt-spin { to { transform: rotate(360deg); } }`}
          </style>
        </div>
      )}

      {/*
       * Participant cannot interact
       * with play/pause/seek.
       *
       * Sound auto-unmutes on join
       * (see safePlay); the mute
       * button is just a manual
       * override. Fullscreen button
       * is needed too, since the
       * overlay also blocks clicks
       * to YouTube's own fullscreen
       * control.
       *
       * Host / Moderator:
       * overlay removed (full native
       * controls, including volume
       * and fullscreen).
       */}
      {/*
       * Host / Moderator: full custom
       * control bar. Native YouTube
       * controls are OFF (playerVars
       * .controls = 0), so this is the
       * ONLY way to control playback --
       * guaranteed to work regardless
       * of browser extensions messing
       * with the iframe's own UI.
       */}
      {canControl && (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 11,
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding:
              "8px 12px",
            background:
              "linear-gradient(to top, rgba(0,0,0,0.75), rgba(0,0,0,0))",
          }}
        >
          <button
            type="button"
            onClick={
              toggleHostPlayback
            }
            style={{
              background:
                "rgba(0,0,0,0.65)",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              padding:
                "6px 12px",
              fontSize: 13,
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            {hostPlaying
              ? "⏸"
              : "▶"}
          </button>

          <div
            ref={seekBarRef}
            onClick={
              handleSeekBarClick
            }
            style={{
              flex: 1,
              height: 6,
              borderRadius: 999,
              background:
                "rgba(255,255,255,0.25)",
              cursor: "pointer",
              position: "relative",
            }}
          >
            <div
              style={{
                position:
                  "absolute",
                left: 0,
                top: 0,
                bottom: 0,
                borderRadius: 999,
                background:
                  "#fff",
                width: `${
                  progress.duration
                    ? Math.min(
                        100,
                        (progress.current /
                          progress.duration) *
                          100
                      )
                    : 0
                }%`,
              }}
            />
          </div>

          <span
            style={{
              color: "#fff",
              fontSize: 12,
              flexShrink: 0,
              minWidth: 80,
              textAlign:
                "center",
            }}
          >
            {formatTime(
              progress.current
            )}{" "}
            /{" "}
            {formatTime(
              progress.duration
            )}
          </span>

          <button
            type="button"
            onClick={
              toggleHostMute
            }
            style={{
              background:
                "rgba(0,0,0,0.65)",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              padding:
                "6px 12px",
              fontSize: 13,
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            {hostMuted
              ? "🔇"
              : "🔊"}
          </button>

          <button
            type="button"
            onClick={
              toggleFullscreen
            }
            style={{
              background:
                "rgba(0,0,0,0.65)",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              padding:
                "6px 12px",
              fontSize: 13,
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            {isFullscreen
              ? "⤡"
              : "⤢"}
          </button>
        </div>
      )}

      {!canControl && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 10,
            background:
              "transparent",
          }}
        >
          <div
            style={{
              position:
                "absolute",
              bottom: 12,
              right: 12,
              zIndex: 11,
              display: "flex",
              gap: 8,
            }}
          >
            <button
              type="button"
              onClick={
                toggleParticipantMute
              }
              style={{
                background:
                  "rgba(0,0,0,0.65)",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                padding:
                  "6px 12px",
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              {participantMuted
                ? "🔇 Unmute"
                : "🔊 Mute"}
            </button>

            <button
              type="button"
              onClick={
                toggleFullscreen
              }
              style={{
                background:
                  "rgba(0,0,0,0.65)",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                padding:
                  "6px 12px",
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              {isFullscreen
                ? "⤡ Exit"
                : "⤢ Full"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

export default YouTubePlayer;