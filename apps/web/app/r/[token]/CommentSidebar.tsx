"use client";

import { useEffect, useRef, useState } from "react";
import type { CommentData, ReplyData, StatusChangeData } from "./types";
import type { GuestIdentity } from "@/lib/guest-client";
import { commentShareUrl } from "./snapshot";
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
  onScreenshot?: (commentId: string) => void;
}

function LinkIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
      <path d="M10 13a5 5 0 007.07 0l3-3a5 5 0 00-7.07-7.07l-1.5 1.5" strokeLinecap="round" />
      <path d="M14 11a5 5 0 00-7.07 0l-3 3a5 5 0 007.07 7.07l1.5-1.5" strokeLinecap="round" />
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
      <path d="M4 8h3l2-3h6l2 3h3v11H4z" strokeLinejoin="round" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
      <path d="M12 4v11m0 0l-4.5-4.5M12 15l4.5-4.5M5 20h14" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
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
  onScreenshot,
}: CommentSidebarProps) {
  const [showResolved, setShowResolved] = useState(false);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [reviewPath, setReviewPath] = useState("");
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  useEffect(() => {
    setReviewPath(window.location.pathname.replace(/\/$/, ""));
  }, []);

  const exportRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!exportOpen) return;
    function close(e: MouseEvent | KeyboardEvent) {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !exportRef.current?.contains(e.target as Node)) {
        setExportOpen(false);
      }
    }
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [exportOpen]);

  // Keep the selected comment visible in the list (e.g. when a shared link
  // opens the page, or a pin is clicked).
  useEffect(() => {
    if (!activeCommentId) return;
    const active = comments.find((c) => c.id === activeCommentId);
    if (active?.status === "resolved") setShowResolved(true);
    const el = itemRefs.current.get(activeCommentId);
    el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [activeCommentId, comments]);

  async function copyCommentLink(commentId: string) {
    const url = commentShareUrl(commentId);
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(commentId);
      window.setTimeout(() => setCopiedId((id) => (id === commentId ? null : id)), 2000);
    } catch {
      window.prompt("Copy this link:", url);
    }
  }

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
        <div className={styles.headerActions}>
          <label className={styles.showResolved}>
            <input type="checkbox" checked={showResolved} onChange={(e) => setShowResolved(e.target.checked)} />
            Show resolved
          </label>
          {comments.length > 0 && reviewPath && (
            <div className={styles.exportWrap} ref={exportRef}>
              <button
                type="button"
                className={styles.exportButton}
                aria-expanded={exportOpen}
                onClick={() => setExportOpen((v) => !v)}
              >
                <DownloadIcon />
                Export
              </button>
              {exportOpen && (
                <div className={styles.exportMenu} role="menu">
                  <a role="menuitem" href={`${reviewPath}/export?format=csv`} onClick={() => setExportOpen(false)}>
                    <strong>CSV</strong>
                    <span>For Excel or Google Sheets</span>
                  </a>
                  <a role="menuitem" href={`${reviewPath}/export?format=pdf`} onClick={() => setExportOpen(false)}>
                    <strong>PDF</strong>
                    <span>A tidy report to send or print</span>
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
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
            ref={(el) => {
              if (el) itemRefs.current.set(comment.id, el);
              else itemRefs.current.delete(comment.id);
            }}
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

            <div className={styles.shareRow} onClick={(e) => e.stopPropagation()}>
              <button type="button" className={styles.shareButton} onClick={() => copyCommentLink(comment.id)}>
                <LinkIcon />
                {copiedId === comment.id ? "Link copied!" : "Copy link"}
              </button>
              {onScreenshot && (
                <button
                  type="button"
                  className={styles.shareButton}
                  onClick={() => {
                    onSelectComment(comment.id);
                    onScreenshot(comment.id);
                  }}
                >
                  <CameraIcon />
                  Screenshot
                </button>
              )}
            </div>

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
