"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { initializePaddle, type Paddle } from "@paddle/paddle-js";

// Sandbox and production are entirely separate Paddle catalogs/credentials —
// both sets can live in the environment at once, and this one flag picks
// which is active, rather than requiring the production values to be
// overwritten (and re-entered later) every time you want to test.
const IS_SANDBOX = process.env.NEXT_PUBLIC_PADDLE_SANDBOX === "true";

const PRICE_IDS: Record<"pro" | "agency", string | undefined> = IS_SANDBOX
  ? {
      pro: process.env.NEXT_PUBLIC_PADDLE_SANDBOX_PRICE_PRO,
      agency: process.env.NEXT_PUBLIC_PADDLE_SANDBOX_PRICE_AGENCY,
    }
  : {
      pro: process.env.NEXT_PUBLIC_PADDLE_PRICE_PRO,
      agency: process.env.NEXT_PUBLIC_PADDLE_PRICE_AGENCY,
    };

let paddleInstance: Paddle | null = null;

async function getPaddleClient(): Promise<Paddle | undefined> {
  if (paddleInstance) return paddleInstance;
  // Next.js only inlines NEXT_PUBLIC_ vars accessed via a literal
  // `process.env.NAME` at build time — a dynamic `process.env[name]` lookup
  // is never replaced and would just be `undefined` in the browser bundle,
  // so both branches must spell the access out explicitly.
  const token = IS_SANDBOX
    ? process.env.NEXT_PUBLIC_PADDLE_SANDBOX_CLIENT_TOKEN
    : process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;
  if (!token) {
    throw new Error(
      `${IS_SANDBOX ? "NEXT_PUBLIC_PADDLE_SANDBOX_CLIENT_TOKEN" : "NEXT_PUBLIC_PADDLE_CLIENT_TOKEN"} is not configured`
    );
  }

  const paddle = await initializePaddle({
    token,
    environment: IS_SANDBOX ? "sandbox" : "production",
    eventCallback(event) {
      if (event.name === "checkout.completed") {
        // The overlay closes itself; a full reload picks up the new plan
        // once the webhook has had a moment to sync it.
        window.location.href = "/dashboard/settings?upgraded=1";
      }
    },
  });
  paddleInstance = paddle ?? null;
  return paddle;
}

export function UpgradeButton({ plan, label }: { plan: "pro" | "agency"; label: string }) {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startCheckout() {
    const priceId = PRICE_IDS[plan];
    if (!priceId) {
      setError("Billing isn't configured yet for this plan.");
      return;
    }
    if (!session?.user.email) {
      setError("Sign in again to upgrade.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const paddle = await getPaddleClient();
      paddle?.Checkout.open({
        items: [{ priceId, quantity: 1 }],
        customer: { email: session.user.email },
        customData: { workspaceId: session.user.workspaceId ?? "" },
      });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button type="button" className="btn btnPrimary btnSm" onClick={startCheckout} disabled={loading}>
        {loading ? "Loading…" : label}
      </button>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
