import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { db, users, eq } from "@easymarker/db";
import { authOptions } from "@/lib/auth";
import { sendAccountVerificationEmail } from "@/lib/verification";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user.id) {
    return NextResponse.json(
      { error: { code: "UNAUTHENTICATED", message: "Sign in required." } },
      { status: 401 }
    );
  }

  const user = await db.query.users.findFirst({ where: eq(users.id, session.user.id) });
  if (!user) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "Account not found." } }, { status: 404 });
  }

  if (user.emailVerifiedAt) {
    return NextResponse.json(
      { error: { code: "ALREADY_VERIFIED", message: "This email is already verified." } },
      { status: 400 }
    );
  }

  await sendAccountVerificationEmail(user);

  return NextResponse.json({ ok: true });
}
