import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { SERVER_URL } from "../socket.js";

export default function Home() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  /*
   * Always start blank — don't prefill from
   * localStorage. Every visitor (host or joiner)
   * types their own name fresh each time.
   */
  const [username, setUsername] = useState("");

  /*
   * If the invite link included ?code=XXXXXX,
   * pre-fill the room code field.
   */
  const [joinCode, setJoinCode] = useState(
    () => (searchParams.get("code") || "").toUpperCase()
  );

  /*
   * ==================================================
   * VIEW STATE
   * ==================================================
   *
   * "choice" — two big buttons: Create / Join.
   * "create" — only the create-room form.
   * "join"   — only the join-room form.
   *
   * Create and Join are NEVER shown together, so
   * there's nothing to misclick between them.
   *
   * If an invite link brought the visitor here
   * (?code=XXXXXX present), we skip straight to
   * the join view.
   */
  const [view, setView] = useState(
    () => (searchParams.get("code") ? "join" : "choice")
  );

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const saveUsername = (name) => {
    localStorage.setItem(
      "wp_username",
      name
    );
  };

  const handleCreate = async () => {
    if (!username.trim()) {
      setError("Enter a name first.");
      return;
    }

    setError("");
    setBusy(true);

    try {
      const res = await fetch(
        `${SERVER_URL}/api/rooms`,
        {
          method: "POST",
        }
      );

      if (!res.ok) {
        throw new Error(
          "Could not create room"
        );
      }

      const data = await res.json();

      saveUsername(
        username.trim()
      );

      navigate(
        `/room/${data.roomId}`
      );
    } catch (err) {
      setError(
        err.message ||
          "Something went wrong"
      );
    } finally {
      setBusy(false);
    }
  };

  const handleJoin = async (e) => {
    e.preventDefault();

    if (!username.trim()) {
      setError("Enter a name first.");
      return;
    }

    if (!joinCode.trim()) {
      setError("Enter a room code.");
      return;
    }

    setError("");
    setBusy(true);

    try {
      const code =
        joinCode
          .trim()
          .toUpperCase();

      const res = await fetch(
        `${SERVER_URL}/api/rooms/${code}`
      );

      if (!res.ok) {
        throw new Error(
          "Room not found. Check the code."
        );
      }

      saveUsername(
        username.trim()
      );

      navigate(
        `/room/${code}`
      );
    } catch (err) {
      setError(
        err.message ||
          "Something went wrong"
      );
    } finally {
      setBusy(false);
    }
  };

  const goToChoice = () => {
    setError("");
    setView("choice");
  };

  return (
    <div className="screen home-screen">
      <div className="marquee">
        <span className="marquee-dot" />

        <h1>Watch Party</h1>

        <p className="tagline">
          Press play together. Anywhere.
        </p>
      </div>

      <div className="card">

        {/* ==========================================
            STEP 1: CHOICE SCREEN
            Only two big buttons. No name/code
            fields yet, so nothing to misclick.
        ========================================== */}
        {view === "choice" && (
          <>
            <button
              className="btn btn-primary"
              onClick={() =>
                setView("create")
              }
            >
              Start a new room
            </button>

            <div className="divider">
              <span>or</span>
            </div>

            <button
              className="btn btn-teal"
              onClick={() =>
                setView("join")
              }
            >
              Join a room
            </button>
          </>
        )}

        {/* ==========================================
            STEP 2a: CREATE ROOM
            Only the create action is here.
        ========================================== */}
        {view === "create" && (
          <>
            <label className="field">
              <span>Your name</span>

              <input
                value={username}
                onChange={(e) =>
                  setUsername(
                    e.target.value
                  )
                }
                placeholder="e.g. Sam"
                maxLength={24}
                autoFocus
              />
            </label>

            <button
              className="btn btn-teal"
              onClick={handleCreate}
              disabled={busy}
            >
              {busy
                ? "Creating..."
                : "Start a new room"}
            </button>

            <button
              className="btn btn-danger"
              onClick={goToChoice}
              disabled={busy}
            >
              ← Back
            </button>
          </>
        )}

        {/* ==========================================
            STEP 2b: JOIN ROOM
            Only the join action is here.
        ========================================== */}
        {view === "join" && (
          <>
            <label className="field">
              <span>Your name</span>

              <input
                value={username}
                onChange={(e) =>
                  setUsername(
                    e.target.value
                  )
                }
                placeholder="e.g. Sam"
                maxLength={24}
                autoFocus
              />
            </label>

            <form
              onSubmit={handleJoin}
              className="join-form"
            >
              <input
                value={joinCode}
                onChange={(e) =>
                  setJoinCode(
                    e.target.value
                  )
                }
                placeholder="Room code (e.g. K7QX9B)"
                maxLength={6}
                className="code-input"
              />

              <button
                className="btn btn-teal"
                type="submit"
                disabled={busy}
              >
                {busy
                  ? "Joining..."
                  : "Join"}
              </button>
            </form>

            <button
              className="btn btn-danger"
              onClick={goToChoice}
              disabled={busy}
            >
              ← Back
            </button>
          </>
        )}

        {error && (
          <p className="error-text">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}