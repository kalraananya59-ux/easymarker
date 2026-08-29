"use client";

import { useState } from "react";
import type { CommentData, ReplyData, StatusChangeData } from "./types";
import type { GuestIdentity } from "@/lib/guest-client";
import styles from "./CommentSidebar.module.css";

type TimelineItem = ({ kind: "reply" } & ReplyData) | ({ kind: "status" } & StatusChangeData);

function mergeTimeline(replies: ReplyData[], statusChanges: StatusChangeData[]): TimelineItem[] {
  const items: TimelineItem[] = [
    ...replies.map((r): TimelineItem => ({ kind: "reply", ...r })),
    ...statusChanges.map((s): TimelineItem => ({ kind: "status", ...s })),
  ];
  return items.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

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
  guestIdentity?: GuestIdentity | null;
  onEditIdentity?: () => void;
}

export function CommentSidebar({
  comments,
  activeCommentId,
  onSelectComment,
  isOwner,
  onReply,
  onStatusChange,
  guestIdentity,
  onEditIdentity,
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

      {!isOwner && guestIdentity && onEditIdentity && (
        <div className={styles.identityBar}>
          Commenting as <strong>{guestIdentity.name}</strong>
          <button type="button" className={styles.identityEdit} onClick={onEditIdentity}>
            Edit
          </button>
        </div>
      )}

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

            {(comment.replies.length > 0 || comment.statusChanges.length > 0) && (
              <div className={styles.replies}>
                {mergeTimeline(comment.replies, comment.statusChanges).map((item) =>
                  item.kind === "reply" ? (
                    <div key={`reply-${item.id}`} className={styles.replyItem}>
                      <div className={styles.replyHeader}>
                        <span className={styles.replyAuthor}>{item.authorName}</span>
                        <time className={styles.replyTime}>{new Date(item.createdAt).toLocaleString()}</time>
                      </div>
                      <p className={styles.replyBody}>{urlify(item.body)}</p>
                    </div>
                  ) : (
                    <p key={`status-${item.id}`} className={styles.statusLogEntry}>
                      {item.changedByName} marked this {STATUS_LABELS[item.status].toLowerCase()} ·{" "}
                      {new Date(item.createdAt).toLocaleString()}
                    </p>
                  )
                )}
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
