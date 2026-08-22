import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { randomBytes } from "crypto";
import { db, users, workspaces, eq } from "@easymarker/db";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function slugFromName(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  const suffix = randomBytes(3).toString("hex");
  return (base || "workspace") + "-" + suffix;
}

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

  const [user] = await db.insert(users).values({ email, name, passwordHash }).returning();
  if (!user) {
    return NextResponse.json(
      { error: { code: "SIGNUP_FAILED", message: "Could not create your account. Try again." } },
      { status: 500 }
    );
  }

  const [workspace] = await db
    .insert(workspaces)
    .values({ ownerId: user.id, name: `${name}'s Workspace`, slug: slugFromName(name) })
    .returning();
  if (!workspace) {
    return NextResponse.json(
      { error: { code: "SIGNUP_FAILED", message: "Could not create your workspace. Try again." } },
      { status: 500 }
    );
  }

  await db.update(users).set({ workspaceId: workspace.id }).where(eq(users.id, user.id));

  return NextResponse.json({ ok: true }, { status: 201 });
}
