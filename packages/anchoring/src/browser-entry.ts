import { computeDomAnchor, resolveDomAnchor } from "./dom-anchor";
import type { AnchorPayload } from "@easymarker/shared";

// Bundled into a single IIFE and injected into every proxied page by apps/proxy.
// Must not assume any other Easymarker code is present in that page's document.

declare global {
  interface Window {
    __EASYMARKER_PARENT_ORIGIN__?: string;
  }
}

function parentOrigin(): string | null {
  return window.__EASYMARKER_PARENT_ORIGIN__ ?? null;
}

function postToParent(message: unknown): void {
  const origin = parentOrigin();
  if (!origin) return;
  window.parent.postMessage(message, origin);
}

// Capture phase, not bubble: the target page's own scripts frequently call
// stopPropagation() on interactive elements (menu toggles, dropdowns, etc.) —
// a bubble-phase listener would never see those clicks at all. Capture fires
// window-down before the event reaches the target, so this always sees it
// regardless of what the page's own handlers do afterward. Confirmed via a
// real click on a WordPress nav-toggle icon during benchmarking: the click
// silently vanished with a bubble-phase listener.
//
// preventDefault + stopPropagation are equally load-bearing, not just capture:
// the review view is supposed to freeze the page for annotation only (PRD
// §8.5 — clicking anywhere opens a comment, nothing else). Without these, a
// click on a linked heading (extremely common: post titles link to the full
// post) still navigates the iframe away after we've already computed an
// anchor against the page that's about to disappear — confirmed on a real
// blog where the stored selector matched zero elements moments later because
// the iframe had already navigated to the linked article.
window.addEventListener(
  "click",
  (e: MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const anchor = computeDomAnchor(e.clientX, e.clientY, document);
    postToParent({
      type: "easymarker:pin-candidate",
      anchor,
      viewportX: e.clientX,
      viewportY: e.clientY,
    });
  },
  true
);

window.addEventListener("resize", () => {
  postToParent({ type: "easymarker:viewport-changed" });
});

// Pins are drawn by the parent in viewport coordinates, so they have to be
// re-resolved whenever this page scrolls — otherwise they stay put while the
// content moves underneath them. Throttled to one message per frame.
let scrollQueued = false;
window.addEventListener(
  "scroll",
  () => {
    if (scrollQueued) return;
    scrollQueued = true;
    requestAnimationFrame(() => {
      scrollQueued = false;
      postToParent({ type: "easymarker:viewport-changed" });
    });
  },
  { passive: true }
);

// Scrolls so the anchored point sits roughly in the middle of the viewport,
// unless it's already comfortably visible. Used by shared comment links and
// before taking a screenshot of a comment.
function bringIntoView(anchor: AnchorPayload, alwaysCenter = false): void {
  const pos = resolveDomAnchor(anchor, document);
  if (!pos) return;
  const margin = 80;
  const visible =
    pos.x >= 0 && pos.x <= window.innerWidth && pos.y >= margin && pos.y <= window.innerHeight - margin;
  if (visible && !alwaysCenter) return;
  window.scrollTo({
    left: window.scrollX + pos.x - window.innerWidth / 2,
    top: window.scrollY + pos.y - window.innerHeight / 2,
    behavior: "instant" as ScrollBehavior,
  });
}

// 1x1 transparent GIF used in place of any image the capture can't fetch, so
// one broken image doesn't fail the whole screenshot.
const TRANSPARENT_PIXEL =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

async function captureViewport(): Promise<Blob | null> {
  // Bundled into the injected script, but only initialised the first time a
  // screenshot is actually requested.
  const { toBlob } = await import("html-to-image");
  const width = document.documentElement.clientWidth || window.innerWidth;
  const height = window.innerHeight;
  const bodyBg = getComputedStyle(document.body).backgroundColor;
  const htmlBg = getComputedStyle(document.documentElement).backgroundColor;
  const isTransparent = (c: string) => !c || c === "transparent" || c === "rgba(0, 0, 0, 0)";
  const backgroundColor = !isTransparent(bodyBg) ? bodyBg : !isTransparent(htmlBg) ? htmlBg : "#ffffff";

  return toBlob(document.documentElement, {
    width,
    height,
    pixelRatio: Math.min(2, window.devicePixelRatio || 1),
    backgroundColor,
    cacheBust: false,
    imagePlaceholder: TRANSPARENT_PIXEL,
    style: {
      transform: `translate(${-window.scrollX}px, ${-window.scrollY}px)`,
      transformOrigin: "0 0",
    },
    filter: (node) => !(node instanceof HTMLScriptElement),
  });
}

window.addEventListener("message", async (e: MessageEvent) => {
  const origin = parentOrigin();
  if (!origin || e.origin !== origin) return;

  const data = e.data as {
    type?: string;
    anchors?: Array<{ id: string; anchor: AnchorPayload }>;
    anchor?: AnchorPayload;
    requestId?: string;
  };
  if (data?.type === "easymarker:resolve-anchors" && Array.isArray(data.anchors)) {
    const positions = data.anchors.map(({ id, anchor }) => ({
      id,
      position: resolveDomAnchor(anchor, document),
    }));
    postToParent({ type: "easymarker:anchor-positions", positions });
    return;
  }

  if (data?.type === "easymarker:scroll-to-anchor" && data.anchor) {
    bringIntoView(data.anchor);
    postToParent({ type: "easymarker:viewport-changed" });
    return;
  }

  if (data?.type === "easymarker:capture" && data.anchor && data.requestId) {
    const requestId = data.requestId;
    const startX = window.scrollX;
    const startY = window.scrollY;
    try {
      // Centre the pin so the screenshot shows what's around it, then put the
      // page back where the reviewer had it.
      bringIntoView(data.anchor, true);
      const pos = resolveDomAnchor(data.anchor, document);
      const blob = await captureViewport();
      postToParent({
        type: "easymarker:capture-result",
        requestId,
        blob,
        pinX: pos?.x ?? null,
        pinY: pos?.y ?? null,
        width: document.documentElement.clientWidth || window.innerWidth,
        height: window.innerHeight,
      });
    } catch {
      postToParent({ type: "easymarker:capture-result", requestId, blob: null });
    }
    window.scrollTo({ left: startX, top: startY, behavior: "instant" as ScrollBehavior });
    postToParent({ type: "easymarker:viewport-changed" });
  }
});

postToParent({ type: "easymarker:ready" });
