"use client";

import { useState } from "react";
import type { CommentData } from "./types";

const STATUS_LABELS: Record<CommentData["status"], string> = {
  open: "Open",
  in_progress: "In progress",
  resolved: "Resolved",
};

function urlify(text: string): (string | JSX.Element)[] {
  const parts = text.split(/(https?:\/\/[^\s]+)/g);
  return parts.map((part, i) =>
    /^https?:\/\//.test(part) ? (
      <a key={i} href={part} target="_blank" rel="noopener noreferrer">
        {part}
      </a>
    ) : (
      part
    )
  );
}

interface CommentSidebarProps {
  comments: CommentData[];
  activeCommentId: string | null;
  onSelectComment: (id: string) => void;
  isOwner: boolean;
  onReply: (commentId: string, body: string) => Promise<void>;
  onStatusChange: (commentId: string, status: CommentData["status"]) => Promise<void>;
}

export function CommentSidebar({
  comments,
  activeCommentId,
  onSelectComment,
  isOwner,
  onReply,
  onStatusChange,
}: CommentSidebarProps) {
  const [showResolved, setShowResolved] = useState(false);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});

  const visible = comments.filter((c) => showResolved || c.status !== "resolved");

  async function submitReply(commentId: string) {
    const text = (replyDrafts[commentId] ?? "").trim();
    if (!text) return;
    await onReply(commentId, text);
    setReplyDrafts((prev) => ({ ...prev, [commentId]: "" }));
  }

  return (
    <aside>
      <div>
        <span>{comments.length} comments</span>
        <label>
          <input type="checkbox" checked={showResolved} onChange={(e) => setShowResolved(e.target.checked)} />
          Show resolved
        </label>
      </div>

      {visible.length === 0 && <p>No comments yet. Click anywhere to leave feedback.</p>}

      {visible.map((comment) => (
        <div key={comment.id} data-active={comment.id === activeCommentId} onClick={() => onSelectComment(comment.id)}>
          <div>
            <strong>{comment.reviewerName}</strong>
            <time>{new Date(comment.createdAt).toLocaleString()}</time>
          </div>
          <p style={comment.status === "resolved" ? { textDecoration: "line-through" } : undefined}>
            {urlify(comment.body)}
          </p>

          {isOwner && (
            <div>
              {(["open", "in_progress", "resolved"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={comment.status === s}
                  onClick={(e) => {
                    e.stopPropagation();
                    onStatusChange(comment.id, s);
                  }}
                >
                  {STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          )}

          {comment.replies.length > 0 && (
            <div>
              {comment.replies.map((reply) => (
                <div key={reply.id}>
                  <strong>{reply.authorName}</strong>
                  <time>{new Date(reply.createdAt).toLocaleString()}</time>
                  <p>{urlify(reply.body)}</p>
                </div>
              ))}
            </div>
          )}

          <div onClick={(e) => e.stopPropagation()}>
            <input
              type="text"
              placeholder="Reply…"
              value={replyDrafts[comment.id] ?? ""}
              onChange={(e) => setReplyDrafts((prev) => ({ ...prev, [comment.id]: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitReply(comment.id);
              }}
            />
            <button type="button" onClick={() => submitReply(comment.id)}>
              Reply
            </button>
          </div>
        </div>
      ))}
    </aside>
  );
}
