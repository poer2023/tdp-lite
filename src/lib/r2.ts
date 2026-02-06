import {
  S3Client,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { nanoid } from "nanoid";

const s3Client = new S3Client({
  region: "auto",
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
  },
});

const BUCKET_NAME = process.env.CLOUDFLARE_R2_BUCKET || "tdp-images";
const PUBLIC_URL = process.env.R2_PUBLIC_URL!;

/**
 * Get MIME type from filename extension
 */
function getMimeType(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  const mimeTypes: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    avif: "image/avif",
    svg: "image/svg+xml",
  };
  return mimeTypes[ext || ""] || "application/octet-stream";
}

/**
 * Generate a unique filename with date-based path
 */
function generateUniqueFilename(originalFilename: string): string {
  const ext = originalFilename.split(".").pop() || "jpg";
  const id = nanoid(12);
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "/");
  return `${date}/${id}.${ext}`;
}

/**
 * Upload an image to Cloudflare R2
 * @param file - File object or Buffer to upload
 * @param filename - Original filename (used for extension and MIME type)
 * @returns Public URL of the uploaded image
 */
export async function uploadImage(
  file: File | Buffer,
  filename: string
): Promise<string> {
  const uniqueFilename = generateUniqueFilename(filename);
  const contentType = getMimeType(filename);

  // Convert File to Buffer if needed
  let body: Buffer;
  if (Buffer.isBuffer(file)) {
    body = file;
  } else {
    // file is File type
    const arrayBuffer = await (file as File).arrayBuffer();
    body = Buffer.from(arrayBuffer);
  }

  await s3Client.send(
    new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: uniqueFilename,
      Body: body,
      ContentType: contentType,
    })
  );

  return `${PUBLIC_URL}/${uniqueFilename}`;
}
