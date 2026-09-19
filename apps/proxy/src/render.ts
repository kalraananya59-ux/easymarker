import * as cheerio from "cheerio";
import { isPrivateHostname } from "@easymarker/shared";
import { getAnchoringBundle } from "./anchoring-bundle.js";

const MAX_REDIRECTS = 3;
const FETCH_TIMEOUT_MS = 10_000;

export class ProxyFetchError extends Error {
  constructor(
    public code: "SSRF_BLOCKED" | "TOO_MANY_REDIRECTS" | "TIMEOUT" | "FETCH_FAILED" | "BAD_URL",
    message: string
  ) {
    super(message);
  }
}

async function safeFetch(target: URL, init: RequestInit): Promise<Response> {
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

async function timedFetch(target: URL, init: RequestInit = {}): Promise<Response> {
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

const REWRITABLE_ATTRS: Array<{ selector: string; attr: string }> = [
  { selector: "img[src]", attr: "src" },
  { selector: "script[src]", attr: "src" },
  { selector: "link[href]", attr: "href" },
  { selector: "source[src]", attr: "src" },
  { selector: "source[srcset]", attr: "srcset" },
  { selector: "img[srcset]", attr: "srcset" },
];

function assetProxyUrl(assetBaseUrl: string, absoluteUrl: string): string {
  return `${assetBaseUrl}?url=${encodeURIComponent(absoluteUrl)}`;
}

function rewriteSrcset(value: string, base: URL, assetBaseUrl: string): string {
  return value
    .split(",")
    .map((part) => {
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
    })
    .join(", ");
}

export function rewriteHtml(
  html: string,
  pageUrl: URL,
  assetBaseUrl: string,
  anchoring?: { bundle: string; parentOrigin: string }
): string {
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
        // leave malformed URLs untouched
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
    const escapeForInlineScript = (s: string) => s.replace(/<\/script/gi, "<\\/script");
    const originScript = `window.__EASYMARKER_PARENT_ORIGIN__=${JSON.stringify(anchoring.parentOrigin)};`;
    $("body").append(`<script>${escapeForInlineScript(originScript)}</script>`);
    $("body").append(`<script>${escapeForInlineScript(anchoring.bundle)}</script>`);
  }

  return $.html();
}

const CSS_URL_RE = /url\(\s*(['"]?)([^'")]+)\1\s*\)/gi;

export function rewriteCss(css: string, baseUrl: URL, assetBaseUrl: string): string {
  return css.replace(CSS_URL_RE, (full, quote: string, rawUrl: string) => {
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

export interface RenderResult {
  html: string;
  contentType: string;
}

export async function renderUrl(
  targetUrl: string,
  assetBaseUrl: string,
  parentOrigin?: string
): Promise<RenderResult> {
  const pageUrl = new URL(targetUrl);
  const response = await timedFetch(pageUrl, {
    headers: { "user-agent": "EasymarkerProxy/1.0 (+https://easymarker.io)" },
  });

  if (!response.ok) {
    throw new ProxyFetchError("FETCH_FAILED", `Target responded with status ${response.status}.`);
  }

  const contentType = response.headers.get("content-type") ?? "text/html";
  const finalUrl = new URL(response.url || targetUrl);

  if (contentType.includes("text/html")) {
    const html = await response.text();
    const anchoring = parentOrigin ? { bundle: await getAnchoringBundle(), parentOrigin } : undefined;
    return {
      html: rewriteHtml(html, finalUrl, assetBaseUrl, anchoring),
      contentType: "text/html; charset=utf-8",
    };
  }

  const text = await response.text();
  return { html: text, contentType };
}

export { timedFetch };
