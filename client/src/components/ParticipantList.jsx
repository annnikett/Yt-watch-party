const ROLE_LABEL = {
  host: "Host",
  moderator: "Moderator",
  participant: "Participant",
};

export default function ParticipantList({ participants, you, isHost, onAction }) {
  return (
    <div className="panel participant-panel">
      <h2>Who's here <span className="count">{participants.length}</span></h2>
      <ul className="participant-list">
        {participants.map((p) => (
          <li key={p.userId} className={`participant-row role-${p.role}`}>
            <span className="avatar">{p.username.slice(0, 1).toUpperCase()}</span>
            <div className="participant-info">
              <span className="participant-name">
                {p.username}
                {p.userId === you?.userId && <em> (you)</em>}
              </span>
              <span className={`role-badge role-badge-${p.role}`}>
                {ROLE_LABEL[p.role] || p.role}
              </span>
            </div>

            {isHost && p.userId !== you?.userId && (
              <div className="participant-actions">
                {p.role !== "moderator" ? (
                  <button
                    className="pill-btn"
                    onClick={() => onAction("assign_role", { userId: p.userId, role: "moderator" })}
                  >
                    Make mod
                  </button>
                ) : (
                  <button
                    className="pill-btn"
                    onClick={() => onAction("assign_role", { userId: p.userId, role: "participant" })}
                  >
                    Remove mod
                  </button>
                )}
                <button
                  className="pill-btn"
                  onClick={() => onAction("transfer_host", { userId: p.userId })}
                >
                  Make host
                </button>
                <button
                  className="pill-btn pill-btn-danger"
                  onClick={() => onAction("remove_participant", { userId: p.userId })}
                >
                  Remove
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
