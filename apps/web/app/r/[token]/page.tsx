import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { db, comments, projects, eq } from "@easymarker/db";
import { authOptions } from "@/lib/auth";
import { ReviewOverlay } from "./ReviewOverlay";
import { UrlReviewOverlay } from "./UrlReviewOverlay";
import { PdfReviewOverlay } from "./PdfReviewOverlay";

const PROXY_SERVICE_URL = process.env["PROXY_SERVICE_URL"] ?? "http://localhost:4000";

// Review links are unguessable but not secret — anyone with the URL can
// open them, which is the point (no-signup guest reviewers). They should
// never end up in search results, though: this is per-project content
// shared for a specific review, not something meant to be publicly
// discoverable.
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

async function loadComments(projectId: string) {
  const rows = await db.query.comments.findMany({
    where: eq(comments.projectId, projectId),
    with: {
      replies: true,
      statusChanges: { orderBy: (sc, { asc }) => [asc(sc.createdAt)] },
    },
    orderBy: (c, { asc }) => [asc(c.createdAt)],
  });

  return rows.map((c) => ({
    id: c.id,
    reviewerId: c.reviewerId,
    reviewerName: c.reviewerName,
    body: c.body,
    status: c.status,
    positionX: c.positionX,
    positionY: c.positionY,
    anchor: c.anchor,
    createdAt: c.createdAt.toISOString(),
    replies: c.replies.map((r) => ({
      id: r.id,
      authorName: r.authorName,
      authorId: r.authorId,
      body: r.body,
      createdAt: r.createdAt.toISOString(),
    })),
    statusChanges: c.statusChanges.map((sc) => ({
      id: sc.id,
      status: sc.status,
      changedByName: sc.changedByName,
      createdAt: sc.createdAt.toISOString(),
    })),
  }));
}

export default async function ReviewPage({ params }: { params: { token: string } }) {
  const project = await db.query.projects.findFirst({
    where: eq(projects.shareToken, params.token),
  });

  // A missing project and an archived one both 404 — deliberately not
  // distinguishing "never existed" from "deactivated" in the response lets us
  // avoid confirming to a stranger that a given token was ever valid.
  if (!project || project.status === "archived") {
    notFound();
  }

  const session = await getServerSession(authOptions);
  const isOwner = Boolean(session?.user.workspaceId && session.user.workspaceId === project.workspaceId);

  if (project.type === "url" && project.url) {
    const renderUrl = `${PROXY_SERVICE_URL}/render?url=${encodeURIComponent(project.url)}&token=${project.shareToken}`;
    const rows = await loadComments(project.id);
    // A URL-project comment always carries a DOM anchor from the client; a null
    // one would be a data anomaly, not something to render a pin for.
    const initialComments = rows.filter(
      (c): c is typeof c & { anchor: NonNullable<(typeof c)["anchor"]> } => c.anchor !== null
    );

    return (
      <UrlReviewOverlay
        projectId={project.id}
        renderUrl={renderUrl}
        proxyOrigin={new URL(PROXY_SERVICE_URL).origin}
        title={project.title}
        isOwner={isOwner}
        initialComments={initialComments}
      />
    );
  }

  if (project.type === "image" && project.assetPath) {
    const initialComments = await loadComments(project.id);

    return (
      <ReviewOverlay
        projectId={project.id}
        imageSrc={project.assetPath}
        imageAlt={project.title}
        isOwner={isOwner}
        initialComments={initialComments}
      />
    );
  }

  if (project.type === "pdf" && project.assetPath) {
    const rows = await loadComments(project.id);
    // A PDF comment always carries a percentage anchor tied to a page number;
    // a null one would be a data anomaly, not something to render a pin for.
    const initialComments = rows.filter(
      (c): c is typeof c & { anchor: NonNullable<(typeof c)["anchor"]> } => c.anchor !== null
    );

    return (
      <PdfReviewOverlay
        projectId={project.id}
        pdfUrl={project.assetPath}
        title={project.title}
        isOwner={isOwner}
        initialComments={initialComments}
      />
    );
  }

  return (
    <main>
      <p>This project type isn&apos;t viewable yet.</p>
    </main>
  );
}
