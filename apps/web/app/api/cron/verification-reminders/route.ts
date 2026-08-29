import { NextResponse } from "next/server";
import { db, users, and, isNull, lt, eq } from "@easymarker/db";
import { sendAccountVerificationEmail } from "@/lib/verification";

const REMINDER_DELAY_MS = 24 * 60 * 60 * 1000;

// Meant to be invoked periodically by an external scheduler (cron, Vercel
// Cron, GitHub Actions, etc.) — this app has no in-process job runner. Safe
// to call as often as you like: each user gets at most one reminder ever,
// tracked via verificationReminderSentAt.
export async function POST(request: Request) {
  const secret = process.env["CRON_SECRET"];
  if (!secret) {
    return NextResponse.json(
      { error: { code: "CRON_NOT_CONFIGURED", message: "CRON_SECRET is not set." } },
      { status: 503 }
    );
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Invalid cron secret." } }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - REMINDER_DELAY_MS);

  const dueUsers = await db.query.users.findMany({
    where: and(isNull(users.emailVerifiedAt), isNull(users.verificationReminderSentAt), lt(users.createdAt, cutoff)),
  });

  for (const user of dueUsers) {
    await sendAccountVerificationEmail(user, { isReminder: true });
    await db.update(users).set({ verificationReminderSentAt: new Date() }).where(eq(users.id, user.id));
  }

  return NextResponse.json({ remindersSent: dueUsers.length });
}
