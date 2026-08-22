# Anchoring Algorithm — Easymarker §8.5

**Status:** Draft for founder review. Written by the engineering agent per PRD §15 Open Decision #2, based on established prior art from production DOM-annotation tools (BugHerd, Marker.io, Usersnap, Hypothesis.is). Not yet implemented — `packages/anchoring` stays at "Not yet implemented" until this is approved.

**Resolves Open Decision #2:** Hybrid approach — a generated CSS selector locates a stable anchor element; a percentage offset within that element gives sub-element precision; a raw viewport-percentage fallback is stored alongside it as a last resort. This is closer to "DOM-based" than "visual fingerprint," but the offset-percentage layer and the fallback chain borrow from both.

---

## 1. Why not plain XPath

The `AnchorPayload` type currently stubbed in `packages/shared` has an `xpath` field, presumably from an early sketch. Absolute XPath (`/html/body/div[3]/section[2]/div[7]`) breaks on almost any DOM change — a single inserted `<div>` anywhere upstream shifts every index below it. Production annotation tools avoid this by anchoring to a *specific element* via a robust selector, then storing an offset within that element, so the pin survives layout shifts as long as the element itself still exists somewhere.

This doc proposes replacing `xpath` with `selector` (a CSS selector string) in `AnchorPayload`, plus a few new fields. See §7 for the finalized schema.

## 2. Computing an anchor (click → payload)

When the reviewer clicks a point on the page:

1. **Identify the clicked element** via `document.elementFromPoint(clientX, clientY)`.
2. **Walk up from that element** (capped at 8 ancestor levels) looking for the nearest element satisfying, in priority order:
   - a. A non-empty `id` attribute that is unique in the document (`document.querySelectorAll('#' + CSS.escape(id)).length === 1`)
   - b. A stable test-hook attribute: `data-testid`, `data-test`, `data-qa`, `data-cy` — same uniqueness check
   - c. An ARIA landmark (`role` + accessible name) that is unique
   - d. Nothing found in 8 levels → fall back to a **structural selector**: walk up (unbounded this time) from the clicked element to the nearest ancestor found in step (a)–(c), or to `<body>` if none exists anywhere, and build a `tagName:nth-child(n)` chain from there down to the clicked element.

   *(Implementation note: the chain uses pure `nth-child` indexing, not class-name disambiguation — the class-name-filtering idea originally sketched here added real complexity for marginal benefit, since tier (d) already carries the lowest creation-time confidence and tiers 2/3 exist specifically to recover when structural drift breaks it. This is exactly the kind of tuning call §11 flags as something the benchmark should validate, not something to over-engineer up front.)*
3. **Compute the offset** within the anchor element's live bounding box at click time:
   ```
   offsetXPct = (clickX - rect.left) / rect.width   // clamped [0, 1]
   offsetYPct = (clickY - rect.top) / rect.height    // clamped [0, 1]
   ```
4. **Capture a text-quote fallback signal**: up to 32 characters of `textContent` from the anchor element (trimmed, whitespace-collapsed). Used only as a tier-2 resolution fallback (§3), never as the primary lookup.
5. **Capture a raw viewport-percentage fallback**: the click position as a percentage of the full page's scrollable content area at click time (`fallbackXPct`, `fallbackYPct`). This is the last-resort position if every DOM-based strategy fails on resolution — the same mechanism `computeAssetAnchor` already uses for images/PDFs, so total failure degrades to the same behavior Phase 1 already ships elsewhere.
6. **Assign initial confidence**: `1.0` for tier (a)/(b), `0.85` for tier (c), `0.6` for tier (d).

## 3. Resolving an anchor (payload → position)

On page load, and again on every resize (§4):

1. **Tier 1 — direct selector match.** `document.querySelectorAll(selector)`.
   - Exactly one match → position = element's live bounding box + stored offset%. Confidence = stored confidence, unchanged.
   - Multiple matches (selector no longer unique) → use the first, cap confidence at `0.7` (ambiguity penalty).
   - Zero matches → proceed to tier 2.
2. **Tier 2 — text-quote fallback.** Search the document's text nodes for the stored quote (plain substring search first; this is a Phase 1 corpus of real pages, not millions of documents, so no fuzzy-matching library is needed yet — see §9 on what NOT to build).
   - Found in exactly one place → anchor to the nearest containing element, recompute offset% the same way as §2 step 3, cap confidence at `0.5`.
   - Not found, or found in multiple places with no way to disambiguate → proceed to tier 3.
3. **Tier 3 — structural relaxation.** Drop the last segment of the `nth-child` chain (if the selector was structural) and retry the query. If this now resolves uniquely, cap confidence at `0.65`.
4. **Tier 4 — total failure.** Render the pin at `(fallbackXPct, fallbackYPct)` from the raw viewport-percentage fallback, confidence `0`.

**Warning indicator rule (PRD §8.5 acceptance criteria):** show "Position may have shifted" whenever resolved confidence is `< 0.7`. This means tier-1 unambiguous matches never show it; tier-1 ambiguous matches, tier-2, tier-3, and tier-4 all do.

## 4. Resize behavior (2-second requirement)

Do **not** re-run the full fallback chain on every resize. On a debounced resize event (~200ms debounce):
- If the anchor's selector is already known to resolve (tier 1 from the last full resolution), just recompute the bounding box + offset% — this is a single `querySelector` and a rect read, effectively instant, nowhere close to the 2-second budget.
- Only re-run the full tier 1→4 chain if the previously-resolving selector now returns zero matches (meaning the responsive layout actually removed/replaced the element, not just repositioned it).

## 5. Cross-origin iframe architecture (implementation-critical)

This is a real constraint discovered while building §8.1/§8.3, not a hypothetical: URL-based review pages render the target site inside an `<iframe src="http://localhost:4000/render?...">` — the proxy's own origin, different from the parent `/r/[token]` page's origin. Browsers block same-origin-policy access from a parent page into cross-origin iframe content, so **the click-capture and anchor-resolution script cannot run from the parent page.** It must be injected directly into the HTML the proxy rewrites (`apps/proxy/src/render.ts`), where it runs same-origin with the proxied content.

Proposed protocol:
1. The proxy's `rewriteHtml()` injects a `<script>` before `</body>` on every rendered page. This script implements §2/§3 above and listens for `click` events on `document`.
2. On click, the injected script computes the anchor payload and `postMessage`s it to the parent window: `{ type: "easymarker:pin-candidate", anchor, viewportX, viewportY }`.
3. The parent `/r/[token]` page (already listening via a `message` event handler) receives this, translates `viewportX/Y` into parent-page pixel coordinates using the iframe's own `getBoundingClientRect()`, and opens the existing compose UI (already built for the image flow — same `NamePrompt`/comment-compose components, reused) positioned there.
4. To render **existing** pins, the parent sends `{ type: "easymarker:resolve-anchors", anchors: [...] }` into the iframe; the injected script resolves each one (§3) and replies with `{ type: "easymarker:anchor-positions", positions: [...] }`. The parent draws the pin markers as absolutely-positioned elements *in the parent DOM, on top of the iframe* — not inside the iframe — so they remain clickable/interactive without further cross-origin gymnastics.
5. `postMessage` target origin is locked to the exact proxy origin (`PROXY_SERVICE_URL`) in both directions — never `"*"` — since arbitrary third-party page content must not be able to forge messages the parent trusts.

This means implementing §8.5 touches three places: `packages/anchoring` (the compute/resolve algorithm, tested standalone), `apps/proxy/src/render.ts` (inject the script), and the `/r/[token]` review page (postMessage listener + pin rendering, reusing the `ReviewOverlay`/`CommentSidebar` components already built for images).

## 6. Multi-pin stacking

UI-layer concern, not part of the anchoring algorithm itself: once pins are resolved to pixel positions, group any pins within 10px of each other and render a single marker with a count badge; clicking it expands the list. Operates purely on already-resolved `(x, y)` output — no changes to §2/§3 needed.

## 7. Finalized `AnchorPayload` schema

Supersedes the current stub in `packages/shared`:

```ts
export interface AnchorPayload {
  strategy: "dom" | "percentage";

  // strategy: "dom" (URL projects)
  selector?: string;          // CSS selector, not XPath — see §1
  offsetXPct?: number;        // offset within the anchor element, [0,1]
  offsetYPct?: number;
  textQuote?: string;         // up to 32 chars, tier-2 fallback signal
  fallbackXPct?: number;      // raw viewport %, tier-4 last resort
  fallbackYPct?: number;

  // strategy: "percentage" (image/PDF projects — already implemented, unchanged)
  xPct?: number;
  yPct?: number;
  page?: number;

  confidence: number;         // 0–1, see §3 for how it's set
}
```

## 8. Confidence → UI behavior

| Confidence | Meaning | UI |
|---|---|---|
| 1.0 | Unique id/test-attribute match | Pin shown normally |
| 0.85 | Unique ARIA landmark match | Pin shown normally |
| 0.7 | Ambiguous selector, first match used | Pin shown normally (right at the warning boundary) |
| 0.65 | Structural relaxation (tier 3) | "Position may have shifted" warning |
| 0.6 | Structural selector, first-time compute | Pin shown normally (this is a *creation*-time score, not resolution) |
| 0.5 | Text-quote fallback (tier 2) | "Position may have shifted" warning |
| 0.0 | Total failure, raw fallback position | "Position may have shifted" warning |

## 9. Benchmark methodology (§12.1)

`scripts/anchoring-corpus.json` doesn't exist yet, and per the PRD it needs 50 real-world URLs. Important clarification on how the ground truth actually works, since hand-authoring "the correct pixel position" for 50 arbitrary live websites isn't meaningful or stable: **the benchmark is self-referential**, the same design every tool in this space uses —

1. For each corpus URL, the benchmark runner loads the page, places a pin at a scripted click coordinate, and records the resolved anchor payload plus the resolved pixel position at that moment. This recorded position **is** the ground truth for that run — not an externally authored expectation.
2. **Same-content recovery (≥95% target):** reload the identical page, resolve the same stored anchor, and check the new position is within 5px of the recorded ground truth.
3. **Degraded recovery (≥90% target):** apply a scripted "minor change" to the page before reload (inject a new nav item, edit unrelated text elsewhere, shift a sibling section) and re-check the 5px tolerance.
4. The 50 URLs should span a genuinely diverse set: static marketing sites, React/Vue/Next SPAs, WordPress sites, sites with heavy lazy-loading, sites with cookie-consent banners that shift layout — since those are exactly the cases each fallback tier exists for.
5. `scripts/anchoring-corpus.json` schema:
   ```json
   [
     { "url": "https://example.com", "clickTarget": { "selectorHint": "h1" }, "category": "static" }
   ]
   ```
   `selectorHint` tells the runner roughly where to click (e.g., "the first `<h1>`") so the corpus is reproducible without hardcoding pixel coordinates that would break if the runner's viewport size changes.

I can populate an initial 50-URL list and build the benchmark runner (`scripts/`) once this design is approved — that's straightforward mechanical work once the algorithm itself is settled.

## 10. What NOT to build (Phase 1)

Mirroring the PRD's own discipline in §9/§17.4:
- No fuzzy string-matching library (Levenshtein/diff-match-patch) for tier 2 — plain substring search first; only revisit if the benchmark shows it's actually needed.
- No mutation-observer-based live re-anchoring while the reviewer is on the page — resolution happens on load and on resize, not continuously.
- No machine-learning/visual-fingerprint (screenshot-diffing) approach — out of scope per the Open Decision #2 framing itself.
- No cross-tab or cross-session anchor caching — every resolution is computed fresh.

## 11. Residual open question for the founder

Everything above is specific enough to implement without further guessing, with one exception: **the 8-level ancestor walk cap and the specific confidence numbers in §2/§8 are reasonable defaults, not empirically tuned.** They're exactly the kind of constants the benchmark in §9 will validate or contradict once real data exists. I'd treat them as a starting point, run the corpus once implemented, and adjust — flagging this now rather than presenting them as settled science.
