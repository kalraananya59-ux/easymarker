import Link from "next/link";
import { db, users, emailVerificationTokens, eq } from "@easymarker/db";
import styles from "../AuthLayout.module.css";

async function verify(token: string | undefined): Promise<"success" | "invalid" | "already"> {
  if (!token) return "invalid";

  const tokenRow = await db.query.emailVerificationTokens.findFirst({
    where: eq(emailVerificationTokens.token, token),
  });
  if (!tokenRow || tokenRow.expiresAt.getTime() < Date.now()) return "invalid";

  const user = await db.query.users.findFirst({ where: eq(users.id, tokenRow.userId) });
  if (!user) return "invalid";

  await db.delete(emailVerificationTokens).where(eq(emailVerificationTokens.token, token));

  if (user.emailVerifiedAt) return "already";

  await db.update(users).set({ emailVerifiedAt: new Date() }).where(eq(users.id, user.id));
  return "success";
}

const MESSAGES: Record<Awaited<ReturnType<typeof verify>>, { heading: string; body: string }> = {
  success: { heading: "Email verified", body: "Your email address is confirmed. You're all set." },
  already: { heading: "Already verified", body: "This email address was already confirmed." },
  invalid: {
    heading: "Link expired or invalid",
    body: "This verification link is no longer valid. Request a new one from your dashboard.",
  },
};

export default async function VerifyEmailPage({ searchParams }: { searchParams: { token?: string } }) {
  const result = await verify(searchParams.token);
  const { heading, body } = MESSAGES[result];

  return (
    <div className={styles.page}>
      <Link href="/" className={styles.logo}>
        Easymarker
      </Link>
      <div className={`card ${styles.card}`}>
        <h1 className={styles.heading}>{heading}</h1>
        <p className={styles.footer}>{body}</p>
        <Link href="/dashboard" className="btn btnPrimary">
          Go to dashboard
        </Link>
      </div>
    </div>
  );
}
