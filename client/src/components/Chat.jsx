import { useEffect, useRef, useState } from "react";

export default function Chat({ messages, you, onSend }) {
  const [text, setText] = useState("");
  const listRef = useRef(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages]);

  const submit = (e) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText("");
  };

  return (
    <div className="panel chat-panel">
      <h2>Chat</h2>
      <div className="chat-messages" ref={listRef}>
        {messages.length === 0 && <p className="chat-empty">No messages yet — say hi.</p>}
        {messages.map((m) => (
          <div key={m.id} className={`chat-msg ${m.userId === you?.userId ? "own" : ""}`}>
            <span className="chat-author">{m.username}</span>
            <span className="chat-text">{m.text}</span>
          </div>
        ))}
      </div>
      <form className="chat-input-row" onSubmit={submit}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Send a message"
          maxLength={500}
        />
        <button className="btn btn-ghost" type="submit">Send</button>
      </form>
    </div>
  );
}
