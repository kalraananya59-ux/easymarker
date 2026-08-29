import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { db, projects, comments, workspaces, users, eq, and, ne, desc, isNull, count } from "@easymarker/db";
import type { ProjectType } from "@easymarker/shared";
import { authOptions } from "@/lib/auth";
import { NewProjectForm } from "./NewProjectForm";
import { UploadForm } from "./UploadForm";
import { ProjectCard } from "./ProjectCard";
import { OnboardingChecklist } from "./OnboardingChecklist";
import { AppHeader } from "./AppHeader";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

const TYPE_FILTERS: { value: ProjectType | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "url", label: "Website" },
  { value: "image", label: "Image" },
  { value: "pdf", label: "PDF" },
];

const VALID_TYPES: ProjectType[] = ["url", "image", "pdf", "design"];

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { type?: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user.workspaceId) {
    redirect("/signin");
  }

  const currentUser = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
    columns: { emailVerifiedAt: true },
  });
  if (!currentUser?.emailVerifiedAt) {
    redirect("/check-email");
  }

  const workspaceId = session.user.workspaceId;
  const typeFilter = VALID_TYPES.includes(searchParams.type as ProjectType)
    ? (searchParams.type as ProjectType)
    : null;

  // Per §8.9: archiving "removes from active list" — the dashboard shows only
  // active projects, permanently, not just until the badge changes.
  const conditions = [eq(projects.workspaceId, workspaceId), eq(projects.status, "active")];
  if (typeFilter) conditions.push(eq(projects.type, typeFilter));

  const rows = await db
    .select()
    .from(projects)
    .where(and(...conditions))
    .orderBy(desc(projects.updatedAt));

  // Onboarding progress reflects ALL projects, not just the (possibly type-filtered) display list.
  const anyActiveProject = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.workspaceId, workspaceId), eq(projects.status, "active")))
    .limit(1);

  const workspace = await db.query.workspaces.findFirst({
    where: eq(workspaces.id, workspaceId),
    columns: { onboardingCopiedLinkAt: true },
  });

  const guestComment = await db
    .select({ id: comments.id })
    .from(comments)
    .innerJoin(projects, eq(comments.projectId, projects.id))
    .where(and(eq(projects.workspaceId, workspaceId), isNull(comments.reviewerId)))
    .limit(1);

  const openCommentCounts = await db
    .select({ projectId: comments.projectId, value: count() })
    .from(comments)
    .innerJoin(projects, eq(comments.projectId, projects.id))
    .where(and(eq(projects.workspaceId, workspaceId), ne(comments.status, "resolved")))
    .groupBy(comments.projectId);

  const openCountByProject = new Map(openCommentCounts.map((row) => [row.projectId, row.value]));

  return (
    <div className={styles.page}>
      <AppHeader title="Your projects" />

      <div className={styles.content}>
        <OnboardingChecklist
          hasProject={anyActiveProject.length > 0}
          copiedLink={workspace?.onboardingCopiedLinkAt !== null}
          hasGuestComment={guestComment.length > 0}
        />

        <div className={styles.createGrid}>
          <div className={`card ${styles.createCard}`}>
            <h2>Review a website</h2>
            <NewProjectForm />
          </div>
          <div className={`card ${styles.createCard}`}>
            <h2>Review an image or PDF</h2>
            <UploadForm />
          </div>
        </div>

        <div>
          <div className={styles.listHeader}>
            <p className={styles.sectionTitle}>
              {rows.length} project{rows.length === 1 ? "" : "s"}
            </p>
            <div className={styles.filters}>
              {TYPE_FILTERS.map((f) => (
                <Link
                  key={f.value}
                  href={f.value === "all" ? "/dashboard" : `/dashboard?type=${f.value}`}
                  className={`${styles.filterLink} ${
                    (typeFilter ?? "all") === f.value ? styles.filterLinkActive : ""
                  }`}
                >
                  {f.label}
                </Link>
              ))}
            </div>
          </div>

          {rows.length === 0 ? (
            <div className={styles.emptyState}>
              <p>
                {typeFilter
                  ? "No projects match this filter."
                  : "Paste a URL or upload a file above to create your first project."}
              </p>
            </div>
          ) : (
            <div className={styles.projectGrid}>
              {rows.map((p) => (
                <ProjectCard
                  key={p.id}
                  id={p.id}
                  title={p.title}
                  type={p.type}
                  status={p.status}
                  shareToken={p.shareToken}
                  createdAt={p.createdAt.toISOString()}
                  notificationsEnabled={p.notificationsEnabled}
                  openCommentCount={openCountByProject.get(p.id) ?? 0}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
