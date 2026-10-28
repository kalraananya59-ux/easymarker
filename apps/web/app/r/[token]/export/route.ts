import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { db, comments, projects, eq } from "@easymarker/db";
import { authOptions } from "@/lib/auth";
import { buildCommentsCsv, buildCommentsPdf } from "@/lib/export";

// Export from the review page itself. Anyone holding the review link can
// already read every comment on it, so they can also download them — but
// reviewers' email addresses are only included for the project owner.
export async function GET(request: Request, { params }: { params: { token: string } }) {
  const project = await db.query.projects.findFirst({
    where: eq(projects.shareToken, params.token),
  });
  if (!project || project.status === "archived") {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "Review link not found." } }, { status: 404 });
  }

  const session = await getServerSession(authOptions);
  const isOwner = Boolean(session?.user.workspaceId && session.user.workspaceId === project.workspaceId);

  const { searchParams, origin } = new URL(request.url);
  const format = searchParams.get("format") === "pdf" ? "pdf" : "csv";

  const rows = (
    await db.select().from(comments).where(eq(comments.projectId, project.id)).orderBy(comments.createdAt)
  ).map((c) => (isOwner ? c : { ...c, reviewerEmail: null }));

  const commentLink = (commentId: string) => `${origin}/r/${project.shareToken}?c=${commentId}`;
  const safeTitle = project.title.replace(/[^a-z0-9-]+/gi, "-").toLowerCase() || "project";

  if (format === "csv") {
    return new NextResponse(buildCommentsCsv(rows, commentLink), {
      status: 200,
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="${safeTitle}-comments.csv"`,
        "cache-control": "no-store",
        "x-robots-tag": "noindex",
      },
    });
  }

  const pdf = await buildCommentsPdf(rows, project.title, commentLink);
  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="${safeTitle}-comments.pdf"`,
      "cache-control": "no-store",
      "x-robots-tag": "noindex",
    },
  });
}
