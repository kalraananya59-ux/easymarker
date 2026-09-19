"use client";

import { useEffect, useRef, useState } from "react";
import { NamePrompt } from "./NamePrompt";
import { CommentSidebar } from "./CommentSidebar";
import { readGuestIdentity, writeGuestIdentity, type GuestIdentity } from "@/lib/guest-client";
import type { CommentData } from "./types";

interface AnchorPayload {
  strategy: "dom" | "percentage";
  selector?: string;
  offsetXPct?: number;
  offsetYPct?: number;
  textQuote?: string;
  fallbackXPct?: number;
  fallbackYPct?: number;
  confidence: number;
}

interface CommentWithAnchor extends CommentData {
  anchor: AnchorPayload;
}

interface ResolvedPin {
  id: string;
  x: number;
  y: number;
  confidence: number;
}

interface PendingPin {
  anchor: AnchorPayload;
  x: number;
  y: number;
}

export function UrlReviewOverlay({
  projectId,
  renderUrl,
  proxyOrigin,
  title,
  isOwner,
  initialComments,
}: {
  projectId: string;
  renderUrl: string;
  proxyOrigin: string;
  title: string;
  isOwner: boolean;
  initialComments: CommentWithAnchor[];
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [comments, setComments] = useState<CommentWithAnchor[]>(initialComments);
  const [resolvedPins, setResolvedPins] = useState<ResolvedPin[]>([]);
  const [pendingPin, setPendingPin] = useState<PendingPin | null>(null);
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [draftText, setDraftText] = useState("");
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [guestIdentity, setGuestIdentity] = useState<GuestIdentity | null>(null);

  const handshakeAcked = useRef(false);

  useEffect(() => {
    if (!isOwner) setGuestIdentity(readGuestIdentity());
  }, [isOwner]);

  function saveGuestIdentity(name: string, email: string) {
    const identity: GuestIdentity = email ? { name, email } : { name };
    writeGuestIdentity(identity);
    setGuestIdentity(identity);
  }

  function requestResolve() {
    iframeRef.current?.contentWindow?.postMessage(
      {
        type: "easymarker:resolve-anchors",
        anchors: comments.map((c) => ({ id: c.id, anchor: c.anchor })),
      },
      proxyOrigin
    );
  }

  // The iframe is cross-origin and may finish loading (and post "easymarker:ready")
  // before this component's message listener is registered — postMessage doesn't
  // queue for listeners that don't exist yet, so a single fire-once trigger can miss
  // the window entirely (this is a real race, not hypothetical — caught via Playwright).
  // Retrying until acknowledged is the robust fix, well within the 2s re-resolve budget.
  useEffect(() => {
    handshakeAcked.current = false;
    let attempts = 0;
    const interval = setInterval(() => {
      if (handshakeAcked.current || attempts >= 15) {
        clearInterval(interval);
        return;
      }
      attempts++;
      requestResolve();
    }, 250);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comments, proxyOrigin]);

  useEffect(() => {
    function handleMessage(e: MessageEvent) {
      if (e.origin !== proxyOrigin) return;
      const data = e.data as { type?: string };

      if (data.type === "easymarker:ready" || data.type === "easymarker:viewport-changed") {
        requestResolve();
        return;
      }

      if (data.type === "easymarker:pin-candidate") {
        const { anchor, viewportX, viewportY } = e.data as {
          anchor: AnchorPayload;
          viewportX: number;
          viewportY: number;
        };
        const rect = iframeRef.current?.getBoundingClientRect();
        if (!rect) return;
        setActiveCommentId(null);
        setPendingPin({ anchor, x: rect.left + viewportX, y: rect.top + viewportY });
        if (!isOwner && !guestIdentity) setShowNamePrompt(true);
        return;
      }

      if (data.type === "easymarker:anchor-positions") {
        handshakeAcked.current = true;
        const { positions } = e.data as {
          positions: Array<{ id: string; position: { x: number; y: number; confidence: number } | null }>;
        };
        const rect = iframeRef.current?.getBoundingClientRect();
        if (!rect) return;
        setResolvedPins(
          positions
            .filter((p) => p.position !== null)
            .map((p) => ({
              id: p.id,
              x: rect.left + p.position!.x,
              y: rect.top + p.position!.y,
              confidence: p.position!.confidence,
            }))
        );
        return;
      }
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comments, proxyOrigin, isOwner, guestIdentity]);

  useEffect(() => {
    function handleResize() {
      requestResolve();
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comments, proxyOrigin]);

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
          anchor: pendingPin.anchor,
          body: draftText.trim(),
          positionX: pendingPin.anchor.fallbackXPct ?? 0.5,
          positionY: pendingPin.anchor.fallbackYPct ?? 0.5,
          reviewerName: identity.name,
          reviewerEmail: identity.email,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setComments((prev) => [...prev, { ...data.comment, anchor: pendingPin.anchor, replies: [], statusChanges: [] }]);
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
      <div style={{ position: "relative", flex: 1 }}>
        <iframe
          ref={iframeRef}
          src={renderUrl}
          title={title}
          onLoad={requestResolve}
          style={{ width: "100%", height: "100%", border: "none" }}
        />

        {resolvedPins.map((pin) => {
          const comment = comments.find((c) => c.id === pin.id);
          if (!comment) return null;
          return (
            <button
              key={pin.id}
              type="button"
              aria-label={`Comment by ${comment.reviewerName}`}
              onClick={() => setActiveCommentId(pin.id)}
              title={pin.confidence < 0.7 ? "Position may have shifted" : undefined}
              style={{
                position: "fixed",
                left: pin.x,
                top: pin.y,
                width: 28,
                height: 28,
                borderRadius: "50% 50% 50% 0",
                transform: "translate(-50%, -100%) rotate(-45deg)",
                background:
                  comment.status === "resolved"
                    ? "var(--text-muted)"
                    : pin.id === activeCommentId
                      ? "var(--amber-500)"
                      : "var(--blue-500)",
                border: pin.confidence < 0.7 ? "2px dashed #f59e0b" : "none",
                cursor: "pointer",
              }}
            />
          );
        })}

        {pendingPin && (
          <div
            style={{
              position: "fixed",
              left: pendingPin.x,
              top: pendingPin.y,
              transform: "translate(-50%, -100%)",
              background: "var(--white)",
              border: "1px solid var(--slate-200)",
              borderRadius: 8,
              padding: 8,
              width: 240,
              zIndex: 10,
            }}
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

      <div style={{ width: 340, borderLeft: "1px solid var(--slate-200)", overflowY: "auto" }}>
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
