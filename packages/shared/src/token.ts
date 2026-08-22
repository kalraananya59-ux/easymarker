import { randomBytes } from "crypto";

export function generateShareToken(): string {
  return randomBytes(16).toString("base64url");
}

export function generateApiKey(): string {
  return "em_" + randomBytes(24).toString("base64url");
}
