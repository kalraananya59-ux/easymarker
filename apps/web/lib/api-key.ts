import { createHash } from "crypto";
import { db, workspaces, eq } from "@easymarker/db";

export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export async function getWorkspaceFromApiKey(request: Request) {
  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;

  const key = auth.slice("Bearer ".length).trim();
  if (!key) return null;

  const hash = hashApiKey(key);
  const workspace = await db.query.workspaces.findFirst({ where: eq(workspaces.apiKeyHash, hash) });
  return workspace ?? null;
}
