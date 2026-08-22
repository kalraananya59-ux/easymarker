import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { db, projects, eq, and } from "@easymarker/db";
import { generateShareToken } from "@easymarker/shared";
import { authOptions } from "@/lib/auth";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user.workspaceId) {
    return NextResponse.json(
      { error: { code: "UNAUTHENTICATED", message: "Sign in required." } },
      { status: 401 }
    );
  }

  const body = await request.json().catch(() => null);
  const action = body?.action;

  if (action !== "archive" && action !== "regenerate") {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_ACTION",
          message: "action must be 'archive' or 'regenerate'.",
        },
      },
      { status: 400 }
    );
  }

  const existing = await db.query.projects.findFirst({
    where: and(eq(projects.id, params.id), eq(projects.workspaceId, session.user.workspaceId)),
  });
  if (!existing) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Project not found." } },
      { status: 404 }
    );
  }

  const updates = action === "archive" ? { status: "archived" as const } : { shareToken: generateShareToken() };

  const [project] = await db
    .update(projects)
    .set(updates)
    .where(eq(projects.id, params.id))
    .returning();

  return NextResponse.json({ project });
}
