import { NextResponse } from "next/server";
import { db, projects, eq, desc } from "@easymarker/db";
import { checkUrlSubmission, generateShareToken } from "@easymarker/shared";
import { getWorkspaceFromApiKey } from "@/lib/api-key";
import { checkRateLimit } from "@/lib/rate-limit";

function unauthenticated() {
  return NextResponse.json(
    { error: { code: "UNAUTHENTICATED", message: "A valid API key is required." } },
    { status: 401 }
  );
}

function rateLimited() {
  return NextResponse.json(
    { error: { code: "RATE_LIMITED", message: "Too many requests. Try again in a minute." } },
    { status: 429 }
  );
}

export async function GET(request: Request) {
  const workspace = await getWorkspaceFromApiKey(request);
  if (!workspace) return unauthenticated();
  if (!checkRateLimit(workspace.id, 60, 60_000)) return rateLimited();

  const rows = await db
    .select()
    .from(projects)
    .where(eq(projects.workspaceId, workspace.id))
    .orderBy(desc(projects.createdAt));

  return NextResponse.json({ projects: rows });
}

export async function POST(request: Request) {
  const workspace = await getWorkspaceFromApiKey(request);
  if (!workspace) return unauthenticated();
  if (!checkRateLimit(workspace.id, 60, 60_000)) return rateLimited();

  const body = await request.json().catch(() => null);
  const url = typeof body?.url === "string" ? body.url.trim() : "";

  if (!url) {
    return NextResponse.json(
      { error: { code: "INVALID_URL", message: "Please provide a valid https:// URL." } },
      { status: 400 }
    );
  }

  const result = await checkUrlSubmission(url);
  if (!result.ok) {
    return NextResponse.json({ error: { code: result.code, message: result.message } }, { status: 400 });
  }

  const [project] = await db
    .insert(projects)
    .values({
      workspaceId: workspace.id,
      type: "url",
      url: result.url,
      title: new URL(result.url).hostname,
      shareToken: generateShareToken(),
    })
    .returning();

  return NextResponse.json({ project, shareUrl: `/r/${project?.shareToken}` }, { status: 201 });
}
