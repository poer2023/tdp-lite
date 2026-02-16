import {
  S3Client,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { nanoid } from "nanoid";

type R2Config = {
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  publicUrl: string;
};

let cachedClient: S3Client | null = null;
let cachedClientSignature = "";

function firstDefined(...values: Array<string | undefined>): string | undefined {
  for (const value of values) {
    if (value && value.trim().length > 0) {
      return value.trim();
    }
  }
  return undefined;
}

function readR2Config(): R2Config {
  const endpoint = firstDefined(
    process.env.S3_ENDPOINT,
    process.env.CLOUDFLARE_R2_ENDPOINT,
    process.env.R2_ACCOUNT_ID
      ? `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
      : undefined
  );
  const region = firstDefined(process.env.S3_REGION) || "auto";
  const accessKeyId = firstDefined(
    process.env.S3_ACCESS_KEY_ID,
    process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
    process.env.R2_ACCESS_KEY_ID
  );
  const secretAccessKey = firstDefined(
    process.env.S3_SECRET_ACCESS_KEY,
    process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
    process.env.R2_SECRET_ACCESS_KEY
  );
  const bucketName = firstDefined(
    process.env.S3_BUCKET,
    process.env.CLOUDFLARE_R2_BUCKET,
    process.env.R2_BUCKET_NAME
  );
  const publicUrl = firstDefined(
    process.env.S3_CDN_URL,
    process.env.S3_PUBLIC_BASE_URL,
    process.env.R2_PUBLIC_URL,
    process.env.NEXT_PUBLIC_R2_CDN_DOMAIN
  );

  const missing: string[] = [];
  if (!endpoint) missing.push("S3_ENDPOINT/CLOUDFLARE_R2_ENDPOINT");
  if (!accessKeyId) {
    missing.push("S3_ACCESS_KEY_ID/CLOUDFLARE_R2_ACCESS_KEY_ID");
  }
  if (!secretAccessKey) {
    missing.push("S3_SECRET_ACCESS_KEY/CLOUDFLARE_R2_SECRET_ACCESS_KEY");
  }
  if (!bucketName) missing.push("S3_BUCKET/CLOUDFLARE_R2_BUCKET");
  if (!publicUrl) missing.push("S3_CDN_URL/R2_PUBLIC_URL");

  if (missing.length > 0) {
    throw new Error(`R2 configuration is incomplete. Missing: ${missing.join(", ")}`);
  }

  return {
    endpoint: endpoint!,
    region,
    accessKeyId: accessKeyId!,
    secretAccessKey: secretAccessKey!,
    bucketName: bucketName!,
    publicUrl: publicUrl!.replace(/\/$/, ""),
  };
}

function getClient(config: R2Config): S3Client {
  const signature = `${config.endpoint}|${config.accessKeyId}|${config.secretAccessKey}`;

  if (!cachedClient || cachedClientSignature !== signature) {
    cachedClient = new S3Client({
      region: config.region,
      endpoint: config.endpoint,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
    cachedClientSignature = signature;
  }

  return cachedClient;
}

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
    heic: "image/heic",
    heif: "image/heif",
    mp4: "video/mp4",
    webm: "video/webm",
    mov: "video/quicktime",
    m4v: "video/x-m4v",
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
  const config = readR2Config();
  const s3Client = getClient(config);
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
      Bucket: config.bucketName,
      Key: uniqueFilename,
      Body: body,
      ContentType: contentType,
    })
  );

  return `${config.publicUrl}/${uniqueFilename}`;
}
