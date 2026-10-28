import type { CommentData } from "./types";

// Builds the shareable "comment screenshot" image entirely in the browser:
// the part of the reviewed page around the pin (when we could capture it),
// the pin itself, and a card with the comment underneath.

export interface PageCapture {
  source: CanvasImageSource;
  // Size of `source` in its own pixels.
  sourceWidth: number;
  sourceHeight: number;
  // Where the pin points, in `source` pixels.
  pinX: number;
  pinY: number;
}

const OUT_WIDTH = 1200;
const MAX_PAGE_HEIGHT = 680;
const PAD = 40;

const COLORS = {
  bg: "#0e0e11",
  card: "#17171b",
  border: "#33333c",
  text: "#f4f4f6",
  muted: "#a8a8b3",
  faint: "#70707c",
  violet: "#7b5cff",
  sky: "#5ec8ff",
  green: "#5fdc9a",
  resolvedPin: "#7d7d89",
};

const STATUS: Record<CommentData["status"], { label: string; color: string }> = {
  open: { label: "Open", color: COLORS.violet },
  in_progress: { label: "In progress", color: COLORS.sky },
  resolved: { label: "Resolved", color: COLORS.green },
};

const FONT = `"Hanken Grotesk", -apple-system, "Segoe UI", sans-serif`;
const DISPLAY_FONT = `"Bricolage Grotesque", "Hanken Grotesk", sans-serif`;

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split(/\n+/)) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    let line = "";
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (ctx.measureText(candidate).width <= maxWidth) {
        line = candidate;
        continue;
      }
      if (line) lines.push(line);
      line = word;
      // A single very long word (e.g. a URL) gets hard-broken.
      while (ctx.measureText(line).width > maxWidth && line.length > 1) {
        let cut = line.length - 1;
        while (cut > 1 && ctx.measureText(line.slice(0, cut)).width > maxWidth) cut--;
        lines.push(line.slice(0, cut));
        line = line.slice(cut);
      }
    }
    if (line) lines.push(line);
  }
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    kept[maxLines - 1] = `${kept[maxLines - 1]!.replace(/\s*\S*$/, "")}…`;
    return kept;
  }
  return lines;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// The teardrop pin used across Easymarker, tip at (x, y).
function drawPin(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, label: string) {
  const size = 40;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-Math.PI / 4);
  // A square with three rounded corners; the sharp corner is the tip.
  ctx.shadowColor = "rgba(0,0,0,0.45)";
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 4;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -size / 2);
  ctx.arc(size / 2, -size / 2, size / 2, Math.PI, Math.PI / 2, false);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.lineWidth = 3;
  ctx.strokeStyle = "#ffffff";
  ctx.stroke();
  ctx.restore();

  // Number in the middle of the pin body.
  // The body's centre sits straight above the tip once rotated by -45°.
  const cx = x;
  const cy = y - size * Math.SQRT1_2;
  ctx.fillStyle = "#ffffff";
  ctx.font = `800 17px ${FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, cx, cy);
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
}

export async function composeCommentSnapshot({
  capture,
  comment,
  number,
  projectTitle,
}: {
  capture: PageCapture | null;
  comment: CommentData;
  number: number;
  projectTitle: string;
}): Promise<Blob> {
  // Make sure the app fonts are ready before measuring/drawing text.
  try {
    await document.fonts.ready;
  } catch {
    // Older browsers: draw with whatever is available.
  }

  const scratch = document.createElement("canvas").getContext("2d")!;
  const cardInnerWidth = OUT_WIDTH - PAD * 4;
  scratch.font = `500 26px ${FONT}`;
  const bodyLines = wrapText(scratch, comment.body, cardInnerWidth, 8);
  const replyCount = comment.replies.length;

  // Crop of the page around the pin, scaled to the output width.
  let crop: { sx: number; sy: number; sw: number; sh: number; scale: number; height: number } | null = null;
  if (capture) {
    const sw = capture.sourceWidth;
    const scale = OUT_WIDTH / sw;
    const maxSourceHeight = Math.min(capture.sourceHeight, MAX_PAGE_HEIGHT / scale);
    let sy = capture.pinY - maxSourceHeight / 2;
    sy = Math.max(0, Math.min(sy, capture.sourceHeight - maxSourceHeight));
    crop = { sx: 0, sy, sw, sh: maxSourceHeight, scale, height: Math.round(maxSourceHeight * scale) };
  }

  const headerH = 76;
  const cardH = 150 + bodyLines.length * 38 + (replyCount > 0 ? 34 : 0);
  const height = headerH + (crop ? crop.height : 0) + PAD + cardH + PAD + 40;

  const canvas = document.createElement("canvas");
  const dpr = 2;
  canvas.width = OUT_WIDTH * dpr;
  canvas.height = height * dpr;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(dpr, dpr);

  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, OUT_WIDTH, height);

  // Header: project title + "Comment #n".
  ctx.fillStyle = COLORS.text;
  ctx.font = `700 26px ${DISPLAY_FONT}`;
  const titleLines = wrapText(ctx, projectTitle, OUT_WIDTH - PAD * 2 - 220, 1);
  ctx.fillText(titleLines[0] ?? projectTitle, PAD, 48);
  ctx.fillStyle = COLORS.muted;
  ctx.font = `600 18px ${FONT}`;
  ctx.textAlign = "right";
  ctx.fillText(`Comment #${number}`, OUT_WIDTH - PAD, 46);
  ctx.textAlign = "left";

  let y = headerH;
  if (capture && crop) {
    ctx.drawImage(capture.source, crop.sx, crop.sy, crop.sw, crop.sh, 0, y, OUT_WIDTH, crop.height);
    ctx.strokeStyle = COLORS.border;
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, y + 0.5, OUT_WIDTH - 1, crop.height - 1);
    const pinColor = comment.status === "resolved" ? COLORS.resolvedPin : COLORS.violet;
    const px = (capture.pinX - crop.sx) * crop.scale;
    const py = y + (capture.pinY - crop.sy) * crop.scale;
    drawPin(ctx, px, py, pinColor, String(number));
    y += crop.height;
  }

  // Comment card.
  y += PAD;
  const cardX = PAD;
  const cardW = OUT_WIDTH - PAD * 2;
  roundRect(ctx, cardX, y, cardW, cardH, 22);
  ctx.fillStyle = COLORS.card;
  ctx.fill();
  ctx.strokeStyle = COLORS.border;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  const innerX = cardX + PAD;
  let cy = y + PAD;

  // Avatar.
  ctx.fillStyle = comment.reviewerId ? COLORS.violet : "#2b2b33";
  ctx.beginPath();
  ctx.arc(innerX + 22, cy + 22, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = `700 20px ${FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(comment.reviewerName.trim().charAt(0).toUpperCase() || "?", innerX + 22, cy + 23);
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";

  ctx.fillStyle = COLORS.text;
  ctx.font = `700 22px ${FONT}`;
  ctx.fillText(comment.reviewerName, innerX + 60, cy + 19);
  ctx.fillStyle = COLORS.faint;
  ctx.font = `500 16px ${FONT}`;
  ctx.fillText(
    new Date(comment.createdAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }),
    innerX + 60,
    cy + 43
  );

  // Status pill.
  const status = STATUS[comment.status];
  ctx.font = `700 16px ${FONT}`;
  const pillW = ctx.measureText(status.label).width + 32;
  const pillX = cardX + cardW - PAD - pillW;
  roundRect(ctx, pillX, cy + 6, pillW, 32, 16);
  ctx.fillStyle = `${status.color}26`;
  ctx.fill();
  ctx.fillStyle = status.color;
  ctx.fillText(status.label, pillX + 16, cy + 28);

  cy += 44 + 46;
  ctx.fillStyle = COLORS.text;
  ctx.font = `500 26px ${FONT}`;
  for (const line of bodyLines) {
    ctx.fillText(line, innerX, cy);
    cy += 38;
  }
  if (replyCount > 0) {
    ctx.fillStyle = COLORS.muted;
    ctx.font = `500 17px ${FONT}`;
    ctx.fillText(`${replyCount} repl${replyCount === 1 ? "y" : "ies"} in the thread`, innerX, cy + 8);
  }

  // Footer.
  ctx.fillStyle = COLORS.faint;
  ctx.font = `600 16px ${FONT}`;
  ctx.fillText("Shared from Easymarker", PAD, height - 26);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Could not create image"))), "image/png");
  });
}

// Loads an image so it can be drawn onto a canvas and exported.
// Returns null if the image can't be read (e.g. the file host doesn't allow it).
export function loadImageForCanvas(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export function commentShareUrl(commentId: string): string {
  const url = new URL(window.location.href);
  url.search = "";
  url.hash = "";
  url.searchParams.set("c", commentId);
  return url.toString();
}

export function sharedCommentIdFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("c");
}
