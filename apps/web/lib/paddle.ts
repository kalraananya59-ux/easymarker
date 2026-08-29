import { Paddle, Environment } from "@paddle/paddle-node-sdk";
import type { Plan } from "@easymarker/shared";

let client: Paddle | null = null;
let clientIsSandbox: boolean | null = null;

export function isSandboxMode(): boolean {
  return process.env["PADDLE_SANDBOX"] === "true";
}

export function getPaddle(): Paddle {
  const sandbox = isSandboxMode();

  // Rebuild the client if the mode changed since it was last constructed —
  // relevant mainly in dev, where env vars can change between requests
  // without a full process restart in some setups.
  if (client && clientIsSandbox !== sandbox) {
    client = null;
  }

  const apiKeyVar = sandbox ? "PADDLE_SANDBOX_API_KEY" : "PADDLE_API_KEY";
  const apiKey = process.env[apiKeyVar];
  if (!apiKey) {
    throw new Error(`${apiKeyVar} environment variable is required`);
  }

  client ??= new Paddle(apiKey, { environment: sandbox ? Environment.sandbox : Environment.production });
  clientIsSandbox = sandbox;
  return client;
}

export function getWebhookSecret(): string | undefined {
  return process.env[isSandboxMode() ? "PADDLE_SANDBOX_WEBHOOK_SECRET" : "PADDLE_WEBHOOK_SECRET"];
}

// Price IDs are exposed as NEXT_PUBLIC_ vars (not secrets — Paddle price IDs
// are opaque identifiers, same trust level as Stripe's) so the client-driven
// checkout overlay can read them directly without a server round-trip.
// Sandbox and production are entirely separate Paddle catalogs, so each has
// its own pair of price ID vars rather than one shared pair.
export function getPlanForPriceId(priceId: string): Plan | null {
  const sandbox = isSandboxMode();
  const proVar = sandbox ? "NEXT_PUBLIC_PADDLE_SANDBOX_PRICE_PRO" : "NEXT_PUBLIC_PADDLE_PRICE_PRO";
  const agencyVar = sandbox ? "NEXT_PUBLIC_PADDLE_SANDBOX_PRICE_AGENCY" : "NEXT_PUBLIC_PADDLE_PRICE_AGENCY";

  if (priceId === process.env[proVar]) return "pro";
  if (priceId === process.env[agencyVar]) return "agency";
  return null;
}
