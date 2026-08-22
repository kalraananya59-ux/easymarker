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
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
      }}
    >
      <div role="dialog" aria-modal="true" style={{ background: "white", borderRadius: 8, padding: 24, width: 320 }}>
        <form onSubmit={handleSubmit}>
          <p>{initialName ? "Update your name" : "What's your name?"}</p>
          <input
            type="text"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            required
            style={{ width: "100%", marginBottom: 8 }}
          />
          <input
            type="email"
            placeholder="Email (optional)"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: "100%", marginBottom: 8 }}
          />
          <button type="submit">Continue</button>
          <button type="button" onClick={onCancel}>
            Cancel
          </button>
        </form>
      </div>
    </div>
  );
}
