// §12.1 anchoring recovery benchmark + §12.2 proxy rendering benchmark, run together
// since both draw from the same corpus. Requires `pnpm dev` running with a seeded user.
import { chromium } from "@playwright/test";
import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const corpus = JSON.parse(readFileSync(path.join(__dirname, "anchoring-corpus.json"), "utf-8"));
const BASE = "http://localhost:3000";
const PER_SITE_TIMEOUT_MS = 25000;

const limitArg = process.argv.find((a) => a.startsWith("--limit="));
const limit = limitArg ? parseInt(limitArg.split("=")[1], 10) : corpus.length;
const onlyArg = process.argv.find((a) => a.startsWith("--only="));
const sites = onlyArg
  ? corpus.filter((e) => onlyArg.slice("--only=".length).split(",").some((u) => e.url.includes(u)))
  : corpus.slice(0, limit);

const browser = await chromium.launch();
const context = await browser.newContext();
const page = await context.newPage();

await page.goto(`${BASE}/signin`);
await page.fill('input[type="email"]', "maya@example.com");
await page.fill('input[type="password"]', "correcthorsebattery");
await page.click('button[type="submit"]');
await page.waitForURL(`${BASE}/dashboard`, { timeout: 15000 });

const results = [];

async function testOneSite(entry) {
  const result = {
    url: entry.url,
    category: entry.category,
    proxyOk: false,
    sameContentRecovered: null,
    degradedRecovered: null,
    error: null,
  };

  // Create the project via the API directly (shares the session cookie with the
  // browser context) rather than driving the dashboard form — this is what's
  // actually being benchmarked (proxy + anchoring), not the create-project UI,
  // and it sidesteps a class of UI/network-event timing races entirely.
  const createResponse = await context.request.post(`${BASE}/api/projects`, {
    data: { url: entry.url },
    timeout: PER_SITE_TIMEOUT_MS,
  });
  if (createResponse.status() !== 201) {
    result.error = `project creation failed (status ${createResponse.status()})`;
    return result;
  }
  const createBody = await createResponse.json();
  const token = createBody?.project?.shareToken;
  if (!token) {
    result.error = "project creation response missing shareToken";
    return result;
  }

  const reviewPage = await context.newPage();
  try {
    await reviewPage.goto(`${BASE}/r/${token}`, { timeout: PER_SITE_TIMEOUT_MS });
    await reviewPage.waitForTimeout(1500);

    const iframeHandle = await reviewPage.waitForSelector("iframe", { timeout: 10000 });
    const frame = await iframeHandle.contentFrame();
    if (!frame) {
      result.error = "no iframe content frame";
      return result;
    }

    const bodyLength = await frame.evaluate(() => document.body?.innerText?.length ?? 0).catch(() => 0);
    if (bodyLength < 10) {
      result.error = "proxy rendered empty/error content";
      return result;
    }
    result.proxyOk = true;

    let clickX;
    let clickY;
    try {
      const iframeBoxForCheck = await iframeHandle.boundingBox();
      const candidates = frame.locator(entry.selectorHint);
      const count = Math.min(await candidates.count(), 10);
      for (let i = 0; i < count; i++) {
        const box = await candidates.nth(i).boundingBox().catch(() => null);
        // Reject elements with no size, or positioned off-screen (a common
        // accessibility pattern for "skip to content" links: not display:none,
        // so Playwright's default visibility check passes, but not clickable
        // on-screen either — this is exactly what was silently breaking ~40%
        // of sites in the first benchmark run before this fix).
        if (
          box &&
          box.width > 2 &&
          box.height > 2 &&
          box.x >= 0 &&
          box.y >= 0 &&
          box.x < iframeBoxForCheck.width &&
          box.y < iframeBoxForCheck.height
        ) {
          clickX = box.x + box.width / 2;
          clickY = box.y + Math.min(box.height / 2, 20);
          break;
        }
      }
    } catch {
      /* fall through to fallback click point */
    }
    if (clickX === undefined) {
      const iframeBox = await iframeHandle.boundingBox();
      clickX = iframeBox.x + iframeBox.width * 0.3;
      clickY = iframeBox.y + iframeBox.height * 0.3;
    }

    await reviewPage.mouse.click(clickX, clickY);
    await reviewPage.waitForTimeout(800);
    const textarea = await reviewPage.$("textarea");
    if (!textarea) {
      result.error = "no compose box appeared after click";
      return result;
    }
    await textarea.fill("benchmark");
    await reviewPage.locator('button:has-text("Comment")').first().click();
    await reviewPage.waitForTimeout(2000);

    const pinsAfterCreate = await reviewPage.$$('button[aria-label^="Comment by"]');
    const groundTruth = pinsAfterCreate.length === 1 ? await pinsAfterCreate[0].boundingBox() : null;
    if (!groundTruth) {
      result.error = "pin did not render after creation";
      return result;
    }

    // --- Same-content recovery: reload identical page ---
    await reviewPage.reload({ timeout: PER_SITE_TIMEOUT_MS });
    await reviewPage.waitForTimeout(2500);
    const pinsAfterReload = await reviewPage.$$('button[aria-label^="Comment by"]');
    if (pinsAfterReload.length === 1) {
      const box = await pinsAfterReload[0].boundingBox();
      const dx = Math.abs(box.x - groundTruth.x);
      const dy = Math.abs(box.y - groundTruth.y);
      result.sameContentRecovered = dx <= 5 && dy <= 5;
    } else {
      result.sameContentRecovered = false;
    }

    // --- Degraded recovery: mutate the DOM (simulate a minor content change), re-resolve without reload ---
    await frame
      .evaluate(() => {
        const marker = document.createElement("div");
        marker.textContent = "Injected nav item for benchmark";
        document.body.insertBefore(marker, document.body.firstChild);
      })
      .catch(() => {});
    await reviewPage.evaluate(() => window.dispatchEvent(new Event("resize")));
    await reviewPage.waitForTimeout(1000);
    const pinsAfterMutation = await reviewPage.$$('button[aria-label^="Comment by"]');
    if (pinsAfterMutation.length === 1) {
      const box = await pinsAfterMutation[0].boundingBox();
      const dx = Math.abs(box.x - groundTruth.x);
      const dy = Math.abs(box.y - groundTruth.y);
      result.degradedRecovered = dx <= 5 && dy <= 5;
    } else {
      result.degradedRecovered = false;
    }

    return result;
  } catch (err) {
    result.error = String(err?.message ?? err).slice(0, 200);
    return result;
  } finally {
    await reviewPage.close().catch(() => {});
  }
}

for (const entry of sites) {
  let result;
  try {
    result = await Promise.race([
      testOneSite(entry),
      new Promise((_, reject) => setTimeout(() => reject(new Error("site timeout")), PER_SITE_TIMEOUT_MS + 5000)),
    ]);
  } catch (err) {
    result = { url: entry.url, category: entry.category, proxyOk: false, error: String(err?.message ?? err) };
  }
  results.push(result);
  console.log(JSON.stringify(result));
}

await browser.close();

const total = results.length;
const proxyOkCount = results.filter((r) => r.proxyOk).length;
const sameContentAttempts = results.filter((r) => r.sameContentRecovered !== null && r.sameContentRecovered !== undefined);
const sameContentRecovered = sameContentAttempts.filter((r) => r.sameContentRecovered).length;
const degradedAttempts = results.filter((r) => r.degradedRecovered !== null && r.degradedRecovered !== undefined);
const degradedRecovered = degradedAttempts.filter((r) => r.degradedRecovered).length;

const summary = {
  totalUrls: total,
  proxyRenderSuccess: { count: proxyOkCount, total, pct: total ? (proxyOkCount / total) * 100 : 0 },
  sameContentRecovery: {
    count: sameContentRecovered,
    total: sameContentAttempts.length,
    pct: sameContentAttempts.length ? (sameContentRecovered / sameContentAttempts.length) * 100 : 0,
  },
  degradedRecovery: {
    count: degradedRecovered,
    total: degradedAttempts.length,
    pct: degradedAttempts.length ? (degradedRecovered / degradedAttempts.length) * 100 : 0,
  },
};

console.log("\n=== SUMMARY ===");
console.log(JSON.stringify(summary, null, 2));

writeFileSync(
  path.join(__dirname, "anchoring-benchmark-results.json"),
  JSON.stringify({ summary, results }, null, 2)
);
console.log("\nFull results written to scripts/anchoring-benchmark-results.json");
