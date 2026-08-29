export type Plan = "free" | "pro" | "agency";
export type ProjectType = "url" | "image" | "pdf" | "design";
export type ProjectStatus = "active" | "archived";
export type CommentStatus = "open" | "in_progress" | "resolved";

export interface AnchorPayload {
  strategy: "dom" | "percentage";

  // strategy: "dom" (URL projects) — see docs/anchoring-algorithm.md
  selector?: string;
  offsetXPct?: number;
  offsetYPct?: number;
  textQuote?: string;
  fallbackXPct?: number;
  fallbackYPct?: number;

  // strategy: "percentage" (image/PDF projects)
  xPct?: number;
  yPct?: number;
  page?: number;

  confidence: number;
}

export interface ApiError {
  error: { code: string; message: string; };
}

export { isPrivateHostname } from "./ssrf";
export { generateShareToken, generateApiKey, generateVerificationToken } from "./token";
export { checkUrlSubmission } from "./url-ingestion";
export type { UrlSubmissionResult } from "./url-ingestion";
