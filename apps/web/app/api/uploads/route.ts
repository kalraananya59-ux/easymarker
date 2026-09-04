import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { randomUUID } from "crypto";
import { db, projects } from "@easymarker/db";
import { generateShareToken } from "@easymarker/shared";
import { authOptions } from "@/lib/auth";
import { validateUploadedFile } from "@/lib/file-validation";
import { uploadObject } from "@/lib/storage";
import { checkProjectLimit } from "@/lib/plan-limits";

// File storage isn't wired up in this deployment yet — URL projects still
// work, but uploads are turned off at the API level too, not just hidden in
// the UI, so a direct POST here fails cleanly instead of hitting storage.
const UPLOADS_ENABLED = false;

export async function POST(request: Request) {
  if (!UPLOADS_ENABLED) {
    return NextResponse.json(
      { error: { code: "UPLOADS_DISABLED", message: "Image and PDF uploads aren't available yet." } },
      { status: 503 }
    );
  }

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
  let assetUrl: string;

  try {
    assetUrl = await uploadObject(key, buffer, validation.mime);
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
      assetPath: assetUrl,
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
