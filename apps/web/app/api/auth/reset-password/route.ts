import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { db, users, passwordResetTokens, eq } from "@easymarker/db";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const token = typeof body?.token === "string" ? body.token : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!token) {
    return NextResponse.json(
      { error: { code: "INVALID_TOKEN", message: "This reset link is invalid." } },
      { status: 400 }
    );
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: { code: "WEAK_PASSWORD", message: "Password must be at least 8 characters." } },
      { status: 400 }
    );
  }

  const tokenRow = await db.query.passwordResetTokens.findFirst({
    where: eq(passwordResetTokens.token, token),
  });
  if (!tokenRow || tokenRow.expiresAt.getTime() < Date.now()) {
    return NextResponse.json(
      { error: { code: "INVALID_TOKEN", message: "This reset link is invalid or has expired." } },
      { status: 400 }
    );
  }

  const passwordHash = await hash(password, 12);

  try {
    await db.update(users).set({ passwordHash }).where(eq(users.id, tokenRow.userId));
  } catch (err) {
    console.error("reset-password: failed to update password", err);
    return NextResponse.json(
      { error: { code: "RESET_FAILED", message: "Could not reset your password. Try again." } },
      { status: 500 }
    );
  }

  await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, tokenRow.userId));

  return NextResponse.json({ ok: true });
}
