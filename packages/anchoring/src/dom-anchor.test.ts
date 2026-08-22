import { describe, it, expect } from "vitest";
import { JSDOM } from "jsdom";
import { computeDomAnchor, resolveDomAnchor } from "./dom-anchor";

function makeDoc(html: string): Document {
  const dom = new JSDOM(`<!DOCTYPE html><html><body>${html}</body></html>`, {
    pretendToBeVisual: true,
  });
  const doc = dom.window.document;

  // jsdom has no real layout engine; give every element a deterministic rect.
  for (const el of Array.from(doc.querySelectorAll("*"))) {
    (el as unknown as { getBoundingClientRect: () => DOMRect }).getBoundingClientRect = () =>
      ({ left: 0, top: 0, width: 200, height: 100, right: 200, bottom: 100, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;
  }
  Object.defineProperty(doc.documentElement, "scrollWidth", { value: 1000, configurable: true });
  Object.defineProperty(doc.documentElement, "scrollHeight", { value: 2000, configurable: true });

  return doc;
}

function clickOn(doc: Document, el: Element, x = 50, y = 25) {
  doc.elementFromPoint = () => el;
  return computeDomAnchor(x, y, doc);
}

describe("computeDomAnchor", () => {
  it("anchors to a unique id with confidence 1.0", () => {
    const doc = makeDoc(`<div><p id="hero-text">Hello world</p></div>`);
    const el = doc.getElementById("hero-text")!;
    const anchor = clickOn(doc, el);
    expect(anchor.strategy).toBe("dom");
    expect(anchor.selector).toBe("#hero-text");
    expect(anchor.confidence).toBe(1.0);
  });

  it("anchors to a unique data-testid with confidence 1.0", () => {
    const doc = makeDoc(`<div><button data-testid="submit-btn">Go</button></div>`);
    const el = doc.querySelector('[data-testid="submit-btn"]')!;
    const anchor = clickOn(doc, el);
    expect(anchor.selector).toBe('[data-testid="submit-btn"]');
    expect(anchor.confidence).toBe(1.0);
  });

  it("prefers id over a role when both are present on an ancestor", () => {
    const doc = makeDoc(`<nav id="main-nav" role="navigation"><a href="#">Link</a></nav>`);
    const el = doc.querySelector("a")!;
    const anchor = clickOn(doc, el);
    expect(anchor.selector).toBe("#main-nav");
    expect(anchor.confidence).toBe(1.0);
  });

  it("falls back to a unique role with confidence 0.85 when no id/test-attr exists", () => {
    const doc = makeDoc(`<nav role="navigation"><a href="#">Link</a></nav>`);
    const el = doc.querySelector("a")!;
    const anchor = clickOn(doc, el);
    expect(anchor.selector).toBe('[role="navigation"]');
    expect(anchor.confidence).toBe(0.85);
  });

  it("does not use a role that isn't unique in the document", () => {
    const doc = makeDoc(`
      <nav role="navigation"><a id="link-a" href="#">A</a></nav>
      <nav role="navigation"><a id="link-b" href="#">B</a></nav>
    `);
    const el = doc.getElementById("link-b")!;
    const anchor = clickOn(doc, el);
    expect(anchor.selector).toBe("#link-b");
  });

  it("builds a structural nth-child chain when nothing stable exists within 8 levels", () => {
    const doc = makeDoc(`
      <div><div><div><div><div><div><div><div><div>
        <span>deeply nested</span>
      </div></div></div></div></div></div></div></div></div>
    `);
    const el = doc.querySelector("span")!;
    const anchor = clickOn(doc, el);
    expect(anchor.confidence).toBe(0.6);
    expect(anchor.selector).toContain("nth-child");
    expect(anchor.selector.startsWith("body")).toBe(true);
  });

  it("computes offset percentage relative to the anchor element's bounding box", () => {
    const doc = makeDoc(`<div id="box">content</div>`);
    const el = doc.getElementById("box")!;
    // rect is {left:0, top:0, width:200, height:100} per makeDoc's mock
    const anchor = clickOn(doc, el, 100, 50);
    expect(anchor.offsetXPct).toBeCloseTo(0.5);
    expect(anchor.offsetYPct).toBeCloseTo(0.5);
  });

  it("captures a text quote from the anchor element", () => {
    const doc = makeDoc(`<p id="para">The quick brown fox jumps over the lazy dog and keeps running</p>`);
    const el = doc.getElementById("para")!;
    const anchor = clickOn(doc, el);
    expect(anchor.textQuote).toBe("The quick brown fox jumps over t");
    expect(anchor.textQuote!.length).toBeLessThanOrEqual(32);
  });

  it("always includes a raw fallback percentage", () => {
    const doc = makeDoc(`<div id="box">content</div>`);
    const el = doc.getElementById("box")!;
    const anchor = clickOn(doc, el, 100, 200);
    expect(anchor.fallbackXPct).toBeCloseTo(100 / 1000);
    expect(anchor.fallbackYPct).toBeCloseTo(200 / 2000);
  });
});

describe("resolveDomAnchor", () => {
  it("tier 1: resolves a still-unique selector at full stored confidence", () => {
    const doc = makeDoc(`<p id="hero-text">Hello world</p>`);
    const result = resolveDomAnchor(
      { strategy: "dom", selector: "#hero-text", offsetXPct: 0.5, offsetYPct: 0.5, confidence: 1.0 },
      doc
    );
    expect(result).not.toBeNull();
    expect(result!.confidence).toBe(1.0);
    expect(result!.x).toBe(100); // rect.left(0) + 0.5*width(200)
  });

  it("tier 1: caps confidence at 0.7 when the selector becomes ambiguous", () => {
    const doc = makeDoc(`<div class="card">A</div><div class="card">B</div>`);
    const result = resolveDomAnchor(
      { strategy: "dom", selector: ".card", offsetXPct: 0.5, offsetYPct: 0.5, confidence: 1.0 },
      doc
    );
    expect(result!.confidence).toBe(0.7);
  });

  it("tier 2: falls back to a unique text quote when the selector no longer matches", () => {
    const doc = makeDoc(`<p>The quick brown fox jumps over the lazy dog</p>`);
    const result = resolveDomAnchor(
      {
        strategy: "dom",
        selector: "#does-not-exist-anymore",
        offsetXPct: 0.5,
        offsetYPct: 0.5,
        textQuote: "The quick brown fox jumps over",
        confidence: 1.0,
      },
      doc
    );
    expect(result!.confidence).toBe(0.5);
  });

  it("tier 3: relaxes a structural selector by one segment", () => {
    const doc = makeDoc(`<div><section><p id="target-p">text</p></section></div>`);
    // Simulate a selector that assumed one extra wrapper level no longer present
    const result = resolveDomAnchor(
      {
        strategy: "dom",
        selector: "body > div:nth-child(1) > span:nth-child(1) > section:nth-child(1)",
        offsetXPct: 0.5,
        offsetYPct: 0.5,
        confidence: 0.6,
      },
      doc
    );
    // relaxed selector "body > div:nth-child(1) > span:nth-child(1)" won't match either (no span),
    // so this should fall through toward tier 4 rather than falsely succeeding.
    expect(result === null || result.confidence <= 0.65).toBe(true);
  });

  it("tier 3: succeeds when dropping the last segment resolves uniquely", () => {
    const doc = makeDoc(`<div id="wrap"><section>text</section></div>`);
    const result = resolveDomAnchor(
      {
        strategy: "dom",
        selector: "#wrap > section:nth-child(1) > em:nth-child(1)",
        offsetXPct: 0.5,
        offsetYPct: 0.5,
        confidence: 0.6,
      },
      doc
    );
    expect(result).not.toBeNull();
    expect(result!.confidence).toBe(0.65);
  });

  it("tier 4: falls back to the raw viewport percentage when everything else fails", () => {
    const doc = makeDoc(`<p>unrelated content</p>`);
    const result = resolveDomAnchor(
      {
        strategy: "dom",
        selector: "#totally-gone",
        offsetXPct: 0.5,
        offsetYPct: 0.5,
        textQuote: "text that does not exist anywhere on this page",
        fallbackXPct: 0.25,
        fallbackYPct: 0.75,
        confidence: 1.0,
      },
      doc
    );
    expect(result).not.toBeNull();
    expect(result!.confidence).toBe(0);
    expect(result!.x).toBeCloseTo(0.25 * 1000);
    expect(result!.y).toBeCloseTo(0.75 * 2000);
  });

  it("returns null when nothing resolves and there is no fallback percentage", () => {
    const doc = makeDoc(`<p>unrelated content</p>`);
    const result = resolveDomAnchor(
      { strategy: "dom", selector: "#totally-gone", confidence: 1.0 },
      doc
    );
    expect(result).toBeNull();
  });

  it("returns null immediately for percentage-strategy anchors (not its job)", () => {
    const doc = makeDoc(`<p>content</p>`);
    const result = resolveDomAnchor({ strategy: "percentage", xPct: 0.5, yPct: 0.5, confidence: 1 }, doc);
    expect(result).toBeNull();
  });
});
