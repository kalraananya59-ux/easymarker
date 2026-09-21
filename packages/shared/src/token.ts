import { randomBytes } from "crypto";

export function generateShareToken(): string {
  return randomBytes(16).toString("base64url");
}

export function generateApiKey(): string {
  return "em_" + randomBytes(24).toString("base64url");
}

export function generateVerificationToken(): string {
  return randomBytes(32).toString("base64url");
}

export function slugFromName(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  const suffix = randomBytes(3).toString("hex");
  return (base || "workspace") + "-" + suffix;
}
