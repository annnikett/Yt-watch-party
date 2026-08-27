import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { SERVER_URL } from "../socket.js";

export default function Home() {
  const navigate = useNavigate();

  const [username, setUsername] = useState(
    () => localStorage.getItem("wp_username") || ""
  );

  const [joinCode, setJoinCode] = useState("");
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
          />
        </label>

        <button
          className="btn btn-primary"
          onClick={handleCreate}
          disabled={busy}
        >
          {busy
            ? "Creating..."
            : "Start a new room"}
        </button>

        <div className="divider">
          <span>or join one</span>
        </div>

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
            Join
          </button>
        </form>

        {error && (
          <p className="error-text">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}