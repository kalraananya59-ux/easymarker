import { UTApi } from "uploadthing/server";

// Lazily constructed — building at module scope would run at Next.js's
// "collecting page data" build step (which imports every route module) and
// fail without UPLOADTHING_TOKEN even being needed yet. Every other external
// client in this app (Paddle, Resend) already follows this pattern.
let utapi: UTApi | null = null;

function getUtapi(): UTApi {
  if (!process.env["UPLOADTHING_TOKEN"]) {
    throw new Error("UPLOADTHING_TOKEN environment variable is required");
  }
  utapi ??= new UTApi();
  return utapi;
}

// Returns the file's permanent public URL — UploadThing serves uploaded
// files at a stable URL by default (public-read ACL), so there's no signing
// step; the returned URL is what gets stored as the project's assetPath.
export async function uploadObject(key: string, body: Buffer, contentType: string): Promise<string> {
  const file = new File([new Uint8Array(body)], key, { type: contentType });
  const response = await getUtapi().uploadFiles(file);

  if (response.error) {
    throw new Error(`UploadThing upload failed: ${response.error.message}`);
  }

  return response.data.ufsUrl;
}
