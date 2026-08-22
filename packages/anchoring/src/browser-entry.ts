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

window.addEventListener("click", (e: MouseEvent) => {
  if (e.button !== 0) return;
  const anchor = computeDomAnchor(e.clientX, e.clientY, document);
  postToParent({
    type: "easymarker:pin-candidate",
    anchor,
    viewportX: e.clientX,
    viewportY: e.clientY,
  });
});

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
