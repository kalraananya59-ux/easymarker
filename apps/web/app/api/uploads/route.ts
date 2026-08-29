import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { randomUUID } from "crypto";
import { db, projects } from "@easymarker/db";
import { generateShareToken } from "@easymarker/shared";
import { authOptions } from "@/lib/auth";
import { validateUploadedFile } from "@/lib/file-validation";
import { uploadObject } from "@/lib/storage";
import { checkProjectLimit } from "@/lib/plan-limits";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user.workspaceId) {
    return NextResponse.json(
      { error: { code: "UNAUTHENTICATED", message: "Sign in required." } },
      { status: 401 }
    );
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");

  if (!file || typeof file === "string") {
    return NextResponse.json(
      { error: { code: "NO_FILE", message: "No file was provided." } },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const validation = await validateUploadedFile(buffer);

  if (!validation.ok) {
    return NextResponse.json(
      { error: { code: validation.code, message: validation.message } },
      { status: 400 }
    );
  }

  const limitCheck = await checkProjectLimit(session.user.workspaceId);
  if (!limitCheck.ok) {
    return NextResponse.json(
      {
        error: {
          code: "PLAN_LIMIT_REACHED",
          message: `You've reached the ${limitCheck.limit}-project limit on the ${limitCheck.plan} plan. Upgrade to add more.`,
        },
      },
      { status: 403 }
    );
  }

  const key = `${session.user.workspaceId}/${randomUUID()}`;

  try {
    await uploadObject(key, buffer, validation.mime);
  } catch {
    return NextResponse.json(
      { error: { code: "UPLOAD_FAILED", message: "Could not store the file. Try again." } },
      { status: 502 }
    );
  }

  const title = file.name && file.name.trim() ? file.name.trim() : "Untitled upload";
  const shareToken = generateShareToken();

  const [project] = await db
    .insert(projects)
    .values({
      workspaceId: session.user.workspaceId,
      type: validation.projectType,
      assetPath: key,
      title,
      shareToken,
    })
    .returning();

  if (!project) {
    return NextResponse.json(
      { error: { code: "CREATE_FAILED", message: "Could not create the project." } },
      { status: 500 }
    );
  }

  return NextResponse.json({ project, shareUrl: `/r/${project.shareToken}` }, { status: 201 });
}
