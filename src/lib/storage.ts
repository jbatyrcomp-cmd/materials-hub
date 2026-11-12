import fs from "node:fs/promises";
import path from "node:path";
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export type StorageProvider = "local" | "s3";

export function getStorageProvider(): StorageProvider {
  return process.env.STORAGE_PROVIDER === "s3" ? "s3" : "local";
}

export function getMaxUploadBytes(): number {
  const mb = Number(process.env.MAX_UPLOAD_SIZE_MB ?? "50");
  return (Number.isFinite(mb) && mb > 0 ? mb : 50) * 1024 * 1024;
}

export function sanitizeFileName(name: string): string {
  const base = path.basename(name || "file");
  const cleaned = base.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_{2,}/g, "_");
  return cleaned.slice(0, 120) || "file";
}

export function buildStorageKey(
  materialId: string,
  versionNumber: number,
  originalName: string
): string {
  const safeName = sanitizeFileName(originalName);
  return `materials/${materialId}/v${versionNumber}/${Date.now()}-${safeName}`;
}

export function isInlinePreviewableMime(mimeType: string | null | undefined): boolean {
  if (!mimeType) return false;
  return [
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/webp",
    "image/gif",
  ].includes(mimeType.toLowerCase());
}

function getLocalBaseDir(): string {
  return path.resolve(process.cwd(), process.env.LOCAL_UPLOAD_DIR || "./uploads");
}

function resolveSafeLocalPath(key: string): string {
  const baseDir = getLocalBaseDir();
  const normalizedKey = key.replace(/^\/+/, "");
  const target = path.resolve(baseDir, normalizedKey);
  const rel = path.relative(baseDir, target);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new Error("Invalid storage key path");
  }
  return target;
}

function createS3Client(): { client: S3Client; bucket: string } {
  const bucket = process.env.S3_BUCKET;
  const endpoint = process.env.S3_ENDPOINT;
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;

  if (!bucket || !accessKeyId || !secretAccessKey) {
    throw new Error("Missing S3/R2 configuration environment variables");
  }

  const client = new S3Client({
    region: process.env.S3_REGION || "auto",
    endpoint: endpoint || undefined,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
    forcePathStyle: Boolean(endpoint),
  });

  return { client, bucket };
}

export async function createPresignedUploadUrl(
  key: string,
  mimeType: string
): Promise<string> {
  const { client, bucket } = createS3Client();
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: mimeType || "application/octet-stream",
  });
  return getSignedUrl(client, command, { expiresIn: 300 });
}

export async function saveUploadedFile(
  key: string,
  data: Buffer,
  mimeType: string
): Promise<void> {
  if (getStorageProvider() === "s3") {
    const { client, bucket } = createS3Client();
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: data,
        ContentType: mimeType || "application/octet-stream",
      })
    );
    return;
  }

  const target = resolveSafeLocalPath(key);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, data);
}

export async function getFileStreamOrRedirectUrl(
  key: string,
  fileName: string,
  mimeType: string | null | undefined,
  inline: boolean
): Promise<{ redirectUrl?: string; buffer?: Buffer }> {
  const dispositionType =
    inline && isInlinePreviewableMime(mimeType) ? "inline" : "attachment";
  const encodedName = encodeURIComponent(fileName || "download");

  if (getStorageProvider() === "s3") {
    const { client, bucket } = createS3Client();
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
      ResponseContentDisposition: `${dispositionType}; filename*=UTF-8''${encodedName}`,
      ResponseContentType: mimeType || "application/octet-stream",
    });
    const redirectUrl = await getSignedUrl(client, command, { expiresIn: 300 });
    return { redirectUrl };
  }

  const target = resolveSafeLocalPath(key);
  const buffer = await fs.readFile(target);
  return { buffer };
}
