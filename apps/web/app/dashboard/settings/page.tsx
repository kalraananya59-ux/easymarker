import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { db, workspaces, users, eq } from "@easymarker/db";
import { authOptions } from "@/lib/auth";
import { AppHeader } from "../AppHeader";
import { ApiKeyGenerator } from "./ApiKeyGenerator";
import { BillingSection } from "./BillingSection";
import styles from "./page.module.css";

export default async function SettingsPage() {
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

  const workspace = await db.query.workspaces.findFirst({
    where: eq(workspaces.id, session.user.workspaceId),
    columns: { plan: true },
  });

  return (
    <div className={styles.page}>
      <AppHeader title="Settings" />
      <div className={styles.content}>
        <BillingSection plan={workspace?.plan ?? "free"} />
        <ApiKeyGenerator />
      </div>
    </div>
  );
}
