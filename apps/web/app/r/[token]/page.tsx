import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { db, comments, projects, eq } from "@easymarker/db";
import { getSignedDownloadUrl } from "@/lib/storage";
import { authOptions } from "@/lib/auth";
import { ReviewOverlay } from "./ReviewOverlay";
import { UrlReviewOverlay } from "./UrlReviewOverlay";

const PROXY_SERVICE_URL = process.env["PROXY_SERVICE_URL"] ?? "http://localhost:4000";

async function loadComments(projectId: string) {
  const rows = await db.query.comments.findMany({
    where: eq(comments.projectId, projectId),
    with: { replies: true },
    orderBy: (c, { asc }) => [asc(c.createdAt)],
  });

  return rows.map((c) => ({
    id: c.id,
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
  }));
}

export default async function ReviewPage({ params }: { params: { token: string } }) {
  const project = await db.query.projects.findFirst({
    where: eq(projects.shareToken, params.token),
  });

  if (!project) {
    notFound();
  }

  if (project.status === "archived") {
    return (
      <main>
        <p>This review link has been deactivated.</p>
      </main>
    );
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
    const signedUrl = await getSignedDownloadUrl(project.assetPath);
    const initialComments = await loadComments(project.id);

    return (
      <ReviewOverlay
        projectId={project.id}
        imageSrc={signedUrl}
        imageAlt={project.title}
        isOwner={isOwner}
        initialComments={initialComments}
      />
    );
  }

  if (project.type === "pdf" && project.assetPath) {
    const signedUrl = await getSignedDownloadUrl(project.assetPath);
    return (
      <div style={{ position: "fixed", inset: 0 }}>
        <iframe
          src={signedUrl}
          title={project.title}
          style={{ width: "100%", height: "100%", border: "none" }}
        />
      </div>
    );
  }

  return (
    <main>
      <p>This project type isn&apos;t viewable yet.</p>
    </main>
  );
}
