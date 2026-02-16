import type { FeedItem } from "@/components/bento/types";
import type { GalleryItem, Moment, Post } from "@/lib/schema";

/**
 * @deprecated Frontend display pages should read from DB via `src/lib/content/read.ts`.
 * This module is retained for compatibility paths that still need Go public APIs.
 */
export type Locale = "en" | "zh";

type RawObject = Record<string, unknown>;

function asObject(value: unknown): RawObject {
  return typeof value === "object" && value !== null
    ? (value as RawObject)
    : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asString(value: unknown, fallback: string = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asNullableString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function asNumberOrNull(value: unknown): number | null {
  return typeof value === "number" ? value : null;
}

function asBoolean(value: unknown, fallback: boolean = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function resolveApiBaseUrl(): string {
  const explicitBase =
    process.env.TDP_API_BASE_URL || process.env.NEXT_PUBLIC_TDP_API_BASE_URL;
  if (explicitBase && explicitBase.trim().length > 0) {
    return explicitBase.replace(/\/$/, "");
  }

  const apiAddr = process.env.TDP_API_ADDR?.trim();
  if (apiAddr) {
    // Backend commonly exposes addr as ":8080".
    if (/^:\d+$/.test(apiAddr)) {
      return `http://localhost${apiAddr}`;
    }
    if (/^https?:\/\//.test(apiAddr)) {
      return apiAddr.replace(/\/$/, "");
    }
  }

  return "http://localhost:8080";
}

const API_BASE_URL = resolveApiBaseUrl();

async function apiGet<T>(path: string, revalidateSeconds: number = 30): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  let response: Response;
  try {
    response = await fetch(url, {
      next: { revalidate: revalidateSeconds },
      headers: {
        Accept: "application/json",
      },
    });
  } catch (error) {
    const reason =
      error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    throw new Error(
      `public api network error: ${url}. ${reason}. Hint: run \`pnpm backend:api\` (or \`pnpm dev:all\`), ensure TDP_API_BASE_URL/NEXT_PUBLIC_TDP_API_BASE_URL points to backend, and restart Next dev if env changed.`
    );
  }

  if (!response.ok) {
    const contentType = response.headers.get("content-type") || "";
    const body = await response.text();
    const shortBody = body.length > 400 ? `${body.slice(0, 400)}...` : body;
    const hint = contentType.includes("text/html")
      ? " Hint: received HTML (likely Next.js) instead of API JSON. Check TDP_API_BASE_URL / NEXT_PUBLIC_TDP_API_BASE_URL."
      : "";
    throw new Error(
      `public api request failed: ${response.status} ${path} via ${url}. body=${shortBody}${hint}`
    );
  }

  return response.json() as Promise<T>;
}

function toDate(value: unknown): Date {
  if (value instanceof Date) return value;
  if (typeof value === "string" && value.length > 0) {
    return new Date(value);
  }
  return new Date(0);
}

function toPost(raw: unknown): Post {
  const obj = asObject(raw);
  return {
    id: asString(obj.id),
    slug: asString(obj.slug),
    locale: obj.locale === "zh" ? "zh" : "en",
    title: asString(obj.title),
    excerpt: asNullableString(obj.excerpt),
    content: asString(obj.content),
    coverUrl: asNullableString(obj.coverUrl),
    tags: asArray(obj.tags).map((tag) => asString(tag)).filter(Boolean),
    status: obj.status === "published" ? "published" : "draft",
    publishedAt: obj.publishedAt ? toDate(obj.publishedAt) : null,
    createdAt: toDate(obj.createdAt),
    updatedAt: toDate(obj.updatedAt),
  };
}

function toMoment(raw: unknown): Moment {
  const obj = asObject(raw);
  const media = asArray(obj.media).map((itemRaw) => {
    const item = asObject(itemRaw);
    const width = asNumberOrNull(item.width);
    const height = asNumberOrNull(item.height);
    const mediaType: "image" | "video" = item.type === "video" ? "video" : "image";

    return {
      type: mediaType,
      url: asString(item.url),
      width: width === null ? undefined : width,
      height: height === null ? undefined : height,
      thumbnailUrl: asNullableString(item.thumbnailUrl) ?? undefined,
    };
  });

  const locationRaw = asObject(obj.location);
  const location = locationRaw.name
    ? {
        name: asString(locationRaw.name),
        lat: asNumberOrNull(locationRaw.lat) ?? undefined,
        lng: asNumberOrNull(locationRaw.lng) ?? undefined,
      }
    : null;

  return {
    id: asString(obj.id),
    content: asString(obj.content),
    media,
    locale: obj.locale === "zh" ? "zh" : "en",
    visibility: obj.visibility === "private" ? "private" : "public",
    status: asString(obj.status, "published"),
    publishedAt: obj.publishedAt ? toDate(obj.publishedAt) : null,
    location,
    createdAt: toDate(obj.createdAt),
    updatedAt: obj.updatedAt ? toDate(obj.updatedAt) : toDate(obj.createdAt),
    deletedAt: obj.deletedAt ? toDate(obj.deletedAt) : null,
  };
}

function toGalleryItem(raw: unknown): GalleryItem {
  const obj = asObject(raw);
  const width = asNumberOrNull(obj.width);
  const height = asNumberOrNull(obj.height);

  return {
    id: asString(obj.id),
    locale: obj.locale === "zh" ? "zh" : "en",
    fileUrl: asString(obj.fileUrl),
    thumbUrl: asNullableString(obj.thumbUrl),
    title: asNullableString(obj.title),
    width,
    height,
    capturedAt: obj.capturedAt ? toDate(obj.capturedAt) : null,
    camera: asNullableString(obj.camera),
    lens: asNullableString(obj.lens),
    focalLength: asNullableString(obj.focalLength),
    aperture: asNullableString(obj.aperture),
    iso: asNumberOrNull(obj.iso),
    latitude: asNumberOrNull(obj.latitude),
    longitude: asNumberOrNull(obj.longitude),
    isLivePhoto: asBoolean(obj.isLivePhoto),
    videoUrl: asNullableString(obj.videoUrl),
    status: asString(obj.status, "published"),
    publishedAt: obj.publishedAt ? toDate(obj.publishedAt) : null,
    createdAt: toDate(obj.createdAt),
    updatedAt: obj.updatedAt ? toDate(obj.updatedAt) : toDate(obj.createdAt),
    deletedAt: obj.deletedAt ? toDate(obj.deletedAt) : null,
  };
}

export async function fetchPublicFeed(locale: Locale, limit: number = 10): Promise<FeedItem[]> {
  const result = await apiGet<{ items: unknown[] }>(
    `/v1/public/feed?locale=${locale}&limit=${limit}`,
    30
  );

  return result.items
    .map((itemRaw) => {
      const item = asObject(itemRaw);
      if (item.type === "post" && item.post) {
        return { type: "post", ...toPost(item.post) } as FeedItem;
      }
      if (item.type === "moment" && item.moment) {
        return { type: "moment", ...toMoment(item.moment) } as FeedItem;
      }
      if (item.type === "gallery" && item.gallery) {
        return { type: "gallery", ...toGalleryItem(item.gallery) } as FeedItem;
      }
      return null;
    })
    .filter((item): item is FeedItem => item !== null);
}

export async function fetchPublicPosts(locale: Locale): Promise<Post[]> {
  const result = await apiGet<{ items: unknown[] }>(
    `/v1/public/posts?locale=${locale}`,
    30
  );
  return result.items.map(toPost);
}

export async function fetchPublicPost(locale: Locale, slug: string): Promise<Post | null> {
  try {
    const result = await apiGet<{ item: unknown }>(
      `/v1/public/posts/${encodeURIComponent(slug)}?locale=${locale}`,
      30
    );
    return toPost(result.item);
  } catch {
    return null;
  }
}

export async function fetchPublicMoments(locale: Locale): Promise<Moment[]> {
  const result = await apiGet<{ items: unknown[] }>(
    `/v1/public/moments?locale=${locale}`,
    30
  );
  return result.items.map(toMoment);
}

export async function fetchPublicMoment(locale: Locale, id: string): Promise<Moment | null> {
  try {
    const result = await apiGet<{ item: unknown }>(
      `/v1/public/moments/${encodeURIComponent(id)}?locale=${locale}`,
      30
    );
    return toMoment(result.item);
  } catch {
    return null;
  }
}

export async function fetchPublicGallery(locale: Locale): Promise<GalleryItem[]> {
  const result = await apiGet<{ items: unknown[] }>(
    `/v1/public/gallery?locale=${locale}`,
    30
  );
  return result.items.map(toGalleryItem);
}

export async function fetchPublicGalleryItem(
  locale: Locale,
  id: string
): Promise<GalleryItem | null> {
  try {
    const result = await apiGet<{ item: unknown }>(
      `/v1/public/gallery/${encodeURIComponent(id)}?locale=${locale}`,
      30
    );
    return toGalleryItem(result.item);
  } catch {
    return null;
  }
}
