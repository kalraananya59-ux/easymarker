import { NextResponse } from "next/server";
import { db, users, eq } from "@easymarker/db";
import { sendAccountPasswordResetEmail } from "@/lib/password-reset";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";

  if (email && EMAIL_RE.test(email)) {
    const user = await db.query.users.findFirst({ where: eq(users.email, email) });
    if (user) {
      await sendAccountPasswordResetEmail(user);
    }
  }

  // Always the same response regardless of whether the email exists —
  // otherwise this endpoint becomes a way to check which emails have
  // an Easymarker account.
  return NextResponse.json({ ok: true });
}
