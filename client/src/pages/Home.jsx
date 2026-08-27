import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { SERVER_URL } from "../socket.js";

export default function Home() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [username, setUsername] = useState("");

  const [joinCode, setJoinCode] = useState(
    () => (searchParams.get("code") || "").toUpperCase()
  );

  const [view, setView] = useState(
    () => (searchParams.get("code") ? "join" : "choice")
  );

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [showHomeBtn, setShowHomeBtn] = useState(false);

  // ============================================
  // SHOW FLOATING HOME BUTTON ONLY WHEN
  // "HOW IT WORKS" SECTION IS IN VIEW
  // ============================================

  useEffect(() => {
    const section = document.getElementById("how-it-works");
    if (!section) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowHomeBtn(entry.isIntersecting);
      },
      { threshold: 0.15 }
    );

    observer.observe(section);

    return () => observer.disconnect();
  }, []);

  const saveUsername = (name) => {
    localStorage.setItem("wp_username", name);
  };

  // ============================================
  // CREATE ROOM
  // ============================================

  const handleCreate = async () => {
    if (!username.trim()) {
      setError("Please enter your name.");
      return;
    }

    setError("");
    setBusy(true);

    try {
      const res = await fetch(`${SERVER_URL}/api/rooms`, {
        method: "POST",
      });

      if (!res.ok) {
        throw new Error("Could not create room.");
      }

      const data = await res.json();

      saveUsername(username.trim());

      navigate(`/room/${data.roomId}`);
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  // ============================================
  // JOIN ROOM
  // ============================================

  const handleJoin = async (e) => {
    e.preventDefault();

    if (!username.trim()) {
      setError("Please enter your name.");
      return;
    }

    if (!joinCode.trim()) {
      setError("Please enter a room code.");
      return;
    }

    setError("");
    setBusy(true);

    try {
      const code = joinCode.trim().toUpperCase();

      const res = await fetch(`${SERVER_URL}/api/rooms/${code}`);

      if (!res.ok) {
        throw new Error("Room not found. Check the room code.");
      }

      saveUsername(username.trim());

      navigate(`/room/${code}`);
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="home-page">

      {/* ============================================
          FLOATING HOME BUTTON
          Only visible while "How it works" is in view
      ============================================ */}

      {showHomeBtn && (

        <button
          type="button"
          className="floating-home-btn"
          onClick={() => {
            setView("choice");
            setError("");

            window.scrollTo({
              top: 0,
              behavior: "smooth",
            });
          }}
        >
          <span className="floating-home-icon">▶</span>
          Home
        </button>

      )}


      {/* ============================================
          BACKGROUND
      ============================================ */}

      <div className="home-glow home-glow-yellow"></div>
      <div className="home-glow home-glow-cyan"></div>

      <div className="home-grid home-grid-left"></div>
      <div className="home-grid home-grid-right"></div>


      {/* ============================================
          NAVBAR
      ============================================ */}

      <header className="home-navbar">

        {/* LOGO */}

        <div
          className="home-logo"
          onClick={() => {
            setView("choice");
            setError("");

            window.scrollTo({
              top: 0,
              behavior: "smooth",
            });
          }}
        >

          <div className="logo-icon">
            ▶
          </div>

          <span>
            Watch<span>Party</span>
          </span>

        </div>


        {/* NAVIGATION */}

        <nav className="home-nav">

          <a
            href="#home"
            className="active"
          >
            Home
          </a>

          <a href="#how-it-works">
            How it works
          </a>

          <a
            href="https://github.com/annnikett/Yt-watch-party"
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>

        </nav>

      </header>


      {/* ============================================
          HOME / HERO
      ============================================ */}

      <main
        className="home-main"
        id="home"
      >

        <section className="hero-section">

          {/* BADGE */}

          <div className="hero-badge">

            <span className="hero-badge-dot"></span>

            Watch together in real-time

          </div>


          {/* TITLE */}

          <h1 className="hero-title">

            Watch Together.

            <br />

            <span>
              Anywhere.
            </span>

          </h1>


          {/* DESCRIPTION */}

          <p className="hero-description">

            Create a room and watch YouTube
            with your friends

            <br />

            in <span>perfect sync.</span>

          </p>


          {/* ========================================
              CREATE / JOIN CHOICE
          ======================================== */}

          {view === "choice" && (

            <div className="room-choice">

              {/* CREATE ROOM */}

              <button
                type="button"
                className="room-action create-action"
                onClick={() => {
                  setError("");
                  setView("create");
                }}
              >

                <div className="action-icon">
                  +
                </div>

                <div className="action-content">

                  <h2>
                    Create Room
                  </h2>

                  <p>
                    Start a new watch party
                  </p>

                </div>

                <div className="action-arrow">
                  →
                </div>

              </button>


              {/* OR */}

              <div className="choice-or">
                OR
              </div>


              {/* JOIN ROOM */}

              <button
                type="button"
                className="room-action join-action"
                onClick={() => {
                  setError("");
                  setView("join");
                }}
              >

                <div className="action-icon">
                  ↪
                </div>

                <div className="action-content">

                  <h2>
                    Join Room
                  </h2>

                  <p>
                    Join with a room code
                  </p>

                </div>

                <div className="action-arrow">
                  →
                </div>

              </button>

            </div>

          )}


          {/* ========================================
              CREATE ROOM FORM
          ======================================== */}

          {view === "create" && (

            <div className="home-form-card">

              <div className="form-heading">

                <div className="form-icon yellow">
                  +
                </div>

                <div>

                  <h2>
                    Create a Room
                  </h2>

                  <p>
                    Enter your name to get started
                  </p>

                </div>

              </div>


              <label className="home-field">

                <span>
                  Your name
                </span>

                <input
                  type="text"
                  value={username}
                  onChange={(e) =>
                    setUsername(e.target.value)
                  }
                  placeholder="e.g. Aniket"
                  maxLength={24}
                  autoFocus
                />

              </label>


              <button
                type="button"
                className="form-primary-button"
                onClick={handleCreate}
                disabled={busy}
              >

                {busy
                  ? "Creating..."
                  : "Create Room →"}

              </button>


              <button
                type="button"
                className="form-back-button"
                onClick={() => {
                  setError("");
                  setView("choice");
                }}
                disabled={busy}
              >

                ← Back

              </button>

            </div>

          )}


          {/* ========================================
              JOIN ROOM FORM
          ======================================== */}

          {view === "join" && (

            <div className="home-form-card">

              <div className="form-heading">

                <div className="form-icon cyan">
                  ↪
                </div>

                <div>

                  <h2>
                    Join a Room
                  </h2>

                  <p>
                    Enter your name and room code
                  </p>

                </div>

              </div>


              <form onSubmit={handleJoin}>

                {/* NAME */}

                <label className="home-field">

                  <span>
                    Your name
                  </span>

                  <input
                    type="text"
                    value={username}
                    onChange={(e) =>
                      setUsername(e.target.value)
                    }
                    placeholder="e.g. Aniket"
                    maxLength={24}
                    autoFocus
                  />

                </label>


                {/* ROOM CODE */}

                <label className="home-field">

                  <span>
                    Room code
                  </span>

                  <input
                    type="text"
                    value={joinCode}
                    onChange={(e) =>
                      setJoinCode(
                        e.target.value.toUpperCase()
                      )
                    }
                    placeholder="ABC123"
                    maxLength={6}
                    className="room-code-input"
                  />

                </label>


                <button
                  type="submit"
                  className="form-cyan-button"
                  disabled={busy}
                >

                  {busy
                    ? "Joining..."
                    : "Join Room →"}

                </button>

              </form>


              <button
                type="button"
                className="form-back-button"
                onClick={() => {
                  setError("");
                  setView("choice");
                }}
                disabled={busy}
              >

                ← Back

              </button>

            </div>

          )}


          {/* ERROR */}

          {error && (

            <div className="home-error">
              {error}
            </div>

          )}

        </section>

      </main>


      {/* ============================================
          HOW IT WORKS
          SEPARATE SECTION
      ============================================ */}

      <section
        className="how-it-works"
        id="how-it-works"
      >

        <div className="how-header">

          <div className="how-badge">
            HOW IT WORKS
          </div>

          <h2>
            Watch together in
            <span>
              {" "}four simple steps.
            </span>
          </h2>

          <p>
            Create a room, invite your friends,
            and start watching YouTube together.
          </p>

        </div>


        {/* STEPS */}

        <div className="steps-container">


          {/* STEP 01 */}

          <div className="step-card">

            <div className="step-number">
              01
            </div>

            <div className="step-icon yellow-step">
              +
            </div>

            <h3>
              Create a Room
            </h3>

            <p>
              Start a new watch party and
              get a unique room code.
            </p>

          </div>


          {/* STEP 02 */}

          <div className="step-card">

            <div className="step-number">
              02
            </div>

            <div className="step-icon cyan-step">
              ↗
            </div>

            <h3>
              Invite Friends
            </h3>

            <p>
              Share your room code with
              friends and let them join.
            </p>

          </div>


          {/* STEP 03 */}

          <div className="step-card">

            <div className="step-number">
              03
            </div>

            <div className="step-icon yellow-step">
              ▶
            </div>

            <h3>
              Choose a Video
            </h3>

            <p>
              Add a YouTube video and
              start watching together.
            </p>

          </div>


          {/* STEP 04 */}

          <div className="step-card">

            <div className="step-number">
              04
            </div>

            <div className="step-icon cyan-step">
              ⚡
            </div>

            <h3>
              Watch in Sync
            </h3>

            <p>
              Play, pause and seek together
              in real time.
            </p>

          </div>

        </div>


        {/* HOST / MODERATOR */}

        <div className="sync-info">

          <div className="sync-info-icon">
            👑
          </div>

          <div>

            <h3>
              Host & Moderator Controls
            </h3>

            <p>
              Hosts and moderators can play,
              pause, seek and change videos
              while everyone stays synchronized.
            </p>

          </div>

        </div>

      </section>


      {/* ============================================
          FOOTER
      ============================================ */}

      <footer className="home-footer">
        WatchParty · Watch together, anywhere.
      </footer>

    </div>
  );
}