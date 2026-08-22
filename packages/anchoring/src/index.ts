import type { AnchorPayload } from "@easymarker/shared";
import { computeDomAnchor, resolveDomAnchor } from "./dom-anchor";

export type { ResolvedPosition } from "./dom-anchor";

export function computeAnchor(clickX: number, clickY: number, doc: Document): AnchorPayload {
  return computeDomAnchor(clickX, clickY, doc);
}

export function resolveAnchor(
  anchor: AnchorPayload,
  doc: Document
): { x: number; y: number; confidence: number } | null {
  return resolveDomAnchor(anchor, doc);
}

export function computeAssetAnchor(
  clickX: number,
  clickY: number,
  assetWidth: number,
  assetHeight: number,
  page?: number
): AnchorPayload {
  return {
    strategy: "percentage",
    xPct: clickX / assetWidth,
    yPct: clickY / assetHeight,
    page,
    confidence: 1,
  };
}
