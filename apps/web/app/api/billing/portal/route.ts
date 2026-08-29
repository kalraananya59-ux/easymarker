import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { db, workspaces, subscriptions, eq, desc } from "@easymarker/db";
import { authOptions } from "@/lib/auth";
import { getPaddle } from "@/lib/paddle";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user.workspaceId) {
    return NextResponse.json(
      { error: { code: "UNAUTHENTICATED", message: "Sign in required." } },
      { status: 401 }
    );
  }

  const workspace = await db.query.workspaces.findFirst({ where: eq(workspaces.id, session.user.workspaceId) });
  if (!workspace?.paddleCustomerId) {
    return NextResponse.json(
      { error: { code: "NO_SUBSCRIPTION", message: "You don't have a billing account yet — upgrade first." } },
      { status: 400 }
    );
  }

  const subscription = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.workspaceId, workspace.id),
    orderBy: desc(subscriptions.createdAt),
  });
  if (!subscription) {
    return NextResponse.json(
      { error: { code: "NO_SUBSCRIPTION", message: "You don't have a billing account yet — upgrade first." } },
      { status: 400 }
    );
  }

  try {
    const portalSession = await getPaddle().customerPortalSessions.create(workspace.paddleCustomerId, [
      subscription.paddleSubscriptionId,
    ]);
    return NextResponse.json({ url: portalSession.urls.general.overview });
  } catch (err) {
    console.error("billing portal: Paddle API call failed", err);
    return NextResponse.json(
      { error: { code: "PORTAL_FAILED", message: "Couldn't open the billing portal. Try again." } },
      { status: 502 }
    );
  }
}
