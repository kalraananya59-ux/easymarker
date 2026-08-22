import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { db, comments, projects, eq, and } from "@easymarker/db";
import { authOptions } from "@/lib/auth";
import { buildCommentsCsv, buildCommentsPdf } from "@/lib/export";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user.workspaceId) {
    return NextResponse.json(
      { error: { code: "UNAUTHENTICATED", message: "Sign in required." } },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") === "pdf" ? "pdf" : "csv";

  const project = await db.query.projects.findFirst({
    where: and(eq(projects.id, params.id), eq(projects.workspaceId, session.user.workspaceId)),
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

  const safeTitle = project.title.replace(/[^a-z0-9-]+/gi, "-").toLowerCase();

  if (format === "csv") {
    const csv = buildCommentsCsv(rows);
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="${safeTitle}-comments.csv"`,
      },
    });
  }

  const pdf = await buildCommentsPdf(rows, project.title);
  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="${safeTitle}-comments.pdf"`,
    },
  });
}
