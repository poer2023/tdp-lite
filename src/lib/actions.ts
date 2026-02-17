"use server";

import { createHash, createHmac, randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { auth } from "./auth";

type ContentType = "moment" | "post" | "gallery";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

function apiConfig() {
  return {
    baseUrl: (process.env.TDP_API_BASE_URL || "http://localhost:8080").replace(/\/$/, ""),
    keyId: requireEnv("TDP_INTERNAL_KEY_ID"),
    keySecret: requireEnv("TDP_INTERNAL_KEY_SECRET"),
  };
}

function sha256Hex(input: Buffer | Uint8Array | string): string {
  return createHash("sha256").update(input).digest("hex");
}

function canonicalQuery(raw: string): string {
  if (!raw) return "";
  return raw.split("&").filter(Boolean).sort().join("&");
}

function buildSignature(params: {
  method: string;
  path: string;
  query: string;
  timestamp: string;
  nonce: string;
  bodyHash: string;
  secret: string;
}): string {
  const canonical = [
    params.method.toUpperCase(),
    params.path,
    canonicalQuery(params.query),
    params.timestamp,
    params.nonce,
    params.bodyHash,
  ].join("\n");

  return createHmac("sha256", params.secret).update(canonical).digest("hex");
}

async function signedRequest(pathWithQuery: string, init: {
  method: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  rawBody?: Uint8Array;
  contentType?: string;
  idempotencyKey?: string;
  extraHeaders?: Record<string, string>;
}): Promise<Response> {
  const cfg = apiConfig();
  const [path, query = ""] = pathWithQuery.split("?");

  let bodyBuffer = Buffer.alloc(0);
  let body: BodyInit | undefined;
  let contentType = init.contentType;

  if (init.rawBody) {
    bodyBuffer = Buffer.from(init.rawBody);
    body = init.rawBody as unknown as BodyInit;
  } else if (init.body !== undefined) {
    const raw = JSON.stringify(init.body);
    bodyBuffer = Buffer.from(raw);
    body = raw;
    contentType = contentType || "application/json";
  }

  const timestamp = String(Date.now());
  const nonce = randomUUID();
  const signature = buildSignature({
    method: init.method,
    path,
    query,
    timestamp,
    nonce,
    bodyHash: sha256Hex(bodyBuffer),
    secret: cfg.keySecret,
  });

  const headers: Record<string, string> = {
    "X-TDP-Key-Id": cfg.keyId,
    "X-TDP-Timestamp": timestamp,
    "X-TDP-Nonce": nonce,
    "X-TDP-Signature": signature,
    Accept: "application/json",
    ...(init.extraHeaders || {}),
  };

  if (contentType && body) {
    headers["Content-Type"] = contentType;
  }
  if (init.idempotencyKey) {
    headers["Idempotency-Key"] = init.idempotencyKey;
  }

  const url = `${cfg.baseUrl}${pathWithQuery}`;

  try {
    return await fetch(url, {
      method: init.method,
      headers,
      body,
      cache: "no-store",
    });
  } catch (error) {
    const reason =
      error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    throw new Error(
      `operation api network error: ${url}. ${reason}. Hint: ensure Go backend is running and TDP_API_BASE_URL points to it.`
    );
  }
}

type JsonObject = Record<string, unknown>;

function asObject(value: unknown): JsonObject {
  return typeof value === "object" && value !== null
    ? (value as JsonObject)
    : {};
}

async function parseResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  let parsed: unknown = {};
  try {
    parsed = text ? JSON.parse(text) : {};
  } catch {
    parsed = {};
  }

  if (!response.ok) {
    const parsedObject = asObject(parsed);
    const errorObject = asObject(parsedObject.error);
    const message =
      (typeof errorObject.message === "string" ? errorObject.message : undefined) ||
      response.statusText ||
      "request failed";
    throw new Error(message);
  }

  return parsed as T;
}

async function requireAuth() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }
  return session.user;
}

async function uploadFile(file: File): Promise<{ url: string; mimeType: string; id: string }> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const hash = sha256Hex(bytes);

  const createUploadRes = await signedRequest("/v1/media/uploads", {
    method: "POST",
    body: {
      filename: file.name,
      mimeType: file.type || "application/octet-stream",
      size: bytes.length,
      sha256: hash,
    },
    idempotencyKey: randomUUID(),
  });

  const createUploadData = await parseResponse<{
    uploadId: string;
    uploadUrl?: string;
    uploadMethod?: string;
    uploadHeaders?: Record<string, string>;
  }>(createUploadRes);

  if (createUploadData.uploadUrl) {
    const uploadRes = await fetch(createUploadData.uploadUrl, {
      method: createUploadData.uploadMethod || "PUT",
      headers: createUploadData.uploadHeaders || {
        "Content-Type": file.type || "application/octet-stream",
      },
      body: bytes,
    });

    if (!uploadRes.ok) {
      throw new Error(`File upload failed: ${uploadRes.statusText}`);
    }
  }

  const completeRes = await signedRequest(
    `/v1/media/uploads/${createUploadData.uploadId}/complete`,
    {
      method: "POST",
      body: {
        size: bytes.length,
        sha256: hash,
      },
      idempotencyKey: randomUUID(),
    }
  );

  const completeData = await parseResponse<{ asset: { id: string; url: string; mime: string } }>(
    completeRes
  );

  return {
    id: completeData.asset.id,
    url: completeData.asset.url,
    mimeType: completeData.asset.mime,
  };
}

export async function createMoment(formData: FormData) {
  await requireAuth();

  const content = String(formData.get("content") || "").trim();
  if (!content) {
    throw new Error("Content is required");
  }

  const locale = formData.get("locale") === "zh" ? "zh" : "en";
  const visibility = formData.get("visibility") === "private" ? "private" : "public";
  const locationName = String(formData.get("locationName") || "").trim();

  const files = formData.getAll("images") as File[];
  const media = [] as Array<{ type: "image" | "video" | "audio"; url: string }>;

  for (const file of files) {
    if (file && file.size > 0) {
      const upload = await uploadFile(file);
      media.push({
        type: upload.mimeType.startsWith("video/")
          ? "video"
          : upload.mimeType.startsWith("audio/")
            ? "audio"
            : "image",
        url: upload.url,
      });
    }
  }

  const response = await signedRequest("/v1/moments", {
    method: "POST",
    body: {
      content,
      locale,
      visibility,
      media,
      location: locationName ? { name: locationName } : undefined,
      status: "published",
    },
    idempotencyKey: randomUUID(),
  });

  const data = await parseResponse<{ item: unknown }>(response);

  revalidatePath("/");
  revalidatePath("/admin");
  return data.item;
}

export async function createPost(formData: FormData) {
  await requireAuth();

  const title = String(formData.get("title") || "").trim();
  const content = String(formData.get("content") || "").trim();
  if (!title || !content) {
    throw new Error("Title and content are required");
  }

  const locale = formData.get("locale") === "zh" ? "zh" : "en";
  const status = formData.get("status") === "published" ? "published" : "draft";
  const excerpt = String(formData.get("excerpt") || "").trim();
  const tags = String(formData.get("tags") || "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  const coverFile = formData.get("cover") as File | null;
  let coverUrl: string | undefined;
  if (coverFile && coverFile.size > 0) {
    const upload = await uploadFile(coverFile);
    coverUrl = upload.url;
  }

  const response = await signedRequest("/v1/posts", {
    method: "POST",
    body: {
      title,
      content,
      locale,
      status,
      excerpt: excerpt || undefined,
      tags,
      coverUrl,
    },
    idempotencyKey: randomUUID(),
  });

  const data = await parseResponse<{ item: unknown }>(response);

  revalidatePath("/");
  revalidatePath("/admin");
  return data.item;
}

export async function createGallery(formData: FormData) {
  await requireAuth();

  const imageFile = formData.get("image") as File;
  if (!imageFile || imageFile.size === 0) {
    throw new Error("Image is required");
  }

  const title = String(formData.get("title") || "").trim();
  const locale = formData.get("locale") === "zh" ? "zh" : "en";

  const upload = await uploadFile(imageFile);

  const response = await signedRequest("/v1/gallery-items", {
    method: "POST",
    body: {
      locale,
      fileUrl: upload.url,
      title: title || undefined,
      status: "published",
    },
    idempotencyKey: randomUUID(),
  });

  const data = await parseResponse<{ item: unknown }>(response);

  revalidatePath("/");
  revalidatePath("/admin");
  return data.item;
}

export async function deleteContent(type: ContentType, id: string) {
  await requireAuth();

  if (!id) {
    throw new Error("ID is required");
  }

  const pathMap: Record<ContentType, string> = {
    moment: "moments",
    post: "posts",
    gallery: "gallery-items",
  };

  const response = await signedRequest(`/v1/${pathMap[type]}/${id}`, {
    method: "DELETE",
  });
  await parseResponse<{ ok: boolean }>(response);

  revalidatePath("/");
  revalidatePath("/admin");
  return { success: true };
}
