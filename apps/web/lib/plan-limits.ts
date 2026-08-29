import { db, projects, comments, workspaces, eq, and, count } from "@easymarker/db";
import type { Plan } from "@easymarker/shared";

export const PLAN_LIMITS: Record<Plan, { projects: number | null; comments: number | null }> = {
  free: { projects: 3, comments: 10 },
  pro: { projects: 25, comments: null },
  agency: { projects: null, comments: null },
};

export async function getWorkspacePlan(workspaceId: string): Promise<Plan> {
  const workspace = await db.query.workspaces.findFirst({
    where: eq(workspaces.id, workspaceId),
    columns: { plan: true },
  });
  return workspace?.plan ?? "free";
}

export async function checkProjectLimit(
  workspaceId: string
): Promise<{ ok: true } | { ok: false; plan: Plan; limit: number }> {
  const plan = await getWorkspacePlan(workspaceId);
  const limit = PLAN_LIMITS[plan].projects;
  if (limit === null) return { ok: true };

  const [row] = await db
    .select({ value: count() })
    .from(projects)
    .where(and(eq(projects.workspaceId, workspaceId), eq(projects.status, "active")));

  if ((row?.value ?? 0) >= limit) return { ok: false, plan, limit };
  return { ok: true };
}

export async function checkCommentLimit(
  projectId: string,
  workspaceId: string
): Promise<{ ok: true } | { ok: false; plan: Plan; limit: number }> {
  const plan = await getWorkspacePlan(workspaceId);
  const limit = PLAN_LIMITS[plan].comments;
  if (limit === null) return { ok: true };

  const [row] = await db.select({ value: count() }).from(comments).where(eq(comments.projectId, projectId));

  if ((row?.value ?? 0) >= limit) return { ok: false, plan, limit };
  return { ok: true };
}
