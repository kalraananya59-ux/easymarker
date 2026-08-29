import { NextResponse } from "next/server";
import { EventName, type SubscriptionNotification } from "@paddle/paddle-node-sdk";
import { db, workspaces, subscriptions, eq } from "@easymarker/db";
import { getPaddle, getPlanForPriceId, getWebhookSecret } from "@/lib/paddle";

async function syncSubscription(sub: SubscriptionNotification) {
  const customData = sub.customData as { workspaceId?: string } | null;
  const workspaceId = customData?.workspaceId;

  const workspace = workspaceId
    ? await db.query.workspaces.findFirst({ where: eq(workspaces.id, workspaceId) })
    : await db.query.workspaces.findFirst({ where: eq(workspaces.paddleCustomerId, sub.customerId) });

  if (!workspace) {
    console.error(`Paddle webhook: no workspace found for subscription ${sub.id}`);
    return;
  }

  if (!workspace.paddleCustomerId) {
    await db.update(workspaces).set({ paddleCustomerId: sub.customerId }).where(eq(workspaces.id, workspace.id));
  }

  const priceId = sub.items[0]?.price?.id;
  const plan = priceId ? getPlanForPriceId(priceId) : null;
  if (!plan) {
    console.error(`Paddle webhook: subscription ${sub.id} price ${priceId} doesn't map to a known plan`);
    return;
  }

  const currentPeriodEnd = sub.currentBillingPeriod ? new Date(sub.currentBillingPeriod.endsAt) : new Date();

  await db
    .insert(subscriptions)
    .values({
      workspaceId: workspace.id,
      paddleSubscriptionId: sub.id,
      status: sub.status,
      plan,
      currentPeriodEnd,
    })
    .onConflictDoUpdate({
      target: subscriptions.paddleSubscriptionId,
      set: { status: sub.status, plan, currentPeriodEnd, updatedAt: new Date() },
    });

  // A past-due subscription still holds its paid plan — Paddle's own dunning
  // emails handle retries, and the PRD calls for a grace period rather than
  // immediate revocation. Only an active/trialing subscription promotes the
  // workspace; the actual downgrade happens on subscription.canceled.
  if (sub.status === "active" || sub.status === "trialing") {
    await db.update(workspaces).set({ plan }).where(eq(workspaces.id, workspace.id));
  }
}

async function handleSubscriptionCanceled(sub: SubscriptionNotification) {
  const existing = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.paddleSubscriptionId, sub.id),
  });
  const customData = sub.customData as { workspaceId?: string } | null;
  const workspaceId = existing?.workspaceId ?? customData?.workspaceId;
  if (!workspaceId) {
    console.error(`Paddle webhook: no workspace found for canceled subscription ${sub.id}`);
    return;
  }

  await db
    .update(subscriptions)
    .set({ status: "canceled", updatedAt: new Date() })
    .where(eq(subscriptions.paddleSubscriptionId, sub.id));

  await db.update(workspaces).set({ plan: "free" }).where(eq(workspaces.id, workspaceId));
}

export async function POST(request: Request) {
  const signature = request.headers.get("paddle-signature");
  const webhookSecret = getWebhookSecret();
  if (!signature || !webhookSecret) {
    return NextResponse.json(
      { error: { code: "WEBHOOK_NOT_CONFIGURED", message: "Webhook signature verification is not configured." } },
      { status: 503 }
    );
  }

  const rawBody = await request.text();

  let event;
  try {
    event = await getPaddle().webhooks.unmarshal(rawBody, webhookSecret, signature);
  } catch (err) {
    return NextResponse.json(
      { error: { code: "INVALID_SIGNATURE", message: (err as Error).message } },
      { status: 400 }
    );
  }

  switch (event.eventType) {
    case EventName.SubscriptionCreated:
    case EventName.SubscriptionUpdated:
      await syncSubscription(event.data);
      break;
    case EventName.SubscriptionCanceled:
      await handleSubscriptionCanceled(event.data);
      break;
    case EventName.TransactionPaymentFailed:
      // Intentional no-op: Paddle sends its own dunning emails and retries
      // the charge per its standard schedule. We don't revoke access
      // immediately — the workspace only drops to Free once Paddle actually
      // cancels the subscription (subscription.canceled) after retries end.
      break;
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
