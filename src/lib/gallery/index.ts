import { createHash } from "crypto";
import type { Moment } from "../schema";
import { isVideoUrl } from "../media";
import { toLocalizedPath } from "../locale-routing";
import type {
  GalleryAggregationInput,
  GalleryFilterOptions,
  GalleryImageAggregate,
  GalleryImageAggregateDTO,
  GallerySourceEntry,
  GallerySourceType,
  GalleryTimePreset,
} from "./types";

type Locale = "en" | "zh";

const MARKDOWN_IMAGE_PATTERN =
  /!\[[^\]]*\]\(\s*(?:<([^>]+)>|([^\s)]+))(?:\s+(?:"[^"]*"|'[^']*'))?\s*\)/g;
const HTML_IMAGE_PATTERN = /<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>/gi;

interface MutableAggregate {
  imageId: string;
  locale: "en" | "zh";
  normalizedUrl: string;
  imageUrl: string;
  thumbUrl: string | null;
  title: string;
  hasPostTitle: boolean;
  width: number | null;
  height: number | null;
  capturedAt: Date | null;
  camera: string | null;
  lens: string | null;
  focalLength: string | null;
  aperture: string | null;
  iso: number | null;
  latitude: number | null;
  longitude: number | null;
  latestAt: Date;
  sources: GallerySourceEntry[];
  sourceTypes: Set<GallerySourceType>;
  sourceKeys: Set<string>;
}

function shortenText(value: string, maxLength: number): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return "Moment image";
  }
  if (trimmed.length <= maxLength) {
    return trimmed;
  }
  return `${trimmed.slice(0, Math.max(1, maxLength - 3))}...`;
}

function pickPreferredMomentTitle(moment: Moment): string {
  return shortenText(moment.content, 72);
}

export function normalizeGalleryImageUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const unwrapped = trimmed.startsWith("<") && trimmed.endsWith(">")
    ? trimmed.slice(1, -1).trim()
    : trimmed;
  if (!unwrapped) return null;

  const hashIndex = unwrapped.indexOf("#");
  const withoutHash = hashIndex >= 0 ? unwrapped.slice(0, hashIndex) : unwrapped;
  const normalized = withoutHash.trim();
  if (!normalized) return null;

  return normalized;
}

export function extractImageUrlsFromPostContent(content: string): string[] {
  const results = new Set<string>();

  for (const match of content.matchAll(MARKDOWN_IMAGE_PATTERN)) {
    const rawUrl = match[1] || match[2] || "";
    const normalized = normalizeGalleryImageUrl(rawUrl);
    if (!normalized || isVideoUrl(normalized)) {
      continue;
    }
    results.add(normalized);
  }

  for (const match of content.matchAll(HTML_IMAGE_PATTERN)) {
    const rawUrl = match[1] || "";
    const normalized = normalizeGalleryImageUrl(rawUrl);
    if (!normalized || isVideoUrl(normalized)) {
      continue;
    }
    results.add(normalized);
  }

  return Array.from(results);
}

function stableImageId(normalizedUrl: string): string {
  return createHash("sha256").update(normalizedUrl).digest("hex").slice(0, 20);
}

export function getGalleryImageIdFromUrl(rawUrl: string): string | null {
  const normalized = normalizeGalleryImageUrl(rawUrl);
  if (!normalized) {
    return null;
  }
  return stableImageId(normalized);
}

function sourceKey(source: GallerySourceEntry): string {
  return [
    source.sourceType,
    source.sourceId,
    source.position,
    source.mediaIndex ?? "",
    source.sourcePath,
  ].join("|");
}

function mergeNullableString(current: string | null, incoming?: string | null): string | null {
  if (current) return current;
  return incoming ?? null;
}

function mergeNullableNumber(current: number | null, incoming?: number | null): number | null {
  if (typeof current === "number") return current;
  return typeof incoming === "number" ? incoming : null;
}

function mergeNullableDate(current: Date | null, incoming?: Date | null): Date | null {
  if (current instanceof Date) return current;
  if (incoming instanceof Date && !Number.isNaN(incoming.getTime())) {
    return incoming;
  }
  return null;
}

function ensureAggregate(
  map: Map<string, MutableAggregate>,
  locale: "en" | "zh",
  normalizedUrl: string,
  displayUrl: string,
  sourceDate: Date,
  initialTitle: string,
  isPostTitle: boolean
): MutableAggregate {
  const existing = map.get(normalizedUrl);
  if (existing) {
    if (sourceDate.getTime() > existing.latestAt.getTime()) {
      existing.latestAt = sourceDate;
    }

    if (isPostTitle && initialTitle.trim()) {
      existing.title = initialTitle.trim();
      existing.hasPostTitle = true;
    } else if (!existing.hasPostTitle && initialTitle.trim() && !existing.title.trim()) {
      existing.title = initialTitle.trim();
    }

    return existing;
  }

  const item: MutableAggregate = {
    imageId: stableImageId(normalizedUrl),
    locale,
    normalizedUrl,
    imageUrl: displayUrl,
    thumbUrl: null,
    title: initialTitle.trim() || "Untitled image",
    hasPostTitle: isPostTitle,
    width: null,
    height: null,
    capturedAt: null,
    camera: null,
    lens: null,
    focalLength: null,
    aperture: null,
    iso: null,
    latitude: null,
    longitude: null,
    latestAt: sourceDate,
    sources: [],
    sourceTypes: new Set<GallerySourceType>(),
    sourceKeys: new Set<string>(),
  };

  map.set(normalizedUrl, item);
  return item;
}

function addSource(
  map: Map<string, MutableAggregate>,
  locale: "en" | "zh",
  normalizedUrl: string,
  title: string,
  isPostTitle: boolean,
  sourceDate: Date,
  source: GallerySourceEntry,
  mediaMeta?: {
    width?: number;
    height?: number;
    capturedAt?: Date;
    camera?: string;
    lens?: string;
    focalLength?: string;
    aperture?: string;
    iso?: number;
    latitude?: number;
    longitude?: number;
    thumbUrl?: string;
  }
) {
  const item = ensureAggregate(
    map,
    locale,
    normalizedUrl,
    normalizedUrl,
    sourceDate,
    title,
    isPostTitle
  );

  const key = sourceKey(source);
  if (!item.sourceKeys.has(key)) {
    item.sourceKeys.add(key);
    item.sources.push(source);
  }
  item.sourceTypes.add(source.sourceType);

  item.width = mergeNullableNumber(item.width, mediaMeta?.width ?? null);
  item.height = mergeNullableNumber(item.height, mediaMeta?.height ?? null);
  item.capturedAt = mergeNullableDate(item.capturedAt, mediaMeta?.capturedAt ?? null);
  item.camera = mergeNullableString(item.camera, mediaMeta?.camera ?? null);
  item.lens = mergeNullableString(item.lens, mediaMeta?.lens ?? null);
  item.focalLength = mergeNullableString(item.focalLength, mediaMeta?.focalLength ?? null);
  item.aperture = mergeNullableString(item.aperture, mediaMeta?.aperture ?? null);
  item.iso = mergeNullableNumber(item.iso, mediaMeta?.iso ?? null);
  item.latitude = mergeNullableNumber(item.latitude, mediaMeta?.latitude ?? null);
  item.longitude = mergeNullableNumber(item.longitude, mediaMeta?.longitude ?? null);
  item.thumbUrl = mergeNullableString(item.thumbUrl, mediaMeta?.thumbUrl ?? null);
}

export function aggregateGalleryImages(
  input: GalleryAggregationInput
): GalleryImageAggregate[] {
  const map = new Map<string, MutableAggregate>();
  const { locale, posts, moments } = input;

  for (const post of posts) {
    const sourceDate = post.publishedAt ?? post.createdAt;
    const postPath = toLocalizedPath(locale, `/posts/${post.slug}`);

    if (post.coverUrl) {
      const normalized = normalizeGalleryImageUrl(post.coverUrl);
      if (normalized && !isVideoUrl(normalized)) {
        addSource(
          map,
          locale,
          normalized,
          post.title,
          true,
          sourceDate,
          {
            sourceType: "post",
            sourceId: post.id,
            sourcePath: postPath,
            sourceTitle: post.title,
            sourceDate,
            position: "post_cover",
          }
        );
      }
    }

    const bodyImages = extractImageUrlsFromPostContent(post.content);
    bodyImages.forEach((url, index) => {
      addSource(
        map,
        locale,
        url,
        post.title,
        true,
        sourceDate,
        {
          sourceType: "post",
          sourceId: post.id,
          sourcePath: postPath,
          sourceTitle: post.title,
          sourceDate,
          position: "post_body",
          mediaIndex: index,
        }
      );
    });
  }

  for (const moment of moments) {
    const sourceDate = moment.publishedAt ?? moment.createdAt;
    const momentPath = toLocalizedPath(locale, `/moments/${moment.id}`);
    const title = pickPreferredMomentTitle(moment);

    (moment.media ?? []).forEach((media, mediaIndex) => {
      if (media.type !== "image") return;

      const normalized = normalizeGalleryImageUrl(media.url);
      if (!normalized || isVideoUrl(normalized)) return;

      addSource(
        map,
        locale,
        normalized,
        title,
        false,
        sourceDate,
        {
          sourceType: "moment",
          sourceId: moment.id,
          sourcePath: momentPath,
          sourceTitle: title,
          sourceDate,
          position: "moment_media",
          mediaIndex,
        },
        {
          width: media.width,
          height: media.height,
          capturedAt: media.capturedAt
            ? new Date(media.capturedAt)
            : undefined,
          camera: media.camera,
          lens: media.lens,
          focalLength: media.focalLength,
          aperture: media.aperture,
          iso: media.iso,
          latitude: media.latitude,
          longitude: media.longitude,
          thumbUrl: media.thumbnailUrl,
        }
      );
    });
  }

  return Array.from(map.values())
    .map<GalleryImageAggregate>((item) => {
      const sources = [...item.sources].sort(
        (a, b) => b.sourceDate.getTime() - a.sourceDate.getTime()
      );

      const sourceTypes = Array.from(item.sourceTypes).sort((a, b) =>
        a.localeCompare(b)
      );

      return {
        imageId: item.imageId,
        locale: item.locale,
        normalizedUrl: item.normalizedUrl,
        imageUrl: item.imageUrl,
        thumbUrl: item.thumbUrl,
        title: item.title,
        width: item.width,
        height: item.height,
        capturedAt: item.capturedAt,
        camera: item.camera,
        lens: item.lens,
        focalLength: item.focalLength,
        aperture: item.aperture,
        iso: item.iso,
        latitude: item.latitude,
        longitude: item.longitude,
        latestAt: item.latestAt,
        sourceTypes,
        sourceCount: sources.length,
        sources,
      };
    })
    .sort((a, b) => b.latestAt.getTime() - a.latestAt.getTime());
}

function passesTimePreset(itemDate: Date, preset: GalleryTimePreset, now: Date): boolean {
  if (preset === "all") {
    return true;
  }

  const itemTime = itemDate.getTime();
  if (preset === "today") {
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return itemTime >= startOfToday.getTime();
  }

  const days = preset === "7d" ? 7 : 30;
  const threshold = now.getTime() - days * 24 * 60 * 60 * 1000;
  return itemTime >= threshold;
}

export function filterGalleryImages(
  items: GalleryImageAggregate[],
  options: GalleryFilterOptions
): GalleryImageAggregate[] {
  const selectedSources = new Set(options.sourceTypes);
  const now = options.now ?? new Date();

  if (selectedSources.size === 0) {
    return [];
  }

  return items.filter((item) => {
    const sourceMatched = item.sourceTypes.some((type) => selectedSources.has(type));
    if (!sourceMatched) return false;
    return passesTimePreset(item.latestAt, options.timePreset, now);
  });
}

export function serializeGalleryImage(item: GalleryImageAggregate): GalleryImageAggregateDTO {
  return {
    imageId: item.imageId,
    locale: item.locale,
    imageUrl: item.imageUrl,
    thumbUrl: item.thumbUrl,
    title: item.title,
    width: item.width,
    height: item.height,
    capturedAt: item.capturedAt ? item.capturedAt.toISOString() : null,
    camera: item.camera,
    lens: item.lens,
    focalLength: item.focalLength,
    aperture: item.aperture,
    iso: item.iso,
    latitude: item.latitude,
    longitude: item.longitude,
    latestAt: item.latestAt.toISOString(),
    sourceTypes: item.sourceTypes,
    sourceCount: item.sourceCount,
    sources: item.sources.map((source) => ({
      sourceType: source.sourceType,
      sourceId: source.sourceId,
      sourcePath: source.sourcePath,
      sourceTitle: source.sourceTitle,
      sourceDate: source.sourceDate.toISOString(),
      position: source.position,
      mediaIndex: source.mediaIndex,
    })),
  };
}

export async function getAggregatedGalleryImages(locale: Locale): Promise<GalleryImageAggregate[]> {
  const { getPublicMoments, getPublicPosts } = await import("../content/read");
  const normalizedLocale: Locale = locale === "zh" ? "zh" : "en";
  const [posts, moments] = await Promise.all([
    getPublicPosts(normalizedLocale),
    getPublicMoments(normalizedLocale),
  ]);

  return aggregateGalleryImages({
    locale: normalizedLocale,
    posts,
    moments,
  });
}

export type {
  GalleryAggregationInput,
  GalleryFilterOptions,
  GalleryImageAggregate,
  GalleryImageAggregateDTO,
  GallerySourceEntry,
  GallerySourceType,
  GalleryTimePreset,
};
