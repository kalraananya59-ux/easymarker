import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { db, users, workspaces, eq } from "@easymarker/db";
import { slugFromName } from "@easymarker/shared";
import { sendAccountVerificationEmail } from "@/lib/verification";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json(
      { error: { code: "INVALID_EMAIL", message: "Please enter a valid email address." } },
      { status: 400 }
    );
  }
  if (!name) {
    return NextResponse.json(
      { error: { code: "INVALID_NAME", message: "Please enter your name." } },
      { status: 400 }
    );
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: { code: "WEAK_PASSWORD", message: "Password must be at least 8 characters." } },
      { status: 400 }
    );
  }

  const existing = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (existing) {
    return NextResponse.json(
      { error: { code: "EMAIL_TAKEN", message: "An account with that email already exists." } },
      { status: 409 }
    );
  }

  const passwordHash = await hash(password, 12);

  // The existence check above is a plain read, not a lock — two submissions
  // for the same email (a double-click, or two tabs) can both pass it and
  // then race on this insert's unique constraint. Catch that specifically
  // rather than letting an unhandled Postgres error reach the client as a
  // broken, non-JSON response.
  let user: typeof users.$inferSelect | undefined;
  try {
    [user] = await db.insert(users).values({ email, name, passwordHash }).returning();
  } catch (err) {
    if ((err as { code?: string }).code === "23505") {
      return NextResponse.json(
        { error: { code: "EMAIL_TAKEN", message: "An account with that email already exists." } },
        { status: 409 }
      );
    }
    console.error("signup: failed to create user", err);
    return NextResponse.json(
      { error: { code: "SIGNUP_FAILED", message: "Could not create your account. Try again." } },
      { status: 500 }
    );
  }
  if (!user) {
    return NextResponse.json(
      { error: { code: "SIGNUP_FAILED", message: "Could not create your account. Try again." } },
      { status: 500 }
    );
  }

  let workspace: typeof workspaces.$inferSelect | undefined;
  try {
    [workspace] = await db
      .insert(workspaces)
      .values({ ownerId: user.id, name: `${name}'s Workspace`, slug: slugFromName(name) })
      .returning();
  } catch (err) {
    console.error("signup: failed to create workspace", err);
    return NextResponse.json(
      { error: { code: "SIGNUP_FAILED", message: "Could not create your workspace. Try again." } },
      { status: 500 }
    );
  }
  if (!workspace) {
    return NextResponse.json(
      { error: { code: "SIGNUP_FAILED", message: "Could not create your workspace. Try again." } },
      { status: 500 }
    );
  }

  await db.update(users).set({ workspaceId: workspace.id }).where(eq(users.id, user.id));

  await sendAccountVerificationEmail(user);

  return NextResponse.json({ ok: true }, { status: 201 });
}
