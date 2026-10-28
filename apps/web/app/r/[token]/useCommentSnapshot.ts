"use client";

import { useCallback, useRef, useState } from "react";
import { commentShareUrl, composeCommentSnapshot, type PageCapture } from "./snapshot";
import type { SnapshotState } from "./SnapshotModal";
import type { CommentData } from "./types";

// Shared by the website, image and PDF review screens. Each screen only has
// to say how to capture the area under a comment's pin; this turns that into
// the finished image and the state the SnapshotModal shows.
export function useCommentSnapshot<C extends CommentData>({
  comments,
  title,
  capture,
}: {
  comments: C[];
  title: string;
  capture: (comment: C) => Promise<PageCapture | null>;
}) {
  const [snapshot, setSnapshot] = useState<SnapshotState | null>(null);
  const latestRequest = useRef(0);

  const takeScreenshot = useCallback(
    async (commentId: string) => {
      const index = comments.findIndex((c) => c.id === commentId);
      const comment = comments[index];
      if (!comment) return;
      const request = ++latestRequest.current;
      setSnapshot({ status: "working", commentId });

      let pageCapture: PageCapture | null = null;
      try {
        pageCapture = await capture(comment);
      } catch {
        // Fall back to an image of just the comment card.
        pageCapture = null;
      }

      try {
        const blob = await composeCommentSnapshot({
          capture: pageCapture,
          comment,
          number: index + 1,
          projectTitle: title,
        });
        if (request !== latestRequest.current) return;
        const safeTitle = title.replace(/[^a-z0-9-]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase() || "comment";
        setSnapshot({
          status: "ready",
          commentId,
          blob,
          fileName: `${safeTitle}-comment-${index + 1}.png`,
          shareUrl: commentShareUrl(commentId),
        });
      } catch {
        if (request === latestRequest.current) setSnapshot({ status: "error", commentId });
      }
    },
    [comments, title, capture]
  );

  const closeSnapshot = useCallback(() => {
    latestRequest.current++;
    setSnapshot(null);
  }, []);

  return { snapshot, takeScreenshot, closeSnapshot };
}
