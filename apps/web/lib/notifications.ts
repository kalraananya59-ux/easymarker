import { db, projects, workspaces, users, eq } from "@easymarker/db";
import { sendNewCommentEmail } from "@easymarker/email";

const SNIPPET_MAX_LENGTH = 200;

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;
}

function reviewUrlFor(shareToken: string): string {
  const origin = process.env["WEB_APP_ORIGIN"] ?? "http://localhost:3000";
  return `${origin}/r/${shareToken}`;
}

// Fire-and-forget: the PRD asks for delivery within 2 minutes, not a synchronous
// send, so a failed notification should never block or fail the comment/reply
// request that triggered it.
export async function notifyOwnerOfNewComment({
  projectId,
  isOwnerAuthored,
  commenterName,
  commentBody,
}: {
  projectId: string;
  isOwnerAuthored: boolean;
  commenterName: string;
  commentBody: string;
}): Promise<void> {
  if (isOwnerAuthored) return;

  try {
    const project = await db.query.projects.findFirst({ where: eq(projects.id, projectId) });
    if (!project || !project.notificationsEnabled) return;

    const workspace = await db.query.workspaces.findFirst({ where: eq(workspaces.id, project.workspaceId) });
    if (!workspace) return;

    const owner = await db.query.users.findFirst({ where: eq(users.id, workspace.ownerId) });
    if (!owner) return;

    await sendNewCommentEmail({
      to: owner.email,
      projectTitle: project.title,
      commenterName,
      commentSnippet: truncate(commentBody, SNIPPET_MAX_LENGTH),
      reviewUrl: reviewUrlFor(project.shareToken),
    });
  } catch (err) {
    console.error("notifyOwnerOfNewComment failed", err);
  }
}
