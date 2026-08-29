import { db, emailVerificationTokens, eq } from "@easymarker/db";
import { generateVerificationToken } from "@easymarker/shared";
import { sendVerificationEmail } from "@easymarker/email";

const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function verifyUrlFor(token: string): string {
  const origin = process.env["WEB_APP_ORIGIN"] ?? "http://localhost:3000";
  return `${origin}/verify-email?token=${token}`;
}

// Fire-and-forget from the caller's perspective: a transient email-provider
// failure shouldn't block signup or a resend click — the user can always hit
// "Resend" again from the dashboard banner.
export async function sendAccountVerificationEmail(
  user: { id: string; name: string; email: string },
  options: { isReminder?: boolean } = {}
): Promise<void> {
  // Only one live token per user — clears out any earlier unused one so a
  // resend can't leave multiple valid links floating around.
  await db.delete(emailVerificationTokens).where(eq(emailVerificationTokens.userId, user.id));

  const token = generateVerificationToken();
  await db.insert(emailVerificationTokens).values({
    userId: user.id,
    token,
    expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
  });

  try {
    await sendVerificationEmail({
      to: user.email,
      name: user.name,
      verifyUrl: verifyUrlFor(token),
      isReminder: options.isReminder ?? false,
    });
  } catch (err) {
    console.error("sendAccountVerificationEmail failed", err);
  }
}
