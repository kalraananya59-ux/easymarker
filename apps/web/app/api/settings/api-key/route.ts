import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { db, workspaces, eq } from "@easymarker/db";
import { generateApiKey } from "@easymarker/shared";
import { authOptions } from "@/lib/auth";
import { hashApiKey } from "@/lib/api-key";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user.workspaceId) {
    return NextResponse.json(
      { error: { code: "UNAUTHENTICATED", message: "Sign in required." } },
      { status: 401 }
    );
  }

  const key = generateApiKey();
  const hash = hashApiKey(key);

  await db.update(workspaces).set({ apiKeyHash: hash }).where(eq(workspaces.id, session.user.workspaceId));

  return NextResponse.json({ apiKey: key }, { status: 201 });
}
