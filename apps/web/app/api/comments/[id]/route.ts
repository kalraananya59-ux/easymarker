import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { db, comments, projects, eq, and } from "@easymarker/db";
import { authOptions } from "@/lib/auth";

const VALID_STATUSES = ["open", "in_progress", "resolved"] as const;

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user.workspaceId) {
    return NextResponse.json(
      { error: { code: "UNAUTHENTICATED", message: "Sign in required." } },
      { status: 401 }
    );
  }

  const body = await request.json().catch(() => null);
  const status = body?.status;

  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json(
      { error: { code: "INVALID_STATUS", message: "status must be open, in_progress, or resolved." } },
      { status: 400 }
    );
  }

  const existing = await db.query.comments.findFirst({ where: eq(comments.id, params.id) });
  if (!existing) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Comment not found." } },
      { status: 404 }
    );
  }

  const project = await db.query.projects.findFirst({
    where: and(eq(projects.id, existing.projectId), eq(projects.workspaceId, session.user.workspaceId)),
  });
  if (!project) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Comment not found." } },
      { status: 404 }
    );
  }

  const [comment] = await db
    .update(comments)
    .set({ status, resolvedAt: status === "resolved" ? new Date() : null })
    .where(eq(comments.id, params.id))
    .returning();

  return NextResponse.json({ comment });
}
