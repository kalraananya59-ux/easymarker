// src/index.ts
import express from "express";
import rateLimit from "express-rate-limit";

// ../../packages/shared/src/ssrf.ts
import { promises as dns } from "dns";
import { isIP } from "net";
var PRIVATE_RANGES = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./,
  /^0\./,
  /^::1$/,
  /^fc00:/i,
  /^fd[0-9a-f]{2}:/i,
  /^fe80:/i
];
function isPrivateIpLiteral(ip) {
  return PRIVATE_RANGES.some((re) => re.test(ip));
}
async function isPrivateHostname(hostname) {
  const normalized = hostname.toLowerCase();
  if (normalized === "localhost") return true;
  if (isIP(hostname)) return isPrivateIpLiteral(hostname);
  try {
    const results = await dns.lookup(hostname, { all: true, verbatim: true });
    return results.length === 0 || results.some((r) => isPrivateIpLiteral(r.address));
  } catch {
    return true;
  }
}

// src/render.ts
import * as cheerio from "cheerio";

// src/anchoring-bundle.ts
import { build } from "esbuild";
import { fileURLToPath } from "url";
import path from "path";
var __dirname = path.dirname(fileURLToPath(import.meta.url));
var entryPoint = path.resolve(
  __dirname,
  "..",
  "..",
  "..",
  "packages",
  "anchoring",
  "src",
  "browser-entry.ts"
);
var cachedBundle = null;
function getAnchoringBundle() {
  if (!cachedBundle) {
    cachedBundle = build({
      entryPoints: [entryPoint],
      bundle: true,
      format: "iife",
      target: "es2020",
      write: false,
      minify: true,
      logLevel: "silent"
    }).then((result) => {
      const output = result.outputFiles[0];
      if (!output) throw new Error("esbuild produced no output for the anchoring bundle");
      return output.text;
    });
  }
  return cachedBundle;
}

// src/render.ts
var MAX_REDIRECTS = 3;
var FETCH_TIMEOUT_MS = 1e4;
var ProxyFetchError = class extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
};
async function safeFetch(target, init) {
  let current = target;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    if (current.protocol !== "https:") {
      throw new ProxyFetchError("BAD_URL", "Only https:// URLs are supported.");
    }
    if (await isPrivateHostname(current.hostname)) {
      throw new ProxyFetchError("SSRF_BLOCKED", "Requests to private IP ranges are not allowed.");
    }
    const response = await fetch(current, { ...init, redirect: "manual" });
    const isRedirect = response.status >= 300 && response.status < 400;
    if (!isRedirect) return response;
    const location = response.headers.get("location");
    if (!location) return response;
    current = new URL(location, current);
    if (hop === MAX_REDIRECTS) {
      throw new ProxyFetchError("TOO_MANY_REDIRECTS", "That URL redirects too many times.");
    }
  }
  throw new ProxyFetchError("TOO_MANY_REDIRECTS", "That URL redirects too many times.");
}
async function timedFetch(target, init = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await safeFetch(target, { ...init, signal: controller.signal });
  } catch (err) {
    if (err instanceof ProxyFetchError) throw err;
    if (err instanceof Error && err.name === "AbortError") {
      throw new ProxyFetchError("TIMEOUT", "The target site took too long to respond.");
    }
    throw new ProxyFetchError("FETCH_FAILED", "Could not reach the target site.");
  } finally {
    clearTimeout(timeout);
  }
}
var REWRITABLE_ATTRS = [
  { selector: "img[src]", attr: "src" },
  { selector: "script[src]", attr: "src" },
  { selector: "link[href]", attr: "href" },
  { selector: "source[src]", attr: "src" },
  { selector: "source[srcset]", attr: "srcset" },
  { selector: "img[srcset]", attr: "srcset" }
];
function assetProxyUrl(assetBaseUrl, absoluteUrl) {
  return `${assetBaseUrl}?url=${encodeURIComponent(absoluteUrl)}`;
}
function rewriteSrcset(value, base, assetBaseUrl) {
  return value.split(",").map((part) => {
    const trimmed = part.trim();
    const [url, descriptor] = trimmed.split(/\s+/, 2);
    if (!url) return trimmed;
    try {
      const absolute = new URL(url, base).toString();
      const rewritten = assetProxyUrl(assetBaseUrl, absolute);
      return descriptor ? `${rewritten} ${descriptor}` : rewritten;
    } catch {
      return trimmed;
    }
  }).join(", ");
}
function rewriteHtml(html, pageUrl, assetBaseUrl, anchoring) {
  const $ = cheerio.load(html, { scriptingEnabled: false });
  for (const { selector, attr } of REWRITABLE_ATTRS) {
    $(selector).each((_i, el) => {
      const value = $(el).attr(attr);
      if (!value) return;
      if (attr === "srcset") {
        $(el).attr(attr, rewriteSrcset(value, pageUrl, assetBaseUrl));
        return;
      }
      if (value.startsWith("data:") || value.startsWith("blob:")) return;
      try {
        const absolute = new URL(value, pageUrl).toString();
        $(el).attr(attr, assetProxyUrl(assetBaseUrl, absolute));
      } catch {
      }
    });
  }
  $("style").each((_i, el) => {
    const css = $(el).html();
    if (css) $(el).html(rewriteCss(css, pageUrl, assetBaseUrl));
  });
  $("[style]").each((_i, el) => {
    const style = $(el).attr("style");
    if (style) $(el).attr("style", rewriteCss(style, pageUrl, assetBaseUrl));
  });
  $("meta[http-equiv='Content-Security-Policy']").remove();
  $("base").remove();
  if (anchoring) {
    const escapeForInlineScript = (s) => s.replace(/<\/script/gi, "<\\/script");
    const originScript = `window.__EASYMARKER_PARENT_ORIGIN__=${JSON.stringify(anchoring.parentOrigin)};`;
    $("body").append(`<script>${escapeForInlineScript(originScript)}</script>`);
    $("body").append(`<script>${escapeForInlineScript(anchoring.bundle)}</script>`);
  }
  return $.html();
}
var CSS_URL_RE = /url\(\s*(['"]?)([^'")]+)\1\s*\)/gi;
function rewriteCss(css, baseUrl, assetBaseUrl) {
  return css.replace(CSS_URL_RE, (full, quote, rawUrl) => {
    const trimmed = rawUrl.trim();
    if (trimmed.startsWith("data:") || trimmed.startsWith("blob:")) return full;
    try {
      const absolute = new URL(trimmed, baseUrl).toString();
      return `url(${quote}${assetProxyUrl(assetBaseUrl, absolute)}${quote})`;
    } catch {
      return full;
    }
  });
}
async function renderUrl(targetUrl, assetBaseUrl, parentOrigin) {
  const pageUrl = new URL(targetUrl);
  const response = await timedFetch(pageUrl, {
    headers: { "user-agent": "EasymarkerProxy/1.0 (+https://easymarker.io)" }
  });
  if (!response.ok) {
    throw new ProxyFetchError("FETCH_FAILED", `Target responded with status ${response.status}.`);
  }
  const contentType = response.headers.get("content-type") ?? "text/html";
  const finalUrl = new URL(response.url || targetUrl);
  if (contentType.includes("text/html")) {
    const html = await response.text();
    const anchoring = parentOrigin ? { bundle: await getAnchoringBundle(), parentOrigin } : void 0;
    return {
      html: rewriteHtml(html, finalUrl, assetBaseUrl, anchoring),
      contentType: "text/html; charset=utf-8"
    };
  }
  const text = await response.text();
  return { html: text, contentType };
}

// src/index.ts
var app = express();
var PORT = process.env["PROXY_PORT"] ?? 4e3;
var WEB_APP_ORIGIN = process.env["WEB_APP_ORIGIN"] ?? "http://localhost:3000";
var FORBIDDEN_RESPONSE_HEADERS = /* @__PURE__ */ new Set([
  "set-cookie",
  "authorization",
  "strict-transport-security",
  "x-frame-options",
  "content-security-policy",
  "content-encoding",
  "content-length",
  "transfer-encoding"
]);
function proxyErrorResponse(res, err) {
  if (err instanceof ProxyFetchError) {
    const status = err.code === "SSRF_BLOCKED" ? 403 : err.code === "TIMEOUT" ? 504 : 502;
    res.status(status).json({ error: { code: err.code, message: err.message } });
    return;
  }
  res.status(502).json({
    error: { code: "FETCH_FAILED", message: "Could not reach the target site." }
  });
}
var renderLimiter = rateLimit({
  windowMs: 6e4,
  max: 100,
  keyGenerator: (req) => String(req.query["token"] ?? req.ip),
  standardHeaders: true,
  legacyHeaders: false
});
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});
app.get("/render", renderLimiter, async (req, res) => {
  const target = req.query["url"];
  const token = req.query["token"];
  if (typeof target !== "string" || !target.startsWith("https://")) {
    res.status(400).json({
      error: { code: "INVALID_URL", message: "A valid https:// URL is required." }
    });
    return;
  }
  if (typeof token !== "string" || token.length < 12) {
    res.status(400).json({
      error: { code: "INVALID_TOKEN", message: "A valid review token is required." }
    });
    return;
  }
  let hostname;
  try {
    hostname = new URL(target).hostname;
  } catch {
    res.status(400).json({
      error: { code: "INVALID_URL", message: "Could not parse the target URL." }
    });
    return;
  }
  if (await isPrivateHostname(hostname)) {
    res.status(403).json({
      error: { code: "SSRF_BLOCKED", message: "Requests to private IP ranges are not allowed." }
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
      error: { code: "INVALID_URL", message: "A valid https:// URL is required." }
    });
    return;
  }
  let assetUrl;
  try {
    assetUrl = new URL(target);
  } catch {
    res.status(400).json({
      error: { code: "INVALID_URL", message: "Could not parse the asset URL." }
    });
    return;
  }
  if (await isPrivateHostname(assetUrl.hostname)) {
    res.status(403).json({
      error: { code: "SSRF_BLOCKED", message: "Requests to private IP ranges are not allowed." }
    });
    return;
  }
  try {
    const response = await timedFetch(assetUrl);
    if (!response.ok || !response.body) {
      res.status(502).json({
        error: { code: "FETCH_FAILED", message: `Asset responded with status ${response.status}.` }
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
if (!process.env["VERCEL"]) {
  app.listen(PORT, () => {
    console.log("Proxy running on port " + PORT);
  });
}
var index_default = app;
export {
  index_default as default
};
