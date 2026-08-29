import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} environment variable is required`);
  return value;
}

// Lazily constructed — building at module scope would run at Next.js's
// "collecting page data" build step (which imports every route module) and
// fail without storage credentials even being needed yet. Every other
// external client in this app (Paddle, Resend) already follows this pattern.
let s3Client: S3Client | null = null;

function getS3(): S3Client {
  s3Client ??= new S3Client({
    endpoint: requiredEnv("STORAGE_ENDPOINT"),
    region: "auto",
    credentials: {
      accessKeyId: requiredEnv("STORAGE_ACCESS_KEY_ID"),
      secretAccessKey: requiredEnv("STORAGE_SECRET_ACCESS_KEY"),
    },
    forcePathStyle: process.env["STORAGE_FORCE_PATH_STYLE"] === "true",
  });
  return s3Client;
}

const SIGNED_URL_EXPIRY_SECONDS = 24 * 60 * 60;

export async function uploadObject(key: string, body: Buffer, contentType: string): Promise<void> {
  await getS3().send(
    new PutObjectCommand({
      Bucket: requiredEnv("STORAGE_BUCKET"),
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
}

export async function getSignedDownloadUrl(key: string): Promise<string> {
  return getSignedUrl(getS3(), new GetObjectCommand({ Bucket: requiredEnv("STORAGE_BUCKET"), Key: key }), {
    expiresIn: SIGNED_URL_EXPIRY_SECONDS,
  });
}
