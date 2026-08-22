import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { db, comments, projects, eq, and } from "@easymarker/db";
import { authOptions } from "@/lib/auth";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");

  if (!projectId) {
    return NextResponse.json(
      { error: { code: "MISSING_PROJECT_ID", message: "projectId is required." } },
      { status: 400 }
    );
  }

  const rows = await db.query.comments.findMany({
    where: eq(comments.projectId, projectId),
    with: { replies: true },
    orderBy: (c, { asc }) => [asc(c.createdAt)],
  });

  return NextResponse.json({ comments: rows });
}

const MAX_BODY_LENGTH = 5000;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  const projectId = typeof body?.projectId === "string" ? body.projectId : "";
  const anchor = body?.anchor;
  const text = typeof body?.body === "string" ? body.body.trim() : "";
  const positionX = typeof body?.positionX === "number" ? body.positionX : null;
  const positionY = typeof body?.positionY === "number" ? body.positionY : null;
  const reviewerName = typeof body?.reviewerName === "string" ? body.reviewerName.trim() : "";
  const reviewerEmail = typeof body?.reviewerEmail === "string" ? body.reviewerEmail.trim() : null;

  if (!projectId) {
    return NextResponse.json(
      { error: { code: "MISSING_PROJECT_ID", message: "projectId is required." } },
      { status: 400 }
    );
  }
  if (!reviewerName) {
    return NextResponse.json(
      { error: { code: "MISSING_NAME", message: "A name is required to leave a comment." } },
      { status: 400 }
    );
  }
  if (!text) {
    return NextResponse.json(
      { error: { code: "EMPTY_COMMENT", message: "Comment text can't be empty." } },
      { status: 400 }
    );
  }
  if (text.length > MAX_BODY_LENGTH) {
    return NextResponse.json(
      { error: { code: "COMMENT_TOO_LONG", message: "Comment is too long." } },
      { status: 400 }
    );
  }
  if (positionX === null || positionY === null) {
    return NextResponse.json(
      { error: { code: "MISSING_POSITION", message: "Pin position is required." } },
      { status: 400 }
    );
  }

  const project = await db.query.projects.findFirst({
    where: and(eq(projects.id, projectId), eq(projects.status, "active")),
  });
  if (!project) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Project not found." } },
      { status: 404 }
    );
  }

  const session = await getServerSession(authOptions);
  const reviewerId = session?.user.workspaceId === project.workspaceId ? session.user.id : null;

  const [comment] = await db
    .insert(comments)
    .values({
      projectId,
      reviewerId,
      reviewerName,
      reviewerEmail: reviewerEmail || null,
      anchor,
      body: text,
      positionX,
      positionY,
    })
    .returning();

  return NextResponse.json({ comment }, { status: 201 });
}
