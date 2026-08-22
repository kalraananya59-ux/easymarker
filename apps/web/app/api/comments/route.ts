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
  const clientReviewerName = typeof body?.reviewerName === "string" ? body.reviewerName.trim() : "";
  const reviewerEmail = typeof body?.reviewerEmail === "string" ? body.reviewerEmail.trim() : null;

  if (!projectId) {
    return NextResponse.json(
      { error: { code: "MISSING_PROJECT_ID", message: "projectId is required." } },
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
  const isOwner = session?.user.workspaceId === project.workspaceId;
  const reviewerId = isOwner ? session!.user.id : null;
  // The owner's display name always comes from their real account name, never
  // from client input — matches how replies already work (authorName is
  // session-derived for the owner) and closes a labeling inconsistency where
  // top-level comments showed the literal string "You" instead.
  const reviewerName = isOwner ? session!.user.name : clientReviewerName;

  if (!reviewerName) {
    return NextResponse.json(
      { error: { code: "MISSING_NAME", message: "A name is required to leave a comment." } },
      { status: 400 }
    );
  }

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
