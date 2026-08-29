import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { db, workspaces, eq, and, isNull } from "@easymarker/db";
import { authOptions } from "@/lib/auth";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user.workspaceId) {
    return NextResponse.json(
      { error: { code: "UNAUTHENTICATED", message: "Sign in required." } },
      { status: 401 }
    );
  }

  await db
    .update(workspaces)
    .set({ onboardingCopiedLinkAt: new Date() })
    .where(and(eq(workspaces.id, session.user.workspaceId), isNull(workspaces.onboardingCopiedLinkAt)));

  return NextResponse.json({ ok: true });
}
