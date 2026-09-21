import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { db, projects, eq, and } from "@easymarker/db";
import { sendReviewInviteEmail } from "@easymarker/email";
import { authOptions } from "@/lib/auth";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const WEB_APP_ORIGIN = process.env["WEB_APP_ORIGIN"] ?? "http://localhost:3000";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user.workspaceId) {
    return NextResponse.json(
      { error: { code: "UNAUTHENTICATED", message: "Sign in required." } },
      { status: 401 }
    );
  }

  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim() : "";

  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json(
      { error: { code: "INVALID_EMAIL", message: "Enter a valid email address." } },
      { status: 400 }
    );
  }

  const project = await db.query.projects.findFirst({
    where: and(eq(projects.id, params.id), eq(projects.workspaceId, session.user.workspaceId)),
  });
  if (!project) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Project not found." } },
      { status: 404 }
    );
  }

  try {
    await sendReviewInviteEmail({
      to: email,
      inviterName: session.user.name ?? "A colleague",
      projectTitle: project.title,
      reviewUrl: `${WEB_APP_ORIGIN}/r/${project.shareToken}`,
    });
  } catch (err) {
    console.error("invite: failed to send review invite email", err);
    return NextResponse.json(
      { error: { code: "SEND_FAILED", message: "Could not send the invite. Try again." } },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true });
}
