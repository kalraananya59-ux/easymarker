import { db, users, workspaces, eq } from "@easymarker/db";

const DEV_EMAIL = "dev@easymarker.local";
const DEV_WORKSPACE_SLUG = "dev";

async function main() {
  const existingWorkspace = await db.query.workspaces.findFirst({
    where: eq(workspaces.slug, DEV_WORKSPACE_SLUG),
  });

  if (existingWorkspace) {
    console.log(`Dev workspace already exists: ${existingWorkspace.id}`);
    return;
  }

  const [user] = await db
    .insert(users)
    .values({ email: DEV_EMAIL, name: "Dev Owner" })
    .returning();
  if (!user) throw new Error("Failed to create dev user");

  const [workspace] = await db
    .insert(workspaces)
    .values({ ownerId: user.id, name: "Dev Workspace", slug: DEV_WORKSPACE_SLUG })
    .returning();
  if (!workspace) throw new Error("Failed to create dev workspace");

  await db.update(users).set({ workspaceId: workspace.id }).where(eq(users.id, user.id));

  console.log(`Created dev workspace: ${workspace.id}`);
  console.log(`Created dev user: ${user.id}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
