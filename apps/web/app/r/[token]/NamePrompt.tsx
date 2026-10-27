"use client";

import { useState } from "react";

export function NamePrompt({
  initialName = "",
  initialEmail = "",
  onSubmit,
  onCancel,
}: {
  initialName?: string | undefined;
  initialEmail?: string | undefined;
  onSubmit: (name: string, email: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onSubmit(trimmed, email.trim());
  }

  return (
    <div className="modalBackdrop">
      <div role="dialog" aria-modal="true" aria-labelledby="name-prompt-title" className="modal">
        <form onSubmit={handleSubmit}>
          <h2 id="name-prompt-title" className="modalTitle">
            {initialName ? "Update your name" : "What's your name?"}
          </h2>
          <p className="modalText">So the team knows who left each comment. No account needed.</p>
          <div className="stack">
            <input
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              required
              className="input"
            />
            <input
              type="email"
              placeholder="Email (optional)"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
            />
            <div className="composerActions">
              <button type="button" className="btn btnGhost" onClick={onCancel}>
                Cancel
              </button>
              <button type="submit" className="btn btnPrimary">
                Continue
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
