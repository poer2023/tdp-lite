import { promises as fs } from "node:fs";
import path from "node:path";
import type { FeedItem } from "@/components/bento/types";
import type { CardSpan, GalleryItem, Moment, Post } from "@/lib/content/types";

import { type AppLocale } from "@/lib/locale";
import {
  PUBLIC_CACHE_REVALIDATE,
  PUBLIC_CACHE_TAGS,
  publicFeedTags,
  publicGalleryItemTags,
  publicGalleryTags,
  publicMomentTags,
  publicMomentsTags,
  publicPostTags,
  publicPostsTags,
} from "@/lib/publicCache";

export type Locale = AppLocale;
export type PublicPresence = {
  online: boolean;
  status: "online" | "offline" | "unknown";
  city: string | null;
  region: string | null;
  country: string | null;
  countryCode: string | null;
  timezone: string | null;
  source: string | null;
  locationLabel: string;
  lastHeartbeatAt: Date | null;
  updatedAt: Date | null;
  staleAfterSec: number | null;
};

export type PublicProfileTrack = {
  id: string | null;
  name: string;
  artist: string;
  album: string | null;
  artworkUrl: string | null;
  durationMs: number | null;
  url: string | null;
};

export type PublicGithubRecentPush = {
  repo: string;
  commitCount: number;
  createdAt: Date | null;
};

export type PublicMusicTopArtist = {
  name: string;
  count: number;
};

export type PublicProfileRatio = {
  key: string;
  label: string;
  value: number;
};

export type PublicProfileSnapshot = {
  github: {
    username: string | null;
    windowDays: number | null;
    totalCommits: number | null;
    totalPushEvents: number | null;
    heatmapLevels: number[];
    heatmapCounts: number[];
    recentPushes: PublicGithubRecentPush[];
    fetchedAt: Date | null;
  } | null;
  music: {
    provider: string | null;
    storefront: string | null;
    recentTracks: PublicProfileTrack[];
    topArtists: PublicMusicTopArtist[];
    fetchedAt: Date | null;
  } | null;
  derived: {
    ratios: PublicProfileRatio[];
    generatedAt: Date | null;
  } | null;
  sourceStatus: Record<string, unknown> | null;
  syncedAt: Date | null;
  updatedAt: Date | null;
};

type RawObject = Record<string, unknown>;

function asObject(value: unknown): RawObject {
  return typeof value === "object" && value !== null
    ? (value as RawObject)
    : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asNullableObject(value: unknown): RawObject | null {
  return typeof value === "object" && value !== null
    ? (value as RawObject)
    : null;
}

function asString(value: unknown, fallback: string = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asNullableString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function asCardSpan(value: unknown): CardSpan | null {
  switch (value) {
    case "1x1":
    case "1x2":
    case "2x1":
    case "2x2":
      return value;
    default:
      return null;
  }
}

function asNumberOrNull(value: unknown): number | null {
  return typeof value === "number" ? value : null;
}

function asBoolean(value: unknown, fallback: boolean = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function resolveTranslationKey(obj: RawObject): string {
  const candidate =
    asString(obj.translationKey) ||
    asString(obj.translation_key) ||
    asString(obj.id);
  return candidate;
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
const PROFILE_SNAPSHOT_FILE = path.join(process.cwd(), "data", "profile-snapshot.json");
const PROFILE_SNAPSHOT_CACHE_TTL_MS = 30_000;

let lastProfileSnapshotCache:
  | { item: PublicProfileSnapshot; fetchedAt: number }
  | null = null;

interface PublicApiGetOptions {
  revalidateSeconds?: number;
  tags?: string[];
}

async function apiGet<T>(path: string, options: PublicApiGetOptions = {}): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  const { revalidateSeconds = PUBLIC_CACHE_REVALIDATE.contentList, tags } = options;
  let response: Response;
  try {
    response = await fetch(url, {
      next: { revalidate: revalidateSeconds, tags },
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

function parsePublicProfileSnapshot(raw: unknown): PublicProfileSnapshot | null {
  const item = asObject(raw);
  if (Object.keys(item).length === 0) {
    return null;
  }

  const githubObj = asNullableObject(item.github);
  const githubHeatmap = asObject(githubObj?.heatmap);
  const github = githubObj
    ? {
        username: asNullableString(githubObj.username),
        windowDays: asNumberOrNull(githubObj.windowDays),
        totalCommits: asNumberOrNull(githubObj.totalCommits),
        totalPushEvents: asNumberOrNull(githubObj.totalPushEvents),
        heatmapLevels: asArray(githubHeatmap.levels)
          .map((value) => asNumberOrNull(value))
          .filter((value): value is number => value !== null),
        heatmapCounts: asArray(githubHeatmap.counts)
          .map((value) => asNumberOrNull(value))
          .filter((value): value is number => value !== null),
        recentPushes: asArray(githubObj.recentPushes).map((pushRaw) => {
          const push = asObject(pushRaw);
          return {
            repo: asString(push.repo),
            commitCount: asNumberOrNull(push.commitCount) ?? 0,
            createdAt: push.createdAt ? toDate(push.createdAt) : null,
          };
        }),
        fetchedAt: githubObj.fetchedAt ? toDate(githubObj.fetchedAt) : null,
      }
    : null;

  const musicObj = asNullableObject(item.music);
  const music = musicObj
    ? {
        provider: asNullableString(musicObj.provider),
        storefront: asNullableString(musicObj.storefront),
        recentTracks: asArray(musicObj.recentTracks).map((trackRaw) => {
          const track = asObject(trackRaw);
          return {
            id: asNullableString(track.id),
            name: asString(track.name),
            artist: asString(track.artist),
            album: asNullableString(track.album),
            artworkUrl: asNullableString(track.artworkUrl),
            durationMs: asNumberOrNull(track.durationMs),
            url: asNullableString(track.url),
          };
        }),
        topArtists: asArray(musicObj.topArtists).map((artistRaw) => {
          const artist = asObject(artistRaw);
          return {
            name: asString(artist.name),
            count: asNumberOrNull(artist.count) ?? 0,
          };
        }),
        fetchedAt: musicObj.fetchedAt ? toDate(musicObj.fetchedAt) : null,
      }
    : null;

  const derivedObj = asNullableObject(item.derived);
  const derived = derivedObj
    ? {
        ratios: asArray(derivedObj.ratios).map((ratioRaw) => {
          const ratio = asObject(ratioRaw);
          return {
            key: asString(ratio.key),
            label: asString(ratio.label),
            value: asNumberOrNull(ratio.value) ?? 0,
          };
        }),
        generatedAt: derivedObj.generatedAt ? toDate(derivedObj.generatedAt) : null,
      }
    : null;

  return {
    github,
    music,
    derived,
    sourceStatus: asNullableObject(item.sourceStatus),
    syncedAt: item.syncedAt ? toDate(item.syncedAt) : null,
    updatedAt: item.updatedAt ? toDate(item.updatedAt) : null,
  };
}

async function readLocalProfileSnapshot(): Promise<PublicProfileSnapshot | null> {
  try {
    const raw = await fs.readFile(PROFILE_SNAPSHOT_FILE, "utf8");
    const parsed = parsePublicProfileSnapshot(JSON.parse(raw));
    if (parsed) {
      lastProfileSnapshotCache = { item: parsed, fetchedAt: Date.now() };
    }
    return parsed;
  } catch {
    return null;
  }
}

function readCachedProfileSnapshot(): PublicProfileSnapshot | null {
  if (!lastProfileSnapshotCache) {
    return null;
  }

  const age = Date.now() - lastProfileSnapshotCache.fetchedAt;
  if (age > PROFILE_SNAPSHOT_CACHE_TTL_MS) {
    return lastProfileSnapshotCache.item;
  }

  return lastProfileSnapshotCache.item;
}

function toPost(raw: unknown): Post {
  const obj = asObject(raw);
  return {
    id: asString(obj.id),
    translationKey: resolveTranslationKey(obj),
    slug: asString(obj.slug),
    locale: obj.locale === "zh" ? "zh" : "en",
    title: asString(obj.title),
    excerpt: asNullableString(obj.excerpt),
    content: asString(obj.content),
    coverUrl: asNullableString(obj.coverUrl),
    tags: asArray(obj.tags).map((tag) => asString(tag)).filter(Boolean),
    status: obj.status === "published" ? "published" : "draft",
    cardSpan: asCardSpan(obj.cardSpan),
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
      capturedAt: item.capturedAt ? toDate(item.capturedAt) : undefined,
      camera: asNullableString(item.camera) ?? undefined,
      lens: asNullableString(item.lens) ?? undefined,
      focalLength: asNullableString(item.focalLength) ?? undefined,
      aperture: asNullableString(item.aperture) ?? undefined,
      iso: asNumberOrNull(item.iso) ?? undefined,
      latitude: asNumberOrNull(item.latitude) ?? undefined,
      longitude: asNumberOrNull(item.longitude) ?? undefined,
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
    translationKey: resolveTranslationKey(obj),
    content: asString(obj.content),
    media,
    locale: obj.locale === "zh" ? "zh" : "en",
    visibility: obj.visibility === "private" ? "private" : "public",
    status: asString(obj.status, "published"),
    cardSpan: asCardSpan(obj.cardSpan),
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
    translationKey: resolveTranslationKey(obj),
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
    {
      revalidateSeconds: PUBLIC_CACHE_REVALIDATE.feed,
      tags: publicFeedTags(locale),
    }
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
      return null;
    })
    .filter((item): item is FeedItem => item !== null);
}

export async function fetchPublicPosts(locale: Locale): Promise<Post[]> {
  const result = await apiGet<{ items: unknown[] }>(
    `/v1/public/posts?locale=${locale}`,
    {
      revalidateSeconds: PUBLIC_CACHE_REVALIDATE.contentList,
      tags: publicPostsTags(locale),
    }
  );
  return result.items.map(toPost);
}

export async function fetchPublicPost(locale: Locale, slug: string): Promise<Post | null> {
  try {
    const result = await apiGet<{ item: unknown }>(
      `/v1/public/posts/${encodeURIComponent(slug)}?locale=${locale}`,
      {
        revalidateSeconds: PUBLIC_CACHE_REVALIDATE.contentDetail,
        tags: publicPostTags(locale, slug),
      }
    );
    return toPost(result.item);
  } catch {
    return null;
  }
}

export async function fetchPublicMoments(locale: Locale): Promise<Moment[]> {
  const result = await apiGet<{ items: unknown[] }>(
    `/v1/public/moments?locale=${locale}`,
    {
      revalidateSeconds: PUBLIC_CACHE_REVALIDATE.contentList,
      tags: publicMomentsTags(locale),
    }
  );
  return result.items.map(toMoment);
}

export async function fetchPublicMoment(locale: Locale, id: string): Promise<Moment | null> {
  try {
    const result = await apiGet<{ item: unknown }>(
      `/v1/public/moments/${encodeURIComponent(id)}?locale=${locale}`,
      {
        revalidateSeconds: PUBLIC_CACHE_REVALIDATE.contentDetail,
        tags: publicMomentTags(locale, id),
      }
    );
    return toMoment(result.item);
  } catch {
    return null;
  }
}

export async function fetchPublicGallery(locale: Locale): Promise<GalleryItem[]> {
  const result = await apiGet<{ items: unknown[] }>(
    `/v1/public/gallery?locale=${locale}`,
    {
      revalidateSeconds: PUBLIC_CACHE_REVALIDATE.contentList,
      tags: publicGalleryTags(locale),
    }
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
      {
        revalidateSeconds: PUBLIC_CACHE_REVALIDATE.contentDetail,
        tags: publicGalleryItemTags(locale, id),
      }
    );
    return toGalleryItem(result.item);
  } catch {
    return null;
  }
}

export async function fetchPublicPresence(): Promise<PublicPresence | null> {
  try {
    const result = await apiGet<{ item: unknown }>(`/v1/public/presence`, {
      revalidateSeconds: PUBLIC_CACHE_REVALIDATE.presence,
      tags: [PUBLIC_CACHE_TAGS.presence],
    });
    const item = asObject(result.item);
    const statusRaw = asString(item.status, "unknown");
    const status: PublicPresence["status"] =
      statusRaw === "online" || statusRaw === "offline" ? statusRaw : "unknown";
    const lastHeartbeatAt = item.lastHeartbeatAt ? toDate(item.lastHeartbeatAt) : null;
    const updatedAt = item.updatedAt ? toDate(item.updatedAt) : null;

    return {
      online: asBoolean(item.online, false),
      status,
      city: asNullableString(item.city),
      region: asNullableString(item.region),
      country: asNullableString(item.country),
      countryCode: asNullableString(item.countryCode),
      timezone: asNullableString(item.timezone),
      source: asNullableString(item.source),
      locationLabel: asString(item.locationLabel, ""),
      lastHeartbeatAt,
      updatedAt,
      staleAfterSec: asNumberOrNull(item.staleAfterSec),
    };
  } catch {
    return null;
  }
}

export async function fetchPublicProfileSnapshot(): Promise<PublicProfileSnapshot | null> {
  try {
    const result = await apiGet<{ item: unknown }>(`/v1/public/profile-snapshot`, {
      revalidateSeconds: PUBLIC_CACHE_REVALIDATE.profileSnapshot,
      tags: [PUBLIC_CACHE_TAGS.profileSnapshot],
    });
    const parsed = parsePublicProfileSnapshot(result.item);
    if (parsed) {
      lastProfileSnapshotCache = { item: parsed, fetchedAt: Date.now() };
    }
    return parsed;
  } catch {
    return (await readLocalProfileSnapshot()) ?? readCachedProfileSnapshot();
  }
}
