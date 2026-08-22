import type { AnchorPayload } from "@easymarker/shared";

export interface ResolvedPosition {
  x: number;
  y: number;
  confidence: number;
}

const STABLE_TEST_ATTRS = ["data-testid", "data-test", "data-qa", "data-cy"];
const MAX_ANCESTOR_WALK = 8;
const TEXT_QUOTE_MAX_LENGTH = 32;

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0.5;
  return Math.max(0, Math.min(1, n));
}

function cssEscape(value: string): string {
  if (typeof CSS !== "undefined" && CSS.escape) return CSS.escape(value);
  return value.replace(/[^a-zA-Z0-9_-]/g, (c) => `\\${c}`);
}

interface StableMatch {
  el: Element;
  selector: string;
  confidence: number;
}

function checkStableSelf(doc: Document, el: Element): StableMatch | null {
  const id = el.getAttribute("id");
  if (id) {
    const sel = `#${cssEscape(id)}`;
    try {
      if (doc.querySelectorAll(sel).length === 1) return { el, selector: sel, confidence: 1.0 };
    } catch {
      /* invalid id for CSS selector syntax, skip */
    }
  }

  for (const attr of STABLE_TEST_ATTRS) {
    const val = el.getAttribute(attr);
    if (val) {
      const sel = `[${attr}="${val.replace(/"/g, '\\"')}"]`;
      try {
        if (doc.querySelectorAll(sel).length === 1) return { el, selector: sel, confidence: 1.0 };
      } catch {
        /* ignore */
      }
    }
  }

  const role = el.getAttribute("role");
  if (role) {
    const sel = `[role="${role.replace(/"/g, '\\"')}"]`;
    try {
      if (doc.querySelectorAll(sel).length === 1) return { el, selector: sel, confidence: 0.85 };
    } catch {
      /* ignore */
    }
  }

  return null;
}

function findStable(doc: Document, start: Element, maxDepth: number | null): StableMatch | null {
  let el: Element | null = start;
  let depth = 0;
  while (el) {
    const match = checkStableSelf(doc, el);
    if (match) return match;
    if (maxDepth !== null && depth >= maxDepth) return null;
    el = el.parentElement;
    depth++;
  }
  return null;
}

function nthChildSegment(el: Element): string {
  const tag = el.tagName.toLowerCase();
  const parent = el.parentElement;
  if (!parent) return tag;
  let index = 1;
  for (const sibling of Array.from(parent.children)) {
    if (sibling === el) break;
    index++;
  }
  return `${tag}:nth-child(${index})`;
}

function buildStructuralChain(base: Element, target: Element): string | null {
  if (base === target) return null;
  const segments: string[] = [];
  let el: Element | null = target;
  while (el && el !== base) {
    segments.unshift(nthChildSegment(el));
    el = el.parentElement;
  }
  if (el !== base) return null;
  return segments.join(" > ");
}

function extractTextQuote(el: Element): string | undefined {
  const text = (el.textContent ?? "").replace(/\s+/g, " ").trim();
  if (!text) return undefined;
  return text.slice(0, TEXT_QUOTE_MAX_LENGTH);
}

export function computeDomAnchor(clickX: number, clickY: number, doc: Document): AnchorPayload {
  const target = doc.elementFromPoint(clickX, clickY) ?? doc.body;

  let anchorEl: Element;
  let selector: string;
  let confidence: number;

  const nearStable = findStable(doc, target, MAX_ANCESTOR_WALK);
  if (nearStable) {
    anchorEl = nearStable.el;
    selector = nearStable.selector;
    confidence = nearStable.confidence;
  } else {
    const farStable = findStable(doc, target, null);
    const base = farStable ?? { el: doc.body, selector: "body", confidence: 0 };
    const chain = buildStructuralChain(base.el, target);
    anchorEl = target;
    selector = chain ? `${base.selector} > ${chain}` : base.selector;
    confidence = 0.6;
  }

  const rect = anchorEl.getBoundingClientRect();
  const offsetXPct = rect.width > 0 ? clamp01((clickX - rect.left) / rect.width) : 0.5;
  const offsetYPct = rect.height > 0 ? clamp01((clickY - rect.top) / rect.height) : 0.5;

  const docEl = doc.documentElement;
  const scrollX = doc.defaultView?.scrollX ?? 0;
  const scrollY = doc.defaultView?.scrollY ?? 0;
  const fallbackXPct = docEl.scrollWidth > 0 ? clamp01((clickX + scrollX) / docEl.scrollWidth) : 0.5;
  const fallbackYPct = docEl.scrollHeight > 0 ? clamp01((clickY + scrollY) / docEl.scrollHeight) : 0.5;

  return {
    strategy: "dom",
    selector,
    offsetXPct,
    offsetYPct,
    textQuote: extractTextQuote(anchorEl),
    fallbackXPct,
    fallbackYPct,
    confidence,
  };
}

function positionFromElement(el: Element, offsetXPct: number | undefined, offsetYPct: number | undefined) {
  const rect = el.getBoundingClientRect();
  return {
    x: rect.left + (offsetXPct ?? 0.5) * rect.width,
    y: rect.top + (offsetYPct ?? 0.5) * rect.height,
  };
}

function relaxSelector(selector: string): string | null {
  const segments = selector.split(" > ");
  if (segments.length <= 1) return null;
  return segments.slice(0, -1).join(" > ");
}

const SHOW_TEXT = 4; // NodeFilter.SHOW_TEXT — used as a literal so this doesn't depend on the global existing

function findElementByTextQuote(doc: Document, quote: string): Element | null {
  const walker = doc.createTreeWalker(doc.body, SHOW_TEXT);
  const matches: Element[] = [];
  let node = walker.nextNode();
  while (node) {
    const text = (node.textContent ?? "").replace(/\s+/g, " ");
    if (text.includes(quote) && node.parentElement) {
      matches.push(node.parentElement);
    }
    node = walker.nextNode();
  }
  return matches.length === 1 ? matches[0]! : null;
}

export function resolveDomAnchor(anchor: AnchorPayload, doc: Document): ResolvedPosition | null {
  if (anchor.strategy !== "dom") return null;

  if (anchor.selector) {
    try {
      const matches = doc.querySelectorAll(anchor.selector);
      if (matches.length === 1) {
        return { ...positionFromElement(matches[0]!, anchor.offsetXPct, anchor.offsetYPct), confidence: anchor.confidence };
      }
      if (matches.length > 1) {
        return {
          ...positionFromElement(matches[0]!, anchor.offsetXPct, anchor.offsetYPct),
          confidence: Math.min(anchor.confidence, 0.7),
        };
      }
    } catch {
      /* invalid/stale selector, fall through */
    }
  }

  if (anchor.textQuote) {
    const el = findElementByTextQuote(doc, anchor.textQuote);
    if (el) {
      return { ...positionFromElement(el, anchor.offsetXPct, anchor.offsetYPct), confidence: 0.5 };
    }
  }

  if (anchor.selector) {
    const relaxed = relaxSelector(anchor.selector);
    if (relaxed) {
      try {
        const matches = doc.querySelectorAll(relaxed);
        if (matches.length === 1) {
          return { ...positionFromElement(matches[0]!, anchor.offsetXPct, anchor.offsetYPct), confidence: 0.65 };
        }
      } catch {
        /* ignore */
      }
    }
  }

  if (typeof anchor.fallbackXPct === "number" && typeof anchor.fallbackYPct === "number") {
    const docEl = doc.documentElement;
    const scrollX = doc.defaultView?.scrollX ?? 0;
    const scrollY = doc.defaultView?.scrollY ?? 0;
    return {
      x: anchor.fallbackXPct * docEl.scrollWidth - scrollX,
      y: anchor.fallbackYPct * docEl.scrollHeight - scrollY,
      confidence: 0,
    };
  }

  return null;
}
