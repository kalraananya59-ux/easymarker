"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardCommentModal } from "./DashboardCommentModal";
import styles from "./ProjectCard.module.css";

interface ProjectCardProps {
  id: string;
  title: string;
  type: string;
  status: string;
  shareToken: string;
  createdAt: string;
  notificationsEnabled: boolean;
  openCommentCount: number;
}

const TYPE_LABELS: Record<string, string> = {
  url: "Website",
  image: "Image",
  pdf: "PDF",
  design: "Design",
};

function TypeIcon({ type }: { type: string }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
  };

  if (type === "pdf") {
    return (
      <svg {...common}>
        <path d="M6 3h9l5 5v13a1 1 0 01-1 1H6a1 1 0 01-1-1V4a1 1 0 011-1z" />
        <path d="M15 3v5h5" />
      </svg>
    );
  }

  if (type === "image") {
    return (
      <svg {...common}>
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <circle cx="8.5" cy="9.5" r="1.5" />
        <path d="M21 16l-5-5-9 9" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a14 14 0 010 18 14 14 0 010-18z" />
    </svg>
  );
}

export function ProjectCard({
  id,
  title,
  type,
  status,
  shareToken,
  createdAt,
  notificationsEnabled,
  openCommentCount,
}: ProjectCardProps) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [notifying, setNotifying] = useState(notificationsEnabled);
  const [toggling, setToggling] = useState(false);
  const [showComments, setShowComments] = useState(false);

  // Start with the SSR-safe relative path so the client's first render matches
  // the server-rendered HTML exactly, then upgrade to the absolute URL after
  // mount — computing window.location.origin during render (instead of in an
  // effect) diverges from SSR output and throws a hydration mismatch.
  const [shareUrl, setShareUrl] = useState(`/r/${shareToken}`);

  useEffect(() => {
    setShareUrl(`${window.location.origin}/r/${shareToken}`);
  }, [shareToken]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be blocked by the browser/permissions; the share
      // link is still visible as plain text, so onboarding progress shouldn't
      // be held hostage by a clipboard API failure.
    }
    await fetch("/api/onboarding/copy-link", { method: "POST" });
    router.refresh();
  }

  async function archive() {
    await fetch(`/api/projects/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "archive" }),
    });
    router.refresh();
  }

  async function toggleNotifications() {
    setToggling(true);
    const next = !notifying;
    setNotifying(next);
    const res = await fetch(`/api/projects/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "toggle_notifications" }),
    });
    if (!res.ok) setNotifying(!next);
    setToggling(false);
  }

  return (
    <div className={`card ${styles.card}`}>
      <div className={styles.top}>
        <div className={styles.typeIcon}>
          <TypeIcon type={type} />
        </div>
        <div className={styles.titleBlock}>
          <h3 className={styles.title}>{title}</h3>
          <p className={styles.meta}>
            {TYPE_LABELS[type] ?? type} · {openCommentCount} open · {new Date(createdAt).toLocaleDateString()}
          </p>
        </div>
        <span className={`badge ${status === "active" ? "badgeActive" : "badgeArchived"}`}>{status}</span>
      </div>

      <div className={styles.shareRow}>
        <code className={styles.shareLink}>{shareUrl}</code>
        <button type="button" className="btn btnSecondary btnSm" onClick={copyLink}>
          {copied ? "Copied!" : "Copy link"}
        </button>
      </div>

      <div className={styles.actions}>
        <div className={styles.exportRow}>
          <button type="button" className={styles.exportLink} onClick={() => setShowComments(true)}>
            Comments
          </button>
          <a className={styles.exportLink} href={`/api/projects/${id}/export?format=csv`}>
            Export CSV
          </a>
          <a className={styles.exportLink} href={`/api/projects/${id}/export?format=pdf`}>
            Export PDF
          </a>
        </div>

        <div className={styles.bottomRow}>
          <label className={styles.notify}>
            <input type="checkbox" checked={notifying} disabled={toggling} onChange={toggleNotifications} />
            Notify me
          </label>

          {status === "active" && (
            <button type="button" className="btn btnGhost btnSm" onClick={archive}>
              Archive
            </button>
          )}
        </div>
      </div>

      {showComments && (
        <DashboardCommentModal projectId={id} projectTitle={title} onClose={() => setShowComments(false)} />
      )}
    </div>
  );
}
