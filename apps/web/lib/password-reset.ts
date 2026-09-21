import { db, passwordResetTokens, eq } from "@easymarker/db";
import { generateVerificationToken } from "@easymarker/shared";
import { sendPasswordResetEmail } from "@easymarker/email";

const TOKEN_TTL_MS = 60 * 60 * 1000;

function resetUrlFor(token: string): string {
  const origin = process.env["WEB_APP_ORIGIN"] ?? "http://localhost:3000";
  return `${origin}/reset-password?token=${token}`;
}

// Fire-and-forget from the caller's perspective, same as account
// verification email — a transient provider failure shouldn't surface as
// an error to someone requesting a reset (the route always responds ok
// either way, to avoid revealing whether an email is registered).
export async function sendAccountPasswordResetEmail(user: { id: string; name: string; email: string }): Promise<void> {
  // Only one live token per user — an old reset link can't be replayed
  // after a newer one was requested.
  await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, user.id));

  const token = generateVerificationToken();
  await db.insert(passwordResetTokens).values({
    userId: user.id,
    token,
    expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
  });

  try {
    await sendPasswordResetEmail({
      to: user.email,
      name: user.name,
      resetUrl: resetUrlFor(token),
    });
  } catch (err) {
    console.error("sendAccountPasswordResetEmail failed", err);
  }
}
