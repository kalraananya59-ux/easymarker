import { fileTypeFromBuffer } from "file-type";
import type { ProjectType } from "@easymarker/shared";

export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

const ALLOWED_MIME_TO_PROJECT_TYPE: Record<string, ProjectType> = {
  "image/png": "image",
  "image/jpeg": "image",
  "image/webp": "image",
  "image/gif": "image",
  "application/pdf": "pdf",
};

export type FileValidationResult =
  | { ok: true; mime: string; projectType: ProjectType }
  | { ok: false; code: string; message: string };

export async function validateUploadedFile(buffer: Buffer): Promise<FileValidationResult> {
  if (buffer.length === 0) {
    return { ok: false, code: "EMPTY_FILE", message: "That file is empty." };
  }
  if (buffer.length > MAX_UPLOAD_BYTES) {
    return {
      ok: false,
      code: "FILE_TOO_LARGE",
      message: "Files must be 50 MB or smaller.",
    };
  }

  const detected = await fileTypeFromBuffer(buffer);
  if (!detected) {
    return {
      ok: false,
      code: "UNSUPPORTED_TYPE",
      message: "We couldn't recognize that file type. Supported: PNG, JPG, WebP, GIF, PDF.",
    };
  }

  const projectType = ALLOWED_MIME_TO_PROJECT_TYPE[detected.mime];
  if (!projectType) {
    return {
      ok: false,
      code: "UNSUPPORTED_TYPE",
      message: "Unsupported file type. Supported: PNG, JPG, WebP, GIF, PDF.",
    };
  }

  return { ok: true, mime: detected.mime, projectType };
}
