import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { db, projects, eq, desc } from "@easymarker/db";
import { checkUrlSubmission, generateShareToken } from "@easymarker/shared";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user.workspaceId) {
    return NextResponse.json(
      { error: { code: "UNAUTHENTICATED", message: "Sign in required." } },
      { status: 401 }
    );
  }

  const rows = await db
    .select()
    .from(projects)
    .where(eq(projects.workspaceId, session.user.workspaceId))
    .orderBy(desc(projects.createdAt));

  return NextResponse.json({ projects: rows });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user.workspaceId) {
    return NextResponse.json(
      { error: { code: "UNAUTHENTICATED", message: "Sign in required." } },
      { status: 401 }
    );
  }

  const body = await request.json().catch(() => null);
  const url = typeof body?.url === "string" ? body.url.trim() : "";

  if (!url) {
    return NextResponse.json(
      { error: { code: "INVALID_URL", message: "Please enter a valid https:// URL." } },
      { status: 400 }
    );
  }

  const result = await checkUrlSubmission(url);
  if (!result.ok) {
    return NextResponse.json(
      { error: { code: result.code, message: result.message } },
      { status: 400 }
    );
  }

  const shareToken = generateShareToken();
  const title = new URL(result.url).hostname;

  const [project] = await db
    .insert(projects)
    .values({
      workspaceId: session.user.workspaceId,
      type: "url",
      url: result.url,
      title,
      shareToken,
    })
    .returning();

  if (!project) {
    return NextResponse.json(
      { error: { code: "CREATE_FAILED", message: "Could not create the project." } },
      { status: 500 }
    );
  }

  return NextResponse.json({ project, shareUrl: `/r/${project.shareToken}` }, { status: 201 });
}
