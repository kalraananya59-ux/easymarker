import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { db, comments, commentReplies, projects, eq, and } from "@easymarker/db";
import { authOptions } from "@/lib/auth";
import { notifyOwnerOfNewComment } from "@/lib/notifications";

const MAX_BODY_LENGTH = 5000;

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json().catch(() => null);
  const text = typeof body?.body === "string" ? body.body.trim() : "";
  const guestName = typeof body?.authorName === "string" ? body.authorName.trim() : "";

  if (!text) {
    return NextResponse.json(
      { error: { code: "EMPTY_REPLY", message: "Reply text can't be empty." } },
      { status: 400 }
    );
  }
  if (text.length > MAX_BODY_LENGTH) {
    return NextResponse.json(
      { error: { code: "REPLY_TOO_LONG", message: "Reply is too long." } },
      { status: 400 }
    );
  }

  const comment = await db.query.comments.findFirst({ where: eq(comments.id, params.id) });
  if (!comment) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Comment not found." } },
      { status: 404 }
    );
  }

  const session = await getServerSession(authOptions);
  let authorId: string | null = null;
  let authorName = guestName;
  let isOwner = false;

  if (session?.user.workspaceId) {
    const project = await db.query.projects.findFirst({
      where: and(eq(projects.id, comment.projectId), eq(projects.workspaceId, session.user.workspaceId)),
    });
    if (project) {
      authorId = session.user.id;
      authorName = session.user.name;
      isOwner = true;
    }
  }

  if (!authorName) {
    return NextResponse.json(
      { error: { code: "MISSING_NAME", message: "A name is required to reply." } },
      { status: 400 }
    );
  }

  const [reply] = await db
    .insert(commentReplies)
    .values({ commentId: params.id, authorId, authorName, body: text })
    .returning();

  await notifyOwnerOfNewComment({
    projectId: comment.projectId,
    isOwnerAuthored: isOwner,
    commenterName: authorName,
    commentBody: text,
  });

  return NextResponse.json({ reply }, { status: 201 });
}
