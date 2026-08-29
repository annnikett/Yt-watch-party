import { useState } from "react";

import { extractVideoId } from "./ChangeVideoBar.jsx";

export default function Queue({
  queue,
  you,
  canControl,
  onAdd,
  onRemove,
  onPlayNow,
}) {
  const [value, setValue] = useState("");
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");

  const submit = (e) => {
    e.preventDefault();

    const videoId = extractVideoId(value);

    if (!videoId) {
      setError("Paste a valid YouTube link or video ID.");
      return;
    }

    setError("");
    onAdd(videoId, title.trim());
    setValue("");
    setTitle("");
  };

  return (
    <div className="panel queue-panel">
      <h2>
        Queue <span className="count">{queue.length}</span>
      </h2>

      <div className="queue-list">
        {queue.length === 0 && (
          <p className="chat-empty">Queue is empty — add a video below.</p>
        )}

        {queue.map((item) => {
          const isOwner = item.addedByUserId === you?.userId;

          return (
            <div key={item.id} className="queue-item">
              <img
                className="queue-thumb"
                src={`https://i.ytimg.com/vi/${item.videoId}/default.jpg`}
                alt=""
                loading="lazy"
              />

              <div className="queue-item-info">
                <span className="queue-item-title">
                  {item.title || item.videoId}
                </span>
                <span className="queue-item-added-by">
                  Added by {isOwner ? "you" : item.addedBy}
                </span>
              </div>

              <div className="queue-item-actions">
                {canControl && (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => onPlayNow(item.id)}
                  >
                    Play
                  </button>
                )}

                {(canControl || isOwner) && (
                  <button
                    type="button"
                    className="pill-btn pill-btn-danger queue-remove-btn"
                    onClick={() => onRemove(item.id)}
                    title="Remove from queue"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <form className="queue-add-form" onSubmit={submit}>
        <input
          className="queue-title-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title (optional)"
          maxLength={200}
        />

        <div className="chat-input-row">
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Paste a YouTube link to add to queue…"
          />
          <button className="btn btn-gold" type="submit">
            Add
          </button>
        </div>
      </form>

      {error && <span className="error-text inline">{error}</span>}
    </div>
  );
}