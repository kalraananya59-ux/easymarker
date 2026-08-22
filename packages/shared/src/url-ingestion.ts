import { isPrivateHostname } from "./ssrf";

export type UrlSubmissionResult =
  | { ok: true; url: string }
  | { ok: false; code: "INVALID_URL" | "UNREACHABLE"; message: string };

const MAX_REDIRECTS = 3;
const REACHABILITY_TIMEOUT_MS = 10_000;

function parseHttpsUrl(raw: string): URL | null {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:") return null;
  if (!parsed.hostname) return null;
  return parsed;
}

export async function checkUrlSubmission(raw: string): Promise<UrlSubmissionResult> {
  const parsed = parseHttpsUrl(raw);
  if (!parsed) {
    return {
      ok: false,
      code: "INVALID_URL",
      message: "Please enter a valid https:// URL.",
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REACHABILITY_TIMEOUT_MS);

  try {
    let current = parsed;

    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      if (await isPrivateHostname(current.hostname)) {
        return {
          ok: false,
          code: "INVALID_URL",
          message: "That URL points to a private or local address, which isn't allowed.",
        };
      }

      let response: Response;
      try {
        response = await fetch(current, {
          method: "HEAD",
          redirect: "manual",
          signal: controller.signal,
        });
      } catch {
        return {
          ok: false,
          code: "UNREACHABLE",
          message: "We couldn't reach that URL. Check that it's public and try again.",
        };
      }

      const isRedirect = response.status >= 300 && response.status < 400;
      if (!isRedirect) {
        if (response.status >= 200 && response.status < 500) {
          return { ok: true, url: current.toString() };
        }
        return {
          ok: false,
          code: "UNREACHABLE",
          message: "We couldn't reach that URL. Check that it's public and try again.",
        };
      }

      const location = response.headers.get("location");
      if (!location) {
        return {
          ok: false,
          code: "UNREACHABLE",
          message: "We couldn't reach that URL. Check that it's public and try again.",
        };
      }

      let next: URL;
      try {
        next = new URL(location, current);
      } catch {
        return {
          ok: false,
          code: "UNREACHABLE",
          message: "We couldn't reach that URL. Check that it's public and try again.",
        };
      }
      if (next.protocol !== "https:") {
        return {
          ok: false,
          code: "UNREACHABLE",
          message: "We couldn't reach that URL. Check that it's public and try again.",
        };
      }
      current = next;
    }

    return {
      ok: false,
      code: "UNREACHABLE",
      message: "That URL redirects too many times. Check the link and try again.",
    };
  } finally {
    clearTimeout(timeout);
  }
}
