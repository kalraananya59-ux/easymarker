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

window.addEventListener("message", (e: MessageEvent) => {
  const origin = parentOrigin();
  if (!origin || e.origin !== origin) return;

  const data = e.data as { type?: string; anchors?: Array<{ id: string; anchor: AnchorPayload }> };
  if (data?.type === "easymarker:resolve-anchors" && Array.isArray(data.anchors)) {
    const positions = data.anchors.map(({ id, anchor }) => ({
      id,
      position: resolveDomAnchor(anchor, document),
    }));
    postToParent({ type: "easymarker:anchor-positions", positions });
  }
});

postToParent({ type: "easymarker:ready" });
