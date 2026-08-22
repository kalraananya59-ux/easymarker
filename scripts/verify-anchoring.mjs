// Smoke test for §8.5 anchoring on URL projects: signs in, creates a project,
// places a pin inside the proxied iframe, submits a comment, reloads, and
// checks the pin re-resolves. Requires `pnpm dev` running against a seeded
// user (maya@example.com / correcthorsebattery — see scripts/seed.ts).
import { chromium } from "@playwright/test";

const BASE = "http://localhost:3000";

const browser = await chromium.launch();
const context = await browser.newContext();
const page = await context.newPage();

let failed = false;
function check(label, condition) {
  console.log(`${condition ? "PASS" : "FAIL"}: ${label}`);
  if (!condition) failed = true;
}

try {
  await page.goto(`${BASE}/signin`);
  await page.fill('input[type="email"]', "maya@example.com");
  await page.fill('input[type="password"]', "correcthorsebattery");
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE}/dashboard`, { timeout: 15000 });

  await page.fill('input[type="url"]', "https://example.com");
  await page.click('button:has-text("Create project")');
  await page.waitForTimeout(1500);

  const links = await page.locator("code").allTextContents();
  const shareLink = links.find((l) => l.includes("/r/"));
  if (!shareLink) throw new Error("No share link found after creating project");
  const token = shareLink.split("/r/")[1];

  const reviewPage = await context.newPage();
  await reviewPage.goto(`${BASE}/r/${token}`);
  await reviewPage.waitForTimeout(1500);

  const iframeEl = await reviewPage.waitForSelector("iframe", { timeout: 10000 });
  const box = await iframeEl.boundingBox();
  const clickX = box.x + box.width * 0.3;
  const clickY = box.y + box.height * 0.3;

  await reviewPage.mouse.click(clickX, clickY);
  await reviewPage.waitForTimeout(800);
  const textarea = await reviewPage.$("textarea");
  check("compose box appears after clicking the proxied page", !!textarea);

  await textarea.fill("Playwright smoke-test comment.");
  await reviewPage.locator('button:has-text("Comment")').first().click();
  await reviewPage.waitForTimeout(1200);

  const sidebarText = await reviewPage.textContent("aside");
  check("comment appears in the sidebar after submit", sidebarText?.includes("Playwright smoke-test") ?? false);

  await reviewPage.reload();
  await reviewPage.waitForTimeout(2000);

  const pinButtons = await reviewPage.$$('button[aria-label^="Comment by"]');
  check("pin re-renders after reload", pinButtons.length === 1);
} catch (err) {
  console.error("SCRIPT ERROR:", err);
  failed = true;
} finally {
  await browser.close();
}

process.exit(failed ? 1 : 0);
