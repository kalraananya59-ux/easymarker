"use client";

import { useState } from "react";
import type { CommentData } from "./types";
import styles from "./CommentSidebar.module.css";

const STATUS_LABELS: Record<CommentData["status"], string> = {
  open: "Open",
  in_progress: "In progress",
  resolved: "Resolved",
};

const STATUS_OPTION_CLASS: Record<CommentData["status"], string | undefined> = {
  open: styles.statusOptionOpen,
  in_progress: styles.statusOptionInProgress,
  resolved: styles.statusOptionResolved,
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

function initial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || "?";
}

function Avatar({ name, isAuthor }: { name: string; isAuthor: boolean }) {
  return (
    <div className={`${styles.avatar} ${isAuthor ? styles.avatarOwner : styles.avatarGuest}`}>
      {initial(name)}
    </div>
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
    <aside className={styles.sidebar}>
      <div className={styles.header}>
        <span className={styles.count}>
          {comments.length} comment{comments.length === 1 ? "" : "s"}
        </span>
        <label className={styles.showResolved}>
          <input type="checkbox" checked={showResolved} onChange={(e) => setShowResolved(e.target.checked)} />
          Show resolved
        </label>
      </div>

      <div className={styles.list}>
        {visible.length === 0 && (
          <div className={styles.emptyState}>No comments yet. Click anywhere to leave feedback.</div>
        )}

        {visible.map((comment) => (
          <div
            key={comment.id}
            className={`${styles.commentItem} ${comment.id === activeCommentId ? styles.commentItemActive : ""}`}
            onClick={() => onSelectComment(comment.id)}
          >
            <div className={styles.commentHeader}>
              <Avatar name={comment.reviewerName} isAuthor={comment.reviewerId !== null} />
              <span className={styles.author}>{comment.reviewerName}</span>
              <time className={styles.time}>{new Date(comment.createdAt).toLocaleString()}</time>
            </div>
            <p className={`${styles.body} ${comment.status === "resolved" ? styles.bodyResolved : ""}`}>
              {urlify(comment.body)}
            </p>

            {isOwner && (
              <div className={styles.statusPicker}>
                {(["open", "in_progress", "resolved"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={`${styles.statusOption} ${STATUS_OPTION_CLASS[s]}`}
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
              <div className={styles.replies}>
                {comment.replies.map((reply) => (
                  <div key={reply.id} className={styles.replyItem}>
                    <div className={styles.replyHeader}>
                      <span className={styles.replyAuthor}>{reply.authorName}</span>
                      <time className={styles.replyTime}>{new Date(reply.createdAt).toLocaleString()}</time>
                    </div>
                    <p className={styles.replyBody}>{urlify(reply.body)}</p>
                  </div>
                ))}
              </div>
            )}

            <div className={styles.replyForm} onClick={(e) => e.stopPropagation()}>
              <input
                type="text"
                className={styles.replyInput}
                placeholder="Reply…"
                value={replyDrafts[comment.id] ?? ""}
                onChange={(e) => setReplyDrafts((prev) => ({ ...prev, [comment.id]: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submitReply(comment.id);
                }}
              />
              <button type="button" className={styles.replyButton} onClick={() => submitReply(comment.id)}>
                Reply
              </button>
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
