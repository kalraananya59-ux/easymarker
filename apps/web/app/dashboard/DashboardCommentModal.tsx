"use client";

import { useEffect, useState } from "react";
import { CommentSidebar } from "../r/[token]/CommentSidebar";
import type { CommentData } from "../r/[token]/types";
import styles from "./DashboardCommentModal.module.css";

export function DashboardCommentModal({
  projectId,
  projectTitle,
  onClose,
}: {
  projectId: string;
  projectTitle: string;
  onClose: () => void;
}) {
  const [comments, setComments] = useState<CommentData[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/comments?projectId=${projectId}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setComments(data.comments ?? []);
      });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  async function handleReply(commentId: string, body: string) {
    const res = await fetch(`/api/comments/${commentId}/replies`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ body }),
    });
    const data = await res.json();
    if (res.ok) {
      setComments(
        (prev) =>
          prev && prev.map((c) => (c.id === commentId ? { ...c, replies: [...c.replies, data.reply] } : c))
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
      setComments(
        (prev) =>
          prev &&
          prev.map((c) =>
            c.id === commentId
              ? {
                  ...c,
                  status,
                  statusChanges: data.statusChange ? [...c.statusChanges, data.statusChange] : c.statusChanges,
                }
              : c
          )
      );
    }
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>{projectTitle}</h2>
          <button type="button" className="btn btnGhost btnSm" onClick={onClose}>
            Close
          </button>
        </div>
        <div className={styles.body}>
          {comments === null ? (
            <p className={styles.loading}>Loading comments…</p>
          ) : (
            <CommentSidebar
              comments={comments}
              activeCommentId={null}
              onSelectComment={() => {}}
              isOwner={true}
              onReply={handleReply}
              onStatusChange={handleStatusChange}
            />
          )}
        </div>
      </div>
    </div>
  );
}
