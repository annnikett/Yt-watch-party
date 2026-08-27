import { useState } from "react";

function extractVideoId(input) {
  const trimmed = input.trim();
  if (/^[\w-]{11}$/.test(trimmed)) return trimmed; // already a raw video id
  try {
    const url = new URL(trimmed);
    if (url.hostname.includes("youtu.be")) return url.pathname.slice(1);
    if (url.searchParams.get("v")) return url.searchParams.get("v");
    const shorts = url.pathname.match(/\/shorts\/([\w-]{11})/);
    if (shorts) return shorts[1];
  } catch {
    return null;
  }
  return null;
}

export default function ChangeVideoBar({ canControl, onChangeVideo }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");

  if (!canControl) return null;

  const submit = (e) => {
    e.preventDefault();
    const videoId = extractVideoId(value);
    if (!videoId) {
      setError("Paste a valid YouTube link or video ID.");
      return;
    }
    setError("");
    onChangeVideo(videoId);
    setValue("");
  };

  return (
    <form className="change-video-bar" onSubmit={submit}>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Paste a YouTube link to change the video…"
      />
      <button className="btn btn-primary" type="submit">
        Load
      </button>
      {error && <span className="error-text inline">{error}</span>}
    </form>
  );
}
