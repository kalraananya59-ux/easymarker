"use client";

import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import type { AnchorPayload } from "@easymarker/shared";
import { NamePrompt } from "./NamePrompt";
import { CommentSidebar } from "./CommentSidebar";
import { readGuestIdentity, writeGuestIdentity, type GuestIdentity } from "@/lib/guest-client";
import type { CommentData } from "./types";

interface CommentWithAnchor extends CommentData {
  anchor: AnchorPayload | null;
}

interface PendingPin {
  page: number;
  xPct: number;
  yPct: number;
}

const PAGE_TARGET_WIDTH = 860;

function PdfPage({
  pdfDoc,
  pageNumber,
  pins,
  activeCommentId,
  pendingPin,
  draftText,
  submitting,
  onPageClick,
  onSelectPin,
  onDraftChange,
  onSubmitComment,
  onCancelPending,
  registerRef,
}: {
  pdfDoc: PDFDocumentProxy;
  pageNumber: number;
  pins: CommentWithAnchor[];
  activeCommentId: string | null;
  pendingPin: PendingPin | null;
  draftText: string;
  submitting: boolean;
  onPageClick: (page: number, xPct: number, yPct: number) => void;
  onSelectPin: (id: string) => void;
  onDraftChange: (text: string) => void;
  onSubmitComment: () => void;
  onCancelPending: () => void;
  registerRef: (page: number, el: HTMLDivElement | null) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function render() {
      const page = await pdfDoc.getPage(pageNumber);
      if (cancelled) return;
      const unscaled = page.getViewport({ scale: 1 });
      const scale = PAGE_TARGET_WIDTH / unscaled.width;
      const viewport = page.getViewport({ scale });

      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const context = canvas.getContext("2d");
      if (!context) return;

      await page.render({ canvasContext: context, viewport }).promise;
      if (!cancelled) setSize({ width: viewport.width, height: viewport.height });
    }

    render();
    return () => {
      cancelled = true;
    };
  }, [pdfDoc, pageNumber]);

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target !== e.currentTarget && !(e.target as HTMLElement).matches("canvas")) return;
    const rect = containerRef.current!.getBoundingClientRect();
    const xPct = (e.clientX - rect.left) / rect.width;
    const yPct = (e.clientY - rect.top) / rect.height;
    onPageClick(pageNumber, xPct, yPct);
  }

  return (
    <div style={{ marginBottom: 24 }}>
      <p style={{ fontSize: 12, color: "#94a3b8", margin: "0 0 6px" }}>Page {pageNumber}</p>
      <div
        ref={(el) => {
          containerRef.current = el;
          registerRef(pageNumber, el);
        }}
        onClick={handleClick}
        style={{
          position: "relative",
          width: size?.width,
          height: size?.height,
          cursor: "crosshair",
          boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
        }}
      >
        <canvas ref={canvasRef} style={{ display: "block" }} />

        {pins.map((c) => (
          <button
            key={c.id}
            type="button"
            aria-label={`Comment by ${c.reviewerName}`}
            onClick={(e) => {
              e.stopPropagation();
              onSelectPin(c.id);
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

        {pendingPin && pendingPin.page === pageNumber && (
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
              zIndex: 10,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <textarea
              value={draftText}
              onChange={(e) => onDraftChange(e.target.value)}
              placeholder="Leave feedback…"
              autoFocus
              rows={3}
              style={{ width: "100%" }}
            />
            <button type="button" onClick={onSubmitComment} disabled={submitting || !draftText.trim()}>
              {submitting ? "Posting…" : "Comment"}
            </button>
            <button type="button" onClick={onCancelPending}>
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function PdfReviewOverlay({
  projectId,
  pdfUrl,
  title,
  isOwner,
  initialComments,
}: {
  projectId: string;
  pdfUrl: string;
  title: string;
  isOwner: boolean;
  initialComments: CommentWithAnchor[];
}) {
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [comments, setComments] = useState<CommentWithAnchor[]>(initialComments);
  const [pendingPin, setPendingPin] = useState<PendingPin | null>(null);
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [draftText, setDraftText] = useState("");
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [guestIdentity, setGuestIdentity] = useState<GuestIdentity | null>(null);

  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  useEffect(() => {
    if (!isOwner) setGuestIdentity(readGuestIdentity());
  }, [isOwner]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const pdfjsLib = await import("pdfjs-dist");
      // A plain static path, not `new URL(..., import.meta.url)` — that pattern
      // makes webpack pull the already-minified worker through Next's Terser
      // pass, which chokes on its ESM syntax and fails `next build` in
      // production (dev mode skips minification, so this was invisible until
      // a real production build was attempted). The file is copied into
      // public/ at install time by scripts/copy-pdf-worker.mjs.
      pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

      try {
        const doc = await pdfjsLib.getDocument(pdfUrl).promise;
        if (!cancelled) setPdfDoc(doc);
      } catch {
        if (!cancelled) setLoadError("Couldn't load this PDF. Try refreshing the page.");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdfUrl]);

  function saveGuestIdentity(name: string, email: string) {
    const identity: GuestIdentity = email ? { name, email } : { name };
    writeGuestIdentity(identity);
    setGuestIdentity(identity);
  }

  function handlePageClick(page: number, xPct: number, yPct: number) {
    setActiveCommentId(null);
    setPendingPin({ page, xPct, yPct });
    if (!isOwner && !guestIdentity) setShowNamePrompt(true);
  }

  function selectComment(id: string) {
    setActiveCommentId(id);
    setPendingPin(null);
    const comment = comments.find((c) => c.id === id);
    const page = comment?.anchor?.page;
    if (page !== undefined) pageRefs.current.get(page)?.scrollIntoView({ behavior: "smooth", block: "center" });
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
          anchor: {
            strategy: "percentage",
            xPct: pendingPin.xPct,
            yPct: pendingPin.yPct,
            page: pendingPin.page,
            confidence: 1,
          },
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
      <div style={{ flex: 1, overflowY: "auto", padding: "24px 0", background: "#f1f5f9" }}>
        {loadError && <p style={{ textAlign: "center", color: "#dc2626" }}>{loadError}</p>}
        {!pdfDoc && !loadError && <p style={{ textAlign: "center", color: "#64748b" }}>Loading {title}…</p>}
        {pdfDoc && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            {Array.from({ length: pdfDoc.numPages }, (_, i) => i + 1).map((pageNumber) => (
              <PdfPage
                key={pageNumber}
                pdfDoc={pdfDoc}
                pageNumber={pageNumber}
                pins={comments.filter((c) => c.anchor?.page === pageNumber)}
                activeCommentId={activeCommentId}
                pendingPin={pendingPin}
                draftText={draftText}
                submitting={submitting}
                onPageClick={handlePageClick}
                onSelectPin={selectComment}
                onDraftChange={setDraftText}
                onSubmitComment={submitComment}
                onCancelPending={() => setPendingPin(null)}
                registerRef={(page, el) => {
                  if (el) pageRefs.current.set(page, el);
                  else pageRefs.current.delete(page);
                }}
              />
            ))}
          </div>
        )}
      </div>

      <div style={{ width: 340, borderLeft: "1px solid #e2e8f0", overflowY: "auto" }}>
        <CommentSidebar
          comments={comments}
          activeCommentId={activeCommentId}
          onSelectComment={selectComment}
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
