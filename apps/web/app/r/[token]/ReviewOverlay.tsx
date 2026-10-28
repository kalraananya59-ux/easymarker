"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { NamePrompt } from "./NamePrompt";
import { CommentSidebar } from "./CommentSidebar";
import { SnapshotModal } from "./SnapshotModal";
import { useCommentSnapshot } from "./useCommentSnapshot";
import { loadImageForCanvas, sharedCommentIdFromUrl, type PageCapture } from "./snapshot";
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
  const imgRef = useRef<HTMLImageElement>(null);
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

  // Opened through a shared comment link (?c=<id>).
  useEffect(() => {
    const shared = sharedCommentIdFromUrl();
    if (shared && initialComments.some((c) => c.id === shared)) setActiveCommentId(shared);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const captureComment = useCallback(
    async (comment: CommentData): Promise<PageCapture | null> => {
      const container = containerRef.current;
      const shown = imgRef.current;
      if (!container || !shown) return null;
      const img = await loadImageForCanvas(imageSrc);
      if (!img) return null;
      // Pins are stored relative to the review area, so map that point onto
      // the image's own pixels.
      const area = container.getBoundingClientRect();
      const box = shown.getBoundingClientRect();
      const pointX = area.left + comment.positionX * area.width;
      const pointY = area.top + comment.positionY * area.height;
      const scale = img.naturalWidth / box.width;
      // Make sure the image can actually be exported (some file hosts block it).
      const probe = document.createElement("canvas");
      probe.width = 1;
      probe.height = 1;
      const ctx = probe.getContext("2d");
      try {
        ctx?.drawImage(img, 0, 0, 1, 1);
        probe.toDataURL();
      } catch {
        return null;
      }
      return {
        source: img,
        sourceWidth: img.naturalWidth,
        sourceHeight: img.naturalHeight,
        pinX: Math.max(0, Math.min(img.naturalWidth, (pointX - box.left) * scale)),
        pinY: Math.max(0, Math.min(img.naturalHeight, (pointY - box.top) * scale)),
      };
    },
    [imageSrc]
  );

  const { snapshot, takeScreenshot, closeSnapshot } = useCommentSnapshot({
    comments,
    title: imageAlt,
    capture: captureComment,
  });

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
        <img ref={imgRef} src={imageSrc} alt={imageAlt} style={{ maxWidth: "100%", maxHeight: "100%" }} draggable={false} />

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
            className={c.id === activeCommentId ? "pinActive" : undefined}
            style={{
              position: "absolute",
              left: `${c.positionX * 100}%`,
              top: `${c.positionY * 100}%`,
              width: 28,
              height: 28,
              borderRadius: "50% 50% 50% 0",
              transform: "translate(-50%, -100%) rotate(-45deg)",
              background:
                c.status === "resolved"
                  ? "var(--text-muted)"
                  : c.id === activeCommentId
                    ? "var(--amber-500)"
                    : "var(--blue-500)",
              border: "2px solid #fff",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.45)",
              cursor: "pointer",
            }}
          />
        ))}

        {pendingPin && (
          <div
            className="composer"
            style={{
              position: "absolute",
              left: `${pendingPin.xPct * 100}%`,
              top: `${pendingPin.yPct * 100}%`,
              transform: "translate(-50%, -100%)",
              zIndex: 10,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <textarea
              value={draftText}
              onChange={(e) => setDraftText(e.target.value)}
              placeholder="Leave feedback…"
              autoFocus
              rows={3}
              className="input"
            />
            <div className="composerActions">
              <button type="button" className="btn btnGhost btnSm" onClick={() => setPendingPin(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btnPrimary btnSm"
                onClick={submitComment}
                disabled={submitting || !draftText.trim()}
              >
                {submitting ? "Posting…" : "Comment"}
              </button>
            </div>
          </div>
        )}
      </div>

      <div style={{ width: 340, borderLeft: "1px solid var(--slate-100)", overflowY: "auto", background: "var(--white)" }}>
        <CommentSidebar
          comments={comments}
          activeCommentId={activeCommentId}
          onSelectComment={setActiveCommentId}
          onScreenshot={takeScreenshot}
          isOwner={isOwner}
          onReply={handleReply}
          onStatusChange={handleStatusChange}
          guestIdentity={guestIdentity}
          onEditIdentity={() => setShowNamePrompt(true)}
        />
      </div>

      {snapshot && <SnapshotModal state={snapshot} onClose={closeSnapshot} />}

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
