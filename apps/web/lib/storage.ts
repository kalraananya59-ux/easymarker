import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} environment variable is required`);
  return value;
}

const bucket = requiredEnv("STORAGE_BUCKET");

const s3 = new S3Client({
  endpoint: requiredEnv("STORAGE_ENDPOINT"),
  region: "auto",
  credentials: {
    accessKeyId: requiredEnv("STORAGE_ACCESS_KEY_ID"),
    secretAccessKey: requiredEnv("STORAGE_SECRET_ACCESS_KEY"),
  },
  forcePathStyle: process.env["STORAGE_FORCE_PATH_STYLE"] === "true",
});

const SIGNED_URL_EXPIRY_SECONDS = 24 * 60 * 60;

export async function uploadObject(key: string, body: Buffer, contentType: string): Promise<void> {
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
}

export async function getSignedDownloadUrl(key: string): Promise<string> {
  return getSignedUrl(s3, new GetObjectCommand({ Bucket: bucket, Key: key }), {
    expiresIn: SIGNED_URL_EXPIRY_SECONDS,
  });
}
