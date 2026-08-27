import { useState } from "react";
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

  const saveUsername = (name) => {
    localStorage.setItem("wp_username", name);
  };

  // CREATE ROOM
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

  // JOIN ROOM
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

      {/* Background */}
      <div className="home-glow home-glow-yellow"></div>
      <div className="home-glow home-glow-cyan"></div>

      <div className="home-grid home-grid-left"></div>
      <div className="home-grid home-grid-right"></div>

      {/* ================= NAVBAR ================= */}

      <header className="home-navbar">

        <div
          className="home-logo"
          onClick={() => setView("choice")}
        >
          <div className="logo-icon">
            ▶
          </div>

          <span>
            Watch<span>Party</span>
          </span>
        </div>

        <nav className="home-nav">

          <a href="#home" className="active">
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

      {/* ================= MAIN ================= */}

      <main className="home-main" id="home">

        <section className="hero-section">

          {/* Badge */}

          <div className="hero-badge">
            <span className="hero-badge-dot"></span>
            Watch together in real-time
          </div>

          {/* Heading */}

          <h1 className="hero-title">
            Watch Together.
            <br />
            <span>Anywhere.</span>
          </h1>

          {/* Description */}

          <p className="hero-description">
            Create a room and watch YouTube with your friends
            <br />
            in <span>perfect sync.</span>
          </p>

          {/* ================= CHOICE ================= */}

          {view === "choice" && (
            <div className="room-choice">

              {/* CREATE */}

              <button
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
                  <h2>Create Room</h2>
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

              {/* JOIN */}

              <button
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
                  <h2>Join Room</h2>
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

          {/* ================= CREATE FORM ================= */}

          {view === "create" && (
            <div className="home-form-card">

              <div className="form-heading">

                <div className="form-icon yellow">
                  +
                </div>

                <div>
                  <h2>Create a Room</h2>
                  <p>
                    Enter your name to get started
                  </p>
                </div>

              </div>

              <label className="home-field">
                <span>Your name</span>

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
                className="form-primary-button"
                onClick={handleCreate}
                disabled={busy}
              >
                {busy
                  ? "Creating..."
                  : "Create Room →"}
              </button>

              <button
                className="form-back-button"
                onClick={() => {
                  setError("");
                  setView("choice");
                }}
              >
                ← Back
              </button>

            </div>
          )}

          {/* ================= JOIN FORM ================= */}

          {view === "join" && (
            <div className="home-form-card">

              <div className="form-heading">

                <div className="form-icon cyan">
                  ↪
                </div>

                <div>
                  <h2>Join a Room</h2>
                  <p>
                    Enter your name and room code
                  </p>
                </div>

              </div>

              <form onSubmit={handleJoin}>

                <label className="home-field">
                  <span>Your name</span>

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

                <label className="home-field">
                  <span>Room code</span>

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
                  className="form-cyan-button"
                  type="submit"
                  disabled={busy}
                >
                  {busy
                    ? "Joining..."
                    : "Join Room →"}
                </button>

              </form>

              <button
                className="form-back-button"
                onClick={() => {
                  setError("");
                  setView("choice");
                }}
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

        {/* ================= FEATURES ================= */}

        <section
          className="home-features"
          id="how-it-works"
        >

          <div className="feature-item">

            <div className="feature-icon yellow-icon">
              ⚡
            </div>

            <div>
              <h3>Real-time Sync</h3>
              <p>
                Everyone stays in perfect sync
              </p>
            </div>

          </div>

          <div className="feature-divider"></div>

          <div className="feature-item">

            <div className="feature-icon cyan-icon">
              💬
            </div>

            <div>
              <h3>Live Chat</h3>
              <p>
                Chat with your friends while watching
              </p>
            </div>

          </div>

          <div className="feature-divider"></div>

          <div className="feature-item">

            <div className="feature-icon yellow-icon">
              👥
            </div>

            <div>
              <h3>Watch Together</h3>
              <p>
                Enjoy YouTube with your friends
              </p>
            </div>

          </div>

        </section>

      </main>

      <footer className="home-footer">
        WatchParty · Watch together, anywhere.
      </footer>

    </div>
  );
}