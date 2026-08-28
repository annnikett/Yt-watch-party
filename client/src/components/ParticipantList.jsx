import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const ROLE_LABEL = {
  host: "Host",
  moderator: "Moderator",
  participant: "Participant",
};

function ActionsMenu({ participant, onAction }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  const positionMenu = () => {
    const btn = triggerRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const menuWidth = 190;
    let left = rect.right - menuWidth;
    if (left < 8) left = 8;
    setCoords({ top: rect.bottom + 6, left });
  };

  const toggleOpen = () => {
    if (!open) positionMenu();
    setOpen((v) => !v);
  };

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e) => {
      if (triggerRef.current && triggerRef.current.contains(e.target)) return;
      if (menuRef.current && menuRef.current.contains(e.target)) return;
      setOpen(false);
    };
    const handleEscape = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    const handleReposition = () => positionMenu();

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    window.addEventListener("scroll", handleReposition, true);
    window.addEventListener("resize", handleReposition);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
      window.removeEventListener("scroll", handleReposition, true);
      window.removeEventListener("resize", handleReposition);
    };
  }, [open]);

  const run = (type, payload) => {
    onAction(type, payload);
    setOpen(false);
  };

  return (
    <div className="action-dropdown">
      <button
        type="button"
        ref={triggerRef}
        className="action-trigger"
        onClick={toggleOpen}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Participant actions"
        title="Actions"
      >
        <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="4" r="1.6" fill="currentColor" />
          <circle cx="10" cy="10" r="1.6" fill="currentColor" />
          <circle cx="10" cy="16" r="1.6" fill="currentColor" />
        </svg>
      </button>

      {open &&
        createPortal(
          <div
            className="action-menu"
            role="menu"
            ref={menuRef}
            style={{ position: "fixed", top: coords.top, left: coords.left }}
          >
            {participant.role !== "moderator" ? (
              <button
                type="button"
                className="action-menu-item"
                role="menuitem"
                onClick={() =>
                  run("assign_role", { userId: participant.userId, role: "moderator" })
                }
              >
                <span className="action-menu-icon action-menu-icon-mod">M</span>
                Make moderator
              </button>
            ) : (
              <button
                type="button"
                className="action-menu-item"
                role="menuitem"
                onClick={() =>
                  run("assign_role", { userId: participant.userId, role: "participant" })
                }
              >
                <span className="action-menu-icon action-menu-icon-mod">M</span>
                Remove moderator
              </button>
            )}

            <button
              type="button"
              className="action-menu-item"
              role="menuitem"
              onClick={() => run("transfer_host", { userId: participant.userId })}
            >
              <span className="action-menu-icon action-menu-icon-host">H</span>
              Make host
            </button>

            <div className="action-menu-divider" />

            <button
              type="button"
              className="action-menu-item action-menu-item-danger"
              role="menuitem"
              onClick={() => run("remove_participant", { userId: participant.userId })}
            >
              <span className="action-menu-icon action-menu-icon-danger">✕</span>
              Remove from room
            </button>
          </div>,
          document.body
        )}
    </div>
  );
}

export default function ParticipantList({ participants, you, isHost, onAction }) {
  return (
    <div className="panel participant-panel">
      <h2>Who's here <span className="count">{participants.length}</span></h2>
      <ul className="participant-list">
        {participants.map((p) => (
          <li
            key={p.userId}
            className={`participant-row role-${p.role}`}
            title={ROLE_LABEL[p.role] || p.role}
          >
            <span className="avatar">{p.username.slice(0, 1).toUpperCase()}</span>

            <div className="participant-info">
              <span className="participant-name">
                {p.username}
                {p.userId === you?.userId && <em> (you)</em>}
              </span>
              <span className={`role-dot role-dot-${p.role}`} aria-hidden="true" />
            </div>

            {isHost && p.userId !== you?.userId && (
              <div className="participant-actions">
                <ActionsMenu participant={p} onAction={onAction} />
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}