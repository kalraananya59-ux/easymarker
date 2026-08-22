"use client";

import { useRef, useState } from "react";
import { NamePrompt } from "./NamePrompt";
import { CommentSidebar } from "./CommentSidebar";
import { readGuestIdentity, writeGuestIdentity } from "@/lib/guest-client";
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

  function handleContainerClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target !== e.currentTarget && !(e.target as HTMLElement).matches("img")) return;
    const rect = containerRef.current!.getBoundingClientRect();
    const xPct = (e.clientX - rect.left) / rect.width;
    const yPct = (e.clientY - rect.top) / rect.height;

    setActiveCommentId(null);
    setPendingPin({ xPct, yPct });

    if (!isOwner && !readGuestIdentity()) {
      setShowNamePrompt(true);
    }
  }

  async function submitComment() {
    if (!pendingPin || !draftText.trim()) return;
    const identity = isOwner ? { name: "You" } : readGuestIdentity();
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
        setComments((prev) => [...prev, { ...data.comment, replies: [] }]);
        setPendingPin(null);
        setDraftText("");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReply(commentId: string, body: string) {
    const identity = isOwner ? { name: "You" } : readGuestIdentity();
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
    if (res.ok) {
      setComments((prev) => prev.map((c) => (c.id === commentId ? { ...c, status } : c)));
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
        />
      </div>

      {showNamePrompt && (
        <NamePrompt
          onSubmit={(name, email) => {
            writeGuestIdentity(email ? { name, email } : { name });
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
