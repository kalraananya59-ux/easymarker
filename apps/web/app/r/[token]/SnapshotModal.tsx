"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./SnapshotModal.module.css";

export type SnapshotState =
  | { status: "working"; commentId: string }
  | { status: "ready"; commentId: string; blob: Blob; fileName: string; shareUrl: string }
  | { status: "error"; commentId: string };

export function SnapshotModal({ state, onClose }: { state: SnapshotState; onClose: () => void }) {
  const [notice, setNotice] = useState<string | null>(null);
  const blob = state.status === "ready" ? state.blob : null;
  const previewUrl = useMemo(() => (blob ? URL.createObjectURL(blob) : null), [blob]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const canCopyImage = typeof window !== "undefined" && "ClipboardItem" in window && !!navigator.clipboard?.write;
  const file = state.status === "ready" ? new File([state.blob], state.fileName, { type: "image/png" }) : null;
  const canShare =
    typeof navigator !== "undefined" && !!file && typeof navigator.canShare === "function" && navigator.canShare({ files: [file] });

  function flash(text: string) {
    setNotice(text);
    window.setTimeout(() => setNotice(null), 2200);
  }

  async function copyImage() {
    if (state.status !== "ready") return;
    try {
      await navigator.clipboard.write([new ClipboardItem({ "image/png": state.blob })]);
      flash("Image copied. Paste it into Slack, WhatsApp, email…");
    } catch {
      flash("Your browser blocked copying. Use Download instead.");
    }
  }

  async function copyLink() {
    if (state.status !== "ready") return;
    try {
      await navigator.clipboard.writeText(state.shareUrl);
      flash("Link copied.");
    } catch {
      window.prompt("Copy this link:", state.shareUrl);
    }
  }

  async function share() {
    if (state.status !== "ready" || !file) return;
    try {
      await navigator.share({ files: [file], text: state.shareUrl });
    } catch {
      // The person closed the share sheet; nothing to do.
    }
  }

  return (
    <div className="modalBackdrop" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="snapshot-title"
        className={`modal ${styles.wide}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.head}>
          <h2 id="snapshot-title" className="modalTitle">
            Comment screenshot
          </h2>
          <button type="button" className="btn btnGhost btnSm" onClick={onClose} aria-label="Close">
            Close
          </button>
        </div>

        {state.status === "working" && (
          <div className={styles.placeholder}>
            <span className={styles.spinner} aria-hidden="true" />
            Taking the screenshot…
          </div>
        )}

        {state.status === "error" && (
          <div className={styles.placeholder}>Sorry, the screenshot couldn&apos;t be created. Please try again.</div>
        )}

        {state.status === "ready" && previewUrl && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewUrl} alt="Screenshot of the comment on the page" className={styles.preview} />
            <div className={styles.actions}>
              <a className="btn btnPrimary" href={previewUrl} download={state.fileName}>
                Download PNG
              </a>
              {canCopyImage && (
                <button type="button" className="btn btnSecondary" onClick={copyImage}>
                  Copy image
                </button>
              )}
              <button type="button" className="btn btnSecondary" onClick={copyLink}>
                Copy link to comment
              </button>
              {canShare && (
                <button type="button" className="btn btnSecondary" onClick={share}>
                  Share…
                </button>
              )}
            </div>
          </>
        )}

        <p className={styles.notice} aria-live="polite">
          {notice ?? " "}
        </p>
      </div>
    </div>
  );
}
