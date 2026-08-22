import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { db, projects, eq, desc } from "@easymarker/db";
import { authOptions } from "@/lib/auth";
import { NewProjectForm } from "./NewProjectForm";
import { UploadForm } from "./UploadForm";
import { ProjectCard } from "./ProjectCard";
import { SignOutButton } from "./SignOutButton";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user.workspaceId) {
    redirect("/signin");
  }

  const rows = await db
    .select()
    .from(projects)
    .where(eq(projects.workspaceId, session.user.workspaceId))
    .orderBy(desc(projects.createdAt));

  return (
    <main>
      <header>
        <h1>Your projects</h1>
        <Link href="/dashboard/settings">Settings</Link>
        <SignOutButton />
      </header>
      <NewProjectForm />
      <UploadForm />

      {rows.length === 0 ? (
        <p>Paste a URL above to create your first project.</p>
      ) : (
        <div>
          {rows.map((p) => (
            <ProjectCard
              key={p.id}
              id={p.id}
              title={p.title}
              type={p.type}
              status={p.status}
              shareToken={p.shareToken}
              createdAt={p.createdAt.toISOString()}
            />
          ))}
        </div>
      )}
    </main>
  );
}
