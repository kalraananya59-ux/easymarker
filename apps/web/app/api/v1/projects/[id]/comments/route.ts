import { NextResponse } from "next/server";
import { db, comments, projects, eq, and } from "@easymarker/db";
import { getWorkspaceFromApiKey } from "@/lib/api-key";
import { checkRateLimit } from "@/lib/rate-limit";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const workspace = await getWorkspaceFromApiKey(request);
  if (!workspace) {
    return NextResponse.json(
      { error: { code: "UNAUTHENTICATED", message: "A valid API key is required." } },
      { status: 401 }
    );
  }
  if (!checkRateLimit(workspace.id, 60, 60_000)) {
    return NextResponse.json(
      { error: { code: "RATE_LIMITED", message: "Too many requests. Try again in a minute." } },
      { status: 429 }
    );
  }

  const project = await db.query.projects.findFirst({
    where: and(eq(projects.id, params.id), eq(projects.workspaceId, workspace.id)),
  });
  if (!project) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Project not found." } },
      { status: 404 }
    );
  }

  const rows = await db
    .select()
    .from(comments)
    .where(eq(comments.projectId, project.id))
    .orderBy(comments.createdAt);

  return NextResponse.json({ comments: rows });
}
