import { randomUUID } from "node:crypto";
import {
  mediaUploadResponseSchema,
  previewSessionResponseSchema,
  publishResultSchema,
  type PreviewSessionRequest,
  type PublishRequest,
} from "@/lib/contracts";
import { buildTdpSignature, sha256Hex } from "@/lib/signature";

export class SiteClientError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "SiteClientError";
  }
}

type HttpMethod = "POST" | "PATCH" | "DELETE";

type TargetConfig = {
  baseUrl: string;
  keyId: string;
  keySecret: string;
};

function getTargetConfig(): TargetConfig {
  const baseUrl = process.env.PUBLISH_TARGET_BASE_URL?.replace(/\/$/, "");
  const keyId =
    process.env.TDP_INTERNAL_KEY_ID || process.env.PUBLISHER_KEY_ID;
  const keySecret =
    process.env.TDP_INTERNAL_KEY_SECRET || process.env.PUBLISHER_KEY_SECRET;

  if (!baseUrl || !keyId || !keySecret) {
    throw new Error(
      "Missing target env. Required: PUBLISH_TARGET_BASE_URL + (TDP_INTERNAL_KEY_ID/TDP_INTERNAL_KEY_SECRET or PUBLISHER_KEY_ID/PUBLISHER_KEY_SECRET)."
    );
  }

  return { baseUrl, keyId, keySecret };
}

function asObject(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {};
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" ? value : null;
}

function parseIsoDate(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString();
}

function extractErrorMessage(text: string): string {
  if (!text.trim()) return "Target request failed";

  try {
    const json = JSON.parse(text) as unknown;
    const payload = asObject(json);
    const errorField = payload.error;

    if (typeof errorField === "string" && errorField.trim()) {
      return errorField;
    }
    if (typeof payload.message === "string" && payload.message.trim()) {
      return payload.message;
    }
    const errorObj = asObject(errorField);
    if (typeof errorObj.message === "string" && errorObj.message.trim()) {
      return errorObj.message;
    }
  } catch {
    // keep raw text fallback
  }

  return text;
}

function canonicalPathAndQuery(pathWithQuery: string) {
  const url = new URL(pathWithQuery, "http://local");
  return {
    path: url.pathname,
    query: url.search.startsWith("?") ? url.search.slice(1) : "",
  };
}

async function signedFetch(params: {
  path: string;
  method: HttpMethod;
  body: Uint8Array;
  contentType: string;
  headers?: Record<string, string>;
  idempotencyKey?: string;
}): Promise<unknown> {
  const { baseUrl, keyId, keySecret } = getTargetConfig();
  const { path, query } = canonicalPathAndQuery(params.path);
  const timestamp = Date.now().toString();
  const nonce = randomUUID();
  const bodyHash = sha256Hex(params.body);
  const signature = buildTdpSignature({
    keySecret,
    method: params.method,
    path,
    query,
    timestamp,
    nonce,
    bodyHash,
  });

  const response = await fetch(`${baseUrl}${params.path}`, {
    method: params.method,
    headers: {
      Accept: "application/json",
      "content-type": params.contentType,
      "X-TDP-Key-Id": keyId,
      "X-TDP-Timestamp": timestamp,
      "X-TDP-Nonce": nonce,
      "X-TDP-Signature": signature,
      ...(params.idempotencyKey
        ? { "Idempotency-Key": params.idempotencyKey }
        : {}),
      ...(params.headers || {}),
    },
    body: Buffer.from(params.body),
    cache: "no-store",
  });

  const text = await response.text();
  if (!response.ok) {
    throw new SiteClientError(response.status, extractErrorMessage(text));
  }

  if (!text.trim()) {
    return {};
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new SiteClientError(
      502,
      "Target returned non-JSON response for JSON API."
    );
  }
}

async function signedJson(params: {
  path: string;
  method?: HttpMethod;
  body: Record<string, unknown>;
  idempotencyKey?: string;
}): Promise<unknown> {
  const raw = JSON.stringify(params.body);
  return signedFetch({
    path: params.path,
    method: params.method || "POST",
    body: new TextEncoder().encode(raw),
    contentType: "application/json",
    idempotencyKey: params.idempotencyKey,
  });
}

function normalizeLocale(value: string): "en" | "zh" {
  return value === "zh" ? "zh" : "en";
}

function toLocalizedPath(locale: "en" | "zh", path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return locale === "zh" ? normalizedPath : `/${locale}${normalizedPath}`;
}

function resolvePublishedAt(item: Record<string, unknown>): string {
  const publishedAt = parseIsoDate(item.publishedAt);
  if (publishedAt) {
    return publishedAt;
  }
  const createdAt = parseIsoDate(item.createdAt);
  if (createdAt) {
    return createdAt;
  }
  return new Date().toISOString();
}

function inferMediaKind(mimeType: string): "image" | "video" {
  return mimeType.startsWith("video/") ? "video" : "image";
}

export async function uploadMediaToSite(params: {
  fileBytes: Uint8Array;
  filename: string;
  mimeType: string;
  fileSize: number;
}) {
  const mimeType = params.mimeType || "application/octet-stream";
  const fileHash = sha256Hex(params.fileBytes);

  const uploadInit = await signedJson({
    path: "/v1/media/uploads",
    body: {
      filename: params.filename,
      mimeType,
      size: params.fileSize,
      sha256: fileHash,
    },
    idempotencyKey: randomUUID(),
  });

  const uploadInitObj = asObject(uploadInit);
  const uploadId = asString(uploadInitObj.uploadId);
  if (!uploadId) {
    throw new SiteClientError(502, "Target response missing uploadId.");
  }

  const uploadUrl = asString(uploadInitObj.uploadUrl);
  if (uploadUrl) {
    const uploadMethod = asString(uploadInitObj.uploadMethod) || "PUT";
    const uploadHeaders = asObject(uploadInitObj.uploadHeaders);
    const putHeaders: Record<string, string> = {};
    for (const [key, value] of Object.entries(uploadHeaders)) {
      if (typeof value === "string") {
        putHeaders[key] = value;
      }
    }
    if (!putHeaders["content-type"] && !putHeaders["Content-Type"]) {
      putHeaders["content-type"] = mimeType;
    }

    const uploadResponse = await fetch(uploadUrl, {
      method: uploadMethod,
      headers: putHeaders,
      body: Buffer.from(params.fileBytes),
      cache: "no-store",
    });

    if (!uploadResponse.ok) {
      throw new SiteClientError(
        uploadResponse.status,
        `Upload to storage failed (${uploadResponse.status})`
      );
    }
  }

  const complete = await signedJson({
    path: `/v1/media/uploads/${encodeURIComponent(uploadId)}/complete`,
    body: {
      size: params.fileSize,
      sha256: fileHash,
    },
    idempotencyKey: randomUUID(),
  });

  const completeObj = asObject(complete);
  const asset = asObject(completeObj.asset);
  const url = asString(asset.url);
  if (!url) {
    throw new SiteClientError(502, "Target response missing asset.url.");
  }
  const responseMimeType = asString(asset.mime) || mimeType;
  const responseSize = asNumber(asset.size) ?? params.fileSize;

  return mediaUploadResponseSchema.parse({
    url,
    mimeType: responseMimeType,
    size: responseSize,
    kind: inferMediaKind(responseMimeType),
  });
}

export async function createPreviewSessionOnSite(body: PreviewSessionRequest) {
  const data = await signedJson({
    path: "/v1/previews/sessions",
    body: {
      sessionId: body.sessionId,
      payload: body.payload,
    },
    idempotencyKey: randomUUID(),
  });

  const normalized = asObject(data);
  const expiresAt = asString(normalized.expiresAt);
  if (expiresAt) {
    const parsed = new Date(expiresAt);
    if (!Number.isNaN(parsed.getTime())) {
      normalized.expiresAt = parsed.toISOString();
    }
  }

  return previewSessionResponseSchema.parse(normalized);
}

async function publishMoment(
  request: PublishRequest
): Promise<ReturnType<typeof publishResultSchema.parse>> {
  if (request.payload.kind !== "moment") {
    throw new SiteClientError(400, "Invalid publish payload kind for moment.");
  }

  const draft = request.payload.data;
  const data = await signedJson({
    path: "/v1/moments",
    body: {
      content: draft.content,
      locale: draft.locale,
      visibility: draft.visibility,
      location: draft.locationName ? { name: draft.locationName } : undefined,
      media: draft.media,
      status: "published",
    },
    idempotencyKey: request.idempotencyKey || randomUUID(),
  });

  const item = asObject(asObject(data).item);
  const id = asString(item.id);
  if (!id) {
    throw new SiteClientError(502, "Target response missing moment id.");
  }
  const locale = normalizeLocale(asString(item.locale) || draft.locale);

  return publishResultSchema.parse({
    kind: "moment",
    id,
    url: toLocalizedPath(locale, `/moments/${id}`),
    publishedAt: resolvePublishedAt(item),
  });
}

async function publishPost(
  request: PublishRequest
): Promise<ReturnType<typeof publishResultSchema.parse>> {
  if (request.payload.kind !== "post") {
    throw new SiteClientError(400, "Invalid publish payload kind for post.");
  }

  const draft = request.payload.data;
  const data = await signedJson({
    path: "/v1/posts",
    body: {
      title: draft.title,
      content: draft.content,
      excerpt: draft.excerpt,
      locale: draft.locale,
      tags: draft.tags,
      status: draft.status,
      coverUrl: draft.coverUrl,
    },
    idempotencyKey: request.idempotencyKey || randomUUID(),
  });

  const item = asObject(asObject(data).item);
  const id = asString(item.id);
  const slug = asString(item.slug);
  if (!id || !slug) {
    throw new SiteClientError(502, "Target response missing post id or slug.");
  }
  const locale = normalizeLocale(asString(item.locale) || draft.locale);

  return publishResultSchema.parse({
    kind: "post",
    id,
    url: toLocalizedPath(locale, `/posts/${slug}`),
    publishedAt: resolvePublishedAt(item),
  });
}

async function publishGallery(
  request: PublishRequest
): Promise<ReturnType<typeof publishResultSchema.parse>> {
  if (request.payload.kind !== "gallery") {
    throw new SiteClientError(400, "Invalid publish payload kind for gallery.");
  }

  const draft = request.payload.data;
  const data = await signedJson({
    path: "/v1/gallery-items",
    body: {
      locale: draft.locale,
      fileUrl: draft.fileUrl,
      thumbUrl: draft.thumbUrl,
      title: draft.title,
      width: draft.width,
      height: draft.height,
      capturedAt: draft.capturedAt,
      camera: draft.camera,
      lens: draft.lens,
      focalLength: draft.focalLength,
      aperture: draft.aperture,
      iso: draft.iso,
      latitude: draft.latitude,
      longitude: draft.longitude,
      isLivePhoto: draft.isLivePhoto,
      videoUrl: draft.videoUrl,
      status: "published",
    },
    idempotencyKey: request.idempotencyKey || randomUUID(),
  });

  const item = asObject(asObject(data).item);
  const id = asString(item.id);
  if (!id) {
    throw new SiteClientError(502, "Target response missing gallery id.");
  }
  const locale = normalizeLocale(asString(item.locale) || draft.locale);

  return publishResultSchema.parse({
    kind: "gallery",
    id,
    url: toLocalizedPath(locale, "/gallery"),
    publishedAt: resolvePublishedAt(item),
  });
}

export async function publishToSite(body: PublishRequest) {
  if (body.payload.kind === "moment") {
    return publishMoment(body);
  }
  if (body.payload.kind === "post") {
    return publishPost(body);
  }
  return publishGallery(body);
}
