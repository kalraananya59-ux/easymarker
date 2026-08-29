"use client";

import { useEffect, useRef, useState } from "react";
import { NamePrompt } from "./NamePrompt";
import { CommentSidebar } from "./CommentSidebar";
import { readGuestIdentity, writeGuestIdentity, type GuestIdentity } from "@/lib/guest-client";
import type { CommentData } from "./types";

interface PendingPin {
  xPct: number;
  yPct: number;
}

export function ReviewOverlay({
  projectId,
  imageSrc,
  imageAlt,
  isOwner,
  initialComments,
}: {
  projectId: string;
  imageSrc: string;
  imageAlt: string;
  isOwner: boolean;
  initialComments: CommentData[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [comments, setComments] = useState<CommentData[]>(initialComments);
  const [pendingPin, setPendingPin] = useState<PendingPin | null>(null);
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [draftText, setDraftText] = useState("");
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [guestIdentity, setGuestIdentity] = useState<GuestIdentity | null>(null);

  useEffect(() => {
    if (!isOwner) setGuestIdentity(readGuestIdentity());
  }, [isOwner]);

  function saveGuestIdentity(name: string, email: string) {
    const identity: GuestIdentity = email ? { name, email } : { name };
    writeGuestIdentity(identity);
    setGuestIdentity(identity);
  }

  function handleContainerClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target !== e.currentTarget && !(e.target as HTMLElement).matches("img")) return;
    const rect = containerRef.current!.getBoundingClientRect();
    const xPct = (e.clientX - rect.left) / rect.width;
    const yPct = (e.clientY - rect.top) / rect.height;

    setActiveCommentId(null);
    setPendingPin({ xPct, yPct });

    if (!isOwner && !guestIdentity) {
      setShowNamePrompt(true);
    }
  }

  async function submitComment() {
    if (!pendingPin || !draftText.trim()) return;
    const identity = isOwner ? { name: "You" } : guestIdentity;
    if (!identity) {
      setShowNamePrompt(true);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          projectId,
          anchor: { strategy: "percentage", xPct: pendingPin.xPct, yPct: pendingPin.yPct, confidence: 1 },
          body: draftText.trim(),
          positionX: pendingPin.xPct,
          positionY: pendingPin.yPct,
          reviewerName: identity.name,
          reviewerEmail: identity.email,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setComments((prev) => [...prev, { ...data.comment, replies: [], statusChanges: [] }]);
        setPendingPin(null);
        setDraftText("");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReply(commentId: string, body: string) {
    const identity = isOwner ? { name: "You" } : guestIdentity;
    const res = await fetch(`/api/comments/${commentId}/replies`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ body, authorName: identity?.name }),
    });
    const data = await res.json();
    if (res.ok) {
      setComments((prev) =>
        prev.map((c) => (c.id === commentId ? { ...c, replies: [...c.replies, data.reply] } : c))
      );
    }
  }

  async function handleStatusChange(commentId: string, status: CommentData["status"]) {
    const res = await fetch(`/api/comments/${commentId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const data = await res.json();
    if (res.ok) {
      setComments((prev) =>
        prev.map((c) =>
          c.id === commentId
            ? { ...c, status, statusChanges: data.statusChange ? [...c.statusChanges, data.statusChange] : c.statusChanges }
            : c
        )
      );
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, display: "flex" }}>
      <div
        ref={containerRef}
        onClick={handleContainerClick}
        style={{ position: "relative", flex: 1, display: "flex", alignItems: "center", justifyContent: "center", cursor: "crosshair", overflow: "auto" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageSrc} alt={imageAlt} style={{ maxWidth: "100%", maxHeight: "100%" }} draggable={false} />

        {comments.map((c) => (
          <button
            key={c.id}
            type="button"
            aria-label={`Comment by ${c.reviewerName}`}
            onClick={(e) => {
              e.stopPropagation();
              setActiveCommentId(c.id);
              setPendingPin(null);
            }}
            style={{
              position: "absolute",
              left: `${c.positionX * 100}%`,
              top: `${c.positionY * 100}%`,
              width: 28,
              height: 28,
              borderRadius: "50% 50% 50% 0",
              transform: "translate(-50%, -100%) rotate(-45deg)",
              background: c.status === "resolved" ? "#94a3b8" : c.id === activeCommentId ? "#d97706" : "#2563eb",
              border: "none",
              cursor: "pointer",
            }}
          />
        ))}

        {pendingPin && (
          <div
            style={{
              position: "absolute",
              left: `${pendingPin.xPct * 100}%`,
              top: `${pendingPin.yPct * 100}%`,
              transform: "translate(-50%, -100%)",
              background: "white",
              border: "1px solid #e2e8f0",
              borderRadius: 8,
              padding: 8,
              width: 240,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <textarea
              value={draftText}
              onChange={(e) => setDraftText(e.target.value)}
              placeholder="Leave feedback…"
              autoFocus
              rows={3}
              style={{ width: "100%" }}
            />
            <button type="button" onClick={submitComment} disabled={submitting || !draftText.trim()}>
              {submitting ? "Posting…" : "Comment"}
            </button>
            <button type="button" onClick={() => setPendingPin(null)}>
              Cancel
            </button>
          </div>
        )}
      </div>

      <div style={{ width: 340, borderLeft: "1px solid #e2e8f0", overflowY: "auto" }}>
        <CommentSidebar
          comments={comments}
          activeCommentId={activeCommentId}
          onSelectComment={setActiveCommentId}
          isOwner={isOwner}
          onReply={handleReply}
          onStatusChange={handleStatusChange}
          guestIdentity={guestIdentity}
          onEditIdentity={() => setShowNamePrompt(true)}
        />
      </div>

      {showNamePrompt && (
        <NamePrompt
          initialName={guestIdentity?.name}
          initialEmail={guestIdentity?.email}
          onSubmit={(name, email) => {
            saveGuestIdentity(name, email);
            setShowNamePrompt(false);
          }}
          onCancel={() => {
            setShowNamePrompt(false);
            setPendingPin(null);
          }}
        />
      )}
    </div>
  );
}
