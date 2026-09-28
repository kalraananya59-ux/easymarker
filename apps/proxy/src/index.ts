import express, { type Express } from "express";
import rateLimit from "express-rate-limit";
import { isPrivateIp } from "./ssrf-guard.js";
import { renderUrl, rewriteCss, timedFetch, ProxyFetchError, BROWSER_HEADERS } from "./render.js";

const app: Express = express();
// Vercel's edge terminates TLS and forwards to this function over plain
// HTTP internally, setting X-Forwarded-Proto to say the original request
// was https. Express doesn't trust that header by default, so req.protocol
// was reporting "http" for every request here — every asset URL we build
// from it (scripts, stylesheets, fonts) came out as http://, which browsers
// block as mixed content on an https:// page. This is what actually broke
// every site's JS/CSS through the proxy, not a per-site compatibility
// issue. Harmless for the Fly/Docker/local paths, which aren't behind a
// proxy that rewrites this header.
app.set("trust proxy", true);
const PORT = process.env["PROXY_PORT"] ?? 4000;
const WEB_APP_ORIGIN = process.env["WEB_APP_ORIGIN"] ?? "http://localhost:3000";

const FORBIDDEN_RESPONSE_HEADERS = new Set([
  "set-cookie",
  "authorization",
  "strict-transport-security",
  "x-frame-options",
  "content-security-policy",
  "content-encoding",
  "content-length",
  "transfer-encoding",
]);

function proxyErrorResponse(res: express.Response, err: unknown): void {
  if (err instanceof ProxyFetchError) {
    const status = err.code === "SSRF_BLOCKED" ? 403 : err.code === "TIMEOUT" ? 504 : 502;
    res.status(status).json({ error: { code: err.code, message: err.message } });
    return;
  }
  res.status(502).json({
    error: { code: "FETCH_FAILED", message: "Could not reach the target site." },
  });
}

// /render's response is always loaded as an iframe's page content, not
// fetched programmatically — a raw JSON error body there just shows up as
// literal `{"error":...}` text to whoever opened the review link, which
// reads as broken rather than as an explained limitation. This renders a
// plain, on-brand HTML page instead, with a real link to the target site
// so someone isn't left with no way to see the page at all.
function renderErrorPage(message: string, targetUrl?: string): string {
  const linkHtml = targetUrl
    ? `<a href="${targetUrl.replace(/"/g, "&quot;")}" target="_blank" rel="noopener noreferrer">Open the site directly instead →</a>`
    : "";
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  body { margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center; background:#0a0e17; color:#f1f5f9; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; padding:24px; box-sizing:border-box; }
  .box { max-width:420px; text-align:center; }
  h1 { font-size:16px; font-weight:600; margin:0 0 8px; }
  p { font-size:14px; line-height:1.6; color:#97a3b8; margin:0 0 16px; }
  a { color:#6d5ef8; font-size:13px; font-weight:600; text-decoration:none; }
  a:hover { text-decoration:underline; }
</style></head>
<body><div class="box">
  <h1>This page couldn't be loaded for review</h1>
  <p>${message}</p>
  ${linkHtml}
</div></body></html>`;
}

function sendRenderError(res: express.Response, status: number, message: string, targetUrl?: string): void {
  res.status(status).set("content-type", "text/html; charset=utf-8").send(renderErrorPage(message, targetUrl));
}

const renderLimiter = rateLimit({
  windowMs: 60_000,
  max: 100,
  keyGenerator: (req) => String(req.query["token"] ?? req.ip),
  standardHeaders: true,
  legacyHeaders: false,
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/render", renderLimiter, async (req, res) => {
  const target = req.query["url"];
  const token = req.query["token"];

  if (typeof target !== "string" || !target.startsWith("https://")) {
    sendRenderError(res, 400, "The link for this review project looks malformed.");
    return;
  }
  if (typeof token !== "string" || token.length < 12) {
    sendRenderError(res, 400, "This review link is missing or invalid.");
    return;
  }

  let hostname: string;
  try {
    hostname = new URL(target).hostname;
  } catch {
    sendRenderError(res, 400, "The target URL for this review project couldn't be parsed.");
    return;
  }

  if (await isPrivateIp(hostname)) {
    sendRenderError(res, 403, "This URL points to a private network address, which isn't allowed.");
    return;
  }

  const assetBaseUrl = `${req.protocol}://${req.get("host")}/asset`;

  try {
    const { html, contentType } = await renderUrl(target, assetBaseUrl, WEB_APP_ORIGIN);
    res.status(200).set("content-type", contentType).send(html);
  } catch (err) {
    if (err instanceof ProxyFetchError && err.code === "TIMEOUT") {
      sendRenderError(res, 504, "The site took too long to respond.", target);
      return;
    }
    // The most common real cause here: the target site's own bot/WAF
    // protection (Cloudflare, Akamai, etc.) is blocking this request —
    // not something fixable by retrying or changing headers, since some
    // of these require solving an interactive JS challenge a plain fetch
    // can never pass.
    sendRenderError(
      res,
      502,
      "This site couldn't be loaded, likely because it blocks automated visitors like this one.",
      target
    );
  }
});

app.get("/asset", async (req, res) => {
  const target = req.query["url"];

  if (typeof target !== "string" || !target.startsWith("https://")) {
    res.status(400).json({
      error: { code: "INVALID_URL", message: "A valid https:// URL is required." },
    });
    return;
  }

  let assetUrl: URL;
  try {
    assetUrl = new URL(target);
  } catch {
    res.status(400).json({
      error: { code: "INVALID_URL", message: "Could not parse the asset URL." },
    });
    return;
  }

  if (await isPrivateIp(assetUrl.hostname)) {
    res.status(403).json({
      error: { code: "SSRF_BLOCKED", message: "Requests to private IP ranges are not allowed." },
    });
    return;
  }

  try {
    const response = await timedFetch(assetUrl, { headers: BROWSER_HEADERS });
    if (!response.ok || !response.body) {
      res.status(502).json({
        error: { code: "FETCH_FAILED", message: `Asset responded with status ${response.status}.` },
      });
      return;
    }

    const contentType = response.headers.get("content-type") ?? "application/octet-stream";
    res.status(200).set("content-type", contentType);

    response.headers.forEach((value, key) => {
      if (!FORBIDDEN_RESPONSE_HEADERS.has(key.toLowerCase()) && key.toLowerCase() !== "content-type") {
        res.set(key, value);
      }
    });

    if (contentType.includes("text/css")) {
      const assetBaseUrl = `${req.protocol}://${req.get("host")}/asset`;
      const css = await response.text();
      res.send(rewriteCss(css, assetUrl, assetBaseUrl));
      return;
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    res.send(buffer);
  } catch (err) {
    proxyErrorResponse(res, err);
  }
});

// Vercel's Node builder imports this module and calls the exported handler
// per-request instead of running a persistent server — app.listen() would
// just hang trying to bind a port that never receives traffic there, so it's
// skipped whenever the VERCEL env var is present (set automatically by
// Vercel's build/runtime, never set locally or in the Fly/Docker path).
if (!process.env["VERCEL"]) {
  app.listen(PORT, () => {
    console.log("Proxy running on port " + PORT);
  });
}

export default app;
