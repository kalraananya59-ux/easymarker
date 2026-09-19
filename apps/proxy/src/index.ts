import express, { type Express } from "express";
import rateLimit from "express-rate-limit";
import { isPrivateIp } from "./ssrf-guard.js";
import { renderUrl, rewriteCss, timedFetch, ProxyFetchError } from "./render.js";

const app: Express = express();
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
    res.status(400).json({
      error: { code: "INVALID_URL", message: "A valid https:// URL is required." },
    });
    return;
  }
  if (typeof token !== "string" || token.length < 12) {
    res.status(400).json({
      error: { code: "INVALID_TOKEN", message: "A valid review token is required." },
    });
    return;
  }

  let hostname: string;
  try {
    hostname = new URL(target).hostname;
  } catch {
    res.status(400).json({
      error: { code: "INVALID_URL", message: "Could not parse the target URL." },
    });
    return;
  }

  if (await isPrivateIp(hostname)) {
    res.status(403).json({
      error: { code: "SSRF_BLOCKED", message: "Requests to private IP ranges are not allowed." },
    });
    return;
  }

  const assetBaseUrl = `${req.protocol}://${req.get("host")}/asset`;

  try {
    const { html, contentType } = await renderUrl(target, assetBaseUrl, WEB_APP_ORIGIN);
    res.status(200).set("content-type", contentType).send(html);
  } catch (err) {
    proxyErrorResponse(res, err);
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
    const response = await timedFetch(assetUrl);
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
