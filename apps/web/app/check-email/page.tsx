import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { db, users, eq } from "@easymarker/db";
import { authOptions } from "@/lib/auth";
import { CheckEmailCard } from "./CheckEmailCard";
import { Logo } from "../Logo";
import styles from "../AuthLayout.module.css";

export default async function CheckEmailPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user.id) {
    redirect("/signin");
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
    columns: { emailVerifiedAt: true, email: true },
  });

  if (user?.emailVerifiedAt) {
    redirect("/dashboard");
  }

  return (
    <div className={styles.page}>
      <span className={styles.logo}>
        <Logo />
      </span>
      <CheckEmailCard email={user?.email ?? ""} />
    </div>
  );
}
