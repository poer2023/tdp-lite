import { promises as fs } from "node:fs";
import path from "node:path";
import { aggregateGalleryImages, getGalleryImageIdFromUrl, type GalleryImageAggregate } from "../gallery";
import { APP_LOCALES, normalizeLocale, type AppLocale } from "../locale";
import type { GalleryItem, Moment, Post } from "@/lib/content/types";
import type { FeedItem } from "@/components/bento/types";
import type {
  SearchCursorPayload,
  SearchFilters,
  SearchGalleryItem,
  SearchMomentItem,
  SearchPostItem,
  SearchRequest,
  SearchResponse,
  SearchResponseItem,
  SearchSection,
  SearchSectionResponse,
  SupportedLocale,
} from "./contracts";
import {
  reviveSearchFeedItem,
  serializeGalleryFeedItem,
  serializeMomentFeedItem,
  serializePostFeedItem,
} from "./feedItemSnapshot";

const SEARCH_SNAPSHOT_SCHEMA_VERSION = 1;
const SEARCH_INDEX_DIR = path.join(process.cwd(), "data", "search-index");
const REMOTE_CACHE_TTL_MS = 30_000;
type SnapshotContentFeedItem = Exclude<FeedItem, { type: "action" }>;

interface SearchSnapshotCacheEntry {
  snapshot: SearchSnapshotFile;
  fetchedAt: number;
}

interface SearchSnapshotDocumentBase {
  id: string;
  section: SearchSection;
  locale: SupportedLocale;
  sortAt: string;
  searchableText: string;
}

interface SearchSnapshotPostDocument extends SearchSnapshotDocumentBase, SearchPostItem {
  section: "post";
}

interface SearchSnapshotMomentDocument extends SearchSnapshotDocumentBase, SearchMomentItem {
  section: "moment";
}

interface SearchSnapshotGalleryDocument extends SearchSnapshotDocumentBase, SearchGalleryItem {
  section: "gallery";
}

type SearchSnapshotDocument =
  | SearchSnapshotPostDocument
  | SearchSnapshotMomentDocument
  | SearchSnapshotGalleryDocument;

export interface SearchSnapshotFile {
  schemaVersion: number;
  generatedAt: string | null;
  locale: SupportedLocale;
  counts: Record<SearchSection, number>;
  items: SearchSnapshotDocument[];
}

const EMPTY_SNAPSHOT: SearchSnapshotFile = {
  schemaVersion: SEARCH_SNAPSHOT_SCHEMA_VERSION,
  generatedAt: null,
  locale: "en",
  counts: {
    post: 0,
    moment: 0,
    gallery: 0,
  },
  items: [],
};

const remoteSnapshotCache = new Map<SupportedLocale, SearchSnapshotCacheEntry>();

function shortenText(input: string, maxLength: number): string {
  const trimmed = input.trim();
  if (trimmed.length <= maxLength) {
    return trimmed;
  }
  return `${trimmed.slice(0, Math.max(1, maxLength - 3))}...`;
}

function stripMarkdown(input: string): string {
  return input
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/!\[[^\]]*]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)]\([^)]*\)/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/[#>*_\-~]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeSearchText(input: string): string {
  return input
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function resolveSortAt(date: Date | string | null | undefined, fallback: Date | string): string {
  const primary = date ? new Date(date) : null;
  if (primary && Number.isFinite(primary.getTime())) {
    return primary.toISOString();
  }
  return new Date(fallback).toISOString();
}

function encodeCursor(cursor: SearchCursorPayload): string {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

function decodeCursor(cursor?: string): SearchCursorPayload | null {
  if (!cursor) return null;
  try {
    const parsed = JSON.parse(
      Buffer.from(cursor, "base64url").toString("utf8")
    ) as SearchCursorPayload;
    if (
      typeof parsed?.id === "string" &&
      typeof parsed?.sortAt === "string" &&
      !Number.isNaN(new Date(parsed.sortAt).getTime())
    ) {
      return parsed;
    }
  } catch {
    return null;
  }
  return null;
}

function buildResponse<T extends SearchResponseItem>(
  rows: T[],
  limit: number
): SearchResponse<T> {
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const lastItem = items.at(-1);
  const nextCursor = hasMore && lastItem
    ? encodeCursor({ id: lastItem.id, sortAt: lastItem.sortAt })
    : null;
  return { items, nextCursor, hasMore };
}

function buildPostDocument(post: Post): SearchSnapshotPostDocument {
  const plainContent = stripMarkdown(post.content);
  const excerpt = shortenText(post.excerpt?.trim() || plainContent, 180);
  return {
    id: post.id,
    section: "post",
    locale: normalizeLocale(post.locale),
    sortAt: resolveSortAt(post.publishedAt, post.createdAt),
    slug: post.slug,
    title: post.title,
    excerpt,
    tags: Array.isArray(post.tags) ? post.tags.filter(Boolean) : [],
    feedItem: serializePostFeedItem(post),
    searchableText: normalizeSearchText(
      [post.title, post.excerpt || "", plainContent, ...(post.tags || [])].join(" ")
    ),
  };
}

function buildMomentDocument(moment: Moment): SearchSnapshotMomentDocument {
  const mediaText = (moment.media || [])
    .map((item) => [item.title, item.artist, item.album].filter(Boolean).join(" "))
    .join(" ");
  return {
    id: moment.id,
    section: "moment",
    locale: normalizeLocale(moment.locale),
    sortAt: resolveSortAt(moment.publishedAt, moment.createdAt),
    content: shortenText(moment.content, 220),
    locationName: moment.location?.name || null,
    feedItem: serializeMomentFeedItem(moment),
    searchableText: normalizeSearchText(
      [moment.content, moment.location?.name || "", mediaText].join(" ")
    ),
  };
}

function buildGalleryDocument(item: GalleryItem): SearchSnapshotGalleryDocument {
  return {
    id: item.id,
    section: "gallery",
    locale: normalizeLocale(item.locale),
    sortAt: resolveSortAt(item.publishedAt, item.createdAt),
    imageId: getGalleryImageIdFromUrl(item.fileUrl),
    title: item.title,
    camera: item.camera,
    lens: item.lens,
    focalLength: item.focalLength,
    aperture: item.aperture,
    iso: item.iso,
    thumbUrl: item.thumbUrl,
    fileUrl: item.fileUrl,
    feedItem: serializeGalleryFeedItem(item),
    searchableText: normalizeSearchText(
      [
        item.title || "",
        item.camera || "",
        item.lens || "",
        item.focalLength || "",
        item.aperture || "",
        item.iso != null ? String(item.iso) : "",
      ].join(" ")
    ),
  };
}

function compareDocuments(a: SearchSnapshotDocument, b: SearchSnapshotDocument): number {
  const timeDelta = new Date(b.sortAt).getTime() - new Date(a.sortAt).getTime();
  if (timeDelta !== 0) {
    return timeDelta;
  }
  return b.id.localeCompare(a.id);
}

export function buildSearchSnapshot(params: {
  locale: AppLocale;
  posts: Post[];
  moments: Moment[];
  gallery: GalleryItem[];
  generatedAt?: string;
}): SearchSnapshotFile {
  const locale = normalizeLocale(params.locale);
  const posts = params.posts
    .filter((post) => normalizeLocale(post.locale) === locale)
    .map(buildPostDocument);
  const moments = params.moments
    .filter(
      (moment) =>
        normalizeLocale(moment.locale) === locale &&
        moment.status === "published" &&
        moment.visibility === "public" &&
        !moment.deletedAt
    )
    .map(buildMomentDocument);
  const gallery = params.gallery
    .filter(
      (item) =>
        normalizeLocale(item.locale) === locale &&
        item.status === "published" &&
        !item.deletedAt
    )
    .map(buildGalleryDocument);

  const items = [...posts, ...moments, ...gallery].sort(compareDocuments);

  return {
    schemaVersion: SEARCH_SNAPSHOT_SCHEMA_VERSION,
    generatedAt: params.generatedAt ?? new Date().toISOString(),
    locale,
    counts: {
      post: posts.length,
      moment: moments.length,
      gallery: gallery.length,
    },
    items,
  };
}

function resolveApiBaseUrl(): string {
  const explicitBase =
    process.env.TDP_API_BASE_URL || process.env.NEXT_PUBLIC_TDP_API_BASE_URL;
  if (explicitBase && explicitBase.trim().length > 0) {
    return explicitBase.replace(/\/$/, "");
  }

  const apiAddr = process.env.TDP_API_ADDR?.trim();
  if (apiAddr) {
    if (/^:\d+$/.test(apiAddr)) {
      return `http://localhost${apiAddr}`;
    }
    if (/^https?:\/\//.test(apiAddr)) {
      return apiAddr.replace(/\/$/, "");
    }
  }

  return "http://localhost:8080";
}

function parseSnapshot(raw: string, locale: SupportedLocale): SearchSnapshotFile {
  const parsed = JSON.parse(raw) as Partial<SearchSnapshotFile>;
  if (!Array.isArray(parsed.items)) {
    return { ...EMPTY_SNAPSHOT, locale };
  }
  return {
    schemaVersion:
      typeof parsed.schemaVersion === "number"
        ? parsed.schemaVersion
        : SEARCH_SNAPSHOT_SCHEMA_VERSION,
    generatedAt: typeof parsed.generatedAt === "string" ? parsed.generatedAt : null,
    locale,
    counts: {
      post: Number(parsed.counts?.post || 0),
      moment: Number(parsed.counts?.moment || 0),
      gallery: Number(parsed.counts?.gallery || 0),
    },
    items: parsed.items as SearchSnapshotDocument[],
  };
}

async function readLocalSnapshotFile(locale: SupportedLocale): Promise<SearchSnapshotFile | null> {
  const filePath = path.join(SEARCH_INDEX_DIR, `${locale}.json`);
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return parseSnapshot(raw, locale);
  } catch {
    return null;
  }
}

async function fetchRemoteSnapshot(locale: SupportedLocale): Promise<SearchSnapshotFile | null> {
  const now = Date.now();
  const cached = remoteSnapshotCache.get(locale);
  if (cached && now - cached.fetchedAt < REMOTE_CACHE_TTL_MS) {
    return cached.snapshot;
  }

  try {
    const response = await fetch(
      `${resolveApiBaseUrl()}/v1/public/search-snapshot?locale=${locale}`,
      {
        cache: "no-store",
        headers: { Accept: "application/json" },
      }
    );

    if (!response.ok) {
      throw new Error(`remote snapshot request failed (${response.status})`);
    }

    const payload = (await response.json()) as { item?: Partial<SearchSnapshotFile> };
    const snapshot = parseSnapshot(JSON.stringify(payload.item ?? {}), locale);
    remoteSnapshotCache.set(locale, { snapshot, fetchedAt: now });
    return snapshot;
  } catch {
    if (cached) {
      return cached.snapshot;
    }
    return null;
  }
}

async function readSnapshotFile(locale: SupportedLocale): Promise<SearchSnapshotFile> {
  const local = await readLocalSnapshotFile(locale);
  if (local) {
    return local;
  }

  const remote = await fetchRemoteSnapshot(locale);
  if (remote) {
    return remote;
  }

  return { ...EMPTY_SNAPSHOT, locale };
}

async function loadSnapshotsForRequest(
  request: SearchRequest
): Promise<SearchSnapshotDocument[]> {
  const locale =
    request.filters.localeScope === "current"
      ? [normalizeLocale(request.locale)]
      : APP_LOCALES;

  const snapshots = await Promise.all(
    locale.map((entry) => readSnapshotFile(normalizeLocale(entry)))
  );

  return snapshots.flatMap((snapshot) => snapshot.items);
}

function documentToFeedItem(document: SearchSnapshotDocument): SnapshotContentFeedItem | null {
  const item = document.feedItem ? reviveSearchFeedItem(document.feedItem) : null;
  return item && item.type !== "action" ? item : null;
}

function compareFeedItemsByDate(
  a: SnapshotContentFeedItem,
  b: SnapshotContentFeedItem
): number {
  const aDate = (a.publishedAt ?? a.createdAt).getTime();
  const bDate = (b.publishedAt ?? b.createdAt).getTime();
  if (bDate !== aDate) {
    return bDate - aDate;
  }
  return b.id.localeCompare(a.id);
}

export async function loadSearchSnapshots(
  locales: readonly SupportedLocale[] = APP_LOCALES
): Promise<SearchSnapshotFile[]> {
  return Promise.all(locales.map((locale) => readSnapshotFile(normalizeLocale(locale))));
}

export async function listSnapshotPosts(locale: SupportedLocale): Promise<Post[]> {
  const snapshot = await readSnapshotFile(normalizeLocale(locale));
  return snapshot.items
    .filter((document): document is SearchSnapshotPostDocument => document.section === "post")
    .map(documentToFeedItem)
    .filter((item): item is Extract<FeedItem, { type: "post" }> => item?.type === "post")
    .sort(compareFeedItemsByDate);
}

export async function getSnapshotPostBySlug(
  locale: SupportedLocale,
  slug: string
): Promise<Post | null> {
  const posts = await listSnapshotPosts(locale);
  return posts.find((post) => post.slug === slug) ?? null;
}

export async function listSnapshotMoments(locale: SupportedLocale): Promise<Moment[]> {
  const snapshot = await readSnapshotFile(normalizeLocale(locale));
  return snapshot.items
    .filter(
      (document): document is SearchSnapshotMomentDocument => document.section === "moment"
    )
    .map(documentToFeedItem)
    .filter((item): item is Extract<FeedItem, { type: "moment" }> => item?.type === "moment")
    .sort(compareFeedItemsByDate);
}

export async function getSnapshotMomentById(
  locale: SupportedLocale,
  id: string
): Promise<Moment | null> {
  const moments = await listSnapshotMoments(locale);
  return moments.find((moment) => moment.id === id) ?? null;
}

export async function listSnapshotGalleryItems(
  locale: SupportedLocale
): Promise<GalleryItem[]> {
  const snapshot = await readSnapshotFile(normalizeLocale(locale));
  return snapshot.items
    .filter(
      (document): document is SearchSnapshotGalleryDocument => document.section === "gallery"
    )
    .map(documentToFeedItem)
    .filter((item): item is Extract<FeedItem, { type: "gallery" }> => item?.type === "gallery")
    .sort(compareFeedItemsByDate);
}

export async function getSnapshotGalleryItemById(
  locale: SupportedLocale,
  id: string
): Promise<GalleryItem | null> {
  const items = await listSnapshotGalleryItems(locale);
  return items.find((item) => item.id === id) ?? null;
}

export async function listSnapshotFeed(
  locale: SupportedLocale,
  limit?: number
): Promise<FeedItem[]> {
  const snapshot = await readSnapshotFile(normalizeLocale(locale));
  const items = snapshot.items
    .map(documentToFeedItem)
    .filter((item): item is SnapshotContentFeedItem => item !== null)
    .sort(compareFeedItemsByDate);
  if (typeof limit === "number" && limit > 0) {
    return items.slice(0, limit);
  }
  return items;
}

export async function listSnapshotGalleryImages(
  locale: SupportedLocale
): Promise<GalleryImageAggregate[]> {
  const normalizedLocale = normalizeLocale(locale);
  const [posts, moments, gallery] = await Promise.all([
    listSnapshotPosts(normalizedLocale),
    listSnapshotMoments(normalizedLocale),
    listSnapshotGalleryItems(normalizedLocale),
  ]);

  return aggregateGalleryImages({
    locale: normalizedLocale,
    posts,
    moments,
    gallery,
  });
}

export async function listSnapshotPostRouteParams(): Promise<
  Array<{ locale: SupportedLocale; slug: string }>
> {
  const snapshots = await loadSearchSnapshots();
  return snapshots.flatMap((snapshot) =>
    snapshot.items
      .filter(
        (document): document is SearchSnapshotPostDocument => document.section === "post"
      )
      .map((document) => ({
        locale: snapshot.locale,
        slug: document.slug,
      }))
  );
}

export async function listSnapshotMomentRouteParams(): Promise<
  Array<{ locale: SupportedLocale; id: string }>
> {
  const snapshots = await loadSearchSnapshots();
  return snapshots.flatMap((snapshot) =>
    snapshot.items
      .filter(
        (document): document is SearchSnapshotMomentDocument =>
          document.section === "moment"
      )
      .map((document) => ({
        locale: snapshot.locale,
        id: document.id,
      }))
  );
}

export async function listSnapshotGalleryRouteParams(): Promise<
  Array<{ locale: SupportedLocale; imageId: string }>
> {
  const entries = await Promise.all(
    APP_LOCALES.map(async (locale) => ({
      locale,
      items: await listSnapshotGalleryImages(locale),
    }))
  );

  return entries.flatMap(({ locale, items }) =>
    items.map((item) => ({
      locale,
      imageId: item.imageId,
    }))
  );
}

function matchesQuery(document: SearchSnapshotDocument, query: string): boolean {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) {
    return false;
  }
  if (document.searchableText.includes(normalizedQuery)) {
    return true;
  }
  const parts = normalizedQuery.split(" ").filter(Boolean);
  if (parts.length <= 1) {
    return false;
  }
  return parts.every((part) => document.searchableText.includes(part));
}

function passesDateFilters(document: SearchSnapshotDocument, filters: SearchFilters): boolean {
  const sortAt = new Date(document.sortAt).getTime();
  if (filters.dateFrom) {
    const from = new Date(`${filters.dateFrom}T00:00:00.000Z`).getTime();
    if (sortAt < from) {
      return false;
    }
  }
  if (filters.dateTo) {
    const to = new Date(`${filters.dateTo}T00:00:00.000Z`);
    to.setUTCDate(to.getUTCDate() + 1);
    if (sortAt >= to.getTime()) {
      return false;
    }
  }
  return true;
}

function passesSectionFilters(document: SearchSnapshotDocument, filters: SearchFilters): boolean {
  if (document.section === "post" && filters.tags?.length) {
    const postTags = document.tags.map((tag) => normalizeSearchText(tag));
    return filters.tags.every((tag) =>
      postTags.some((item) => item.includes(normalizeSearchText(tag)))
    );
  }

  if (document.section === "moment" && filters.location) {
    const location = normalizeSearchText(document.locationName || "");
    return location.includes(normalizeSearchText(filters.location));
  }

  if (document.section === "gallery") {
    if (filters.camera) {
      const camera = normalizeSearchText(document.camera || "");
      if (!camera.includes(normalizeSearchText(filters.camera))) {
        return false;
      }
    }
    if (filters.lens) {
      const lens = normalizeSearchText(document.lens || "");
      if (!lens.includes(normalizeSearchText(filters.lens))) {
        return false;
      }
    }
    if (filters.focalLength) {
      const focalLength = normalizeSearchText(document.focalLength || "");
      if (!focalLength.includes(normalizeSearchText(filters.focalLength))) {
        return false;
      }
    }
    if (filters.aperture) {
      const aperture = normalizeSearchText(document.aperture || "");
      if (!aperture.includes(normalizeSearchText(filters.aperture))) {
        return false;
      }
    }
    if (typeof filters.isoMin === "number" && (document.iso ?? -1) < filters.isoMin) {
      return false;
    }
    if (typeof filters.isoMax === "number" && (document.iso ?? Number.MAX_SAFE_INTEGER) > filters.isoMax) {
      return false;
    }
  }

  return true;
}

function passesCursor(document: SearchSnapshotDocument, cursor?: SearchCursorPayload | null): boolean {
  if (!cursor) {
    return true;
  }

  const documentTime = new Date(document.sortAt).getTime();
  const cursorTime = new Date(cursor.sortAt).getTime();
  if (documentTime !== cursorTime) {
    return documentTime < cursorTime;
  }
  return document.id < cursor.id;
}

function stripSearchableText<TDocument extends { searchableText: string }>(
  document: TDocument
): Omit<TDocument, "searchableText"> {
  const { searchableText, ...rest } = document;
  void searchableText;
  return rest;
}

function toPostResponse(document: SearchSnapshotPostDocument): SearchPostItem {
  return stripSearchableText(document);
}

function toMomentResponse(document: SearchSnapshotMomentDocument): SearchMomentItem {
  return stripSearchableText(document);
}

function toGalleryResponse(document: SearchSnapshotGalleryDocument): SearchGalleryItem {
  return stripSearchableText(document);
}

export function searchWithinSnapshotDocuments(params: {
  documents: SearchSnapshotDocument[];
  request: SearchRequest & { section: "post" };
}): SearchSectionResponse<"post">;
export function searchWithinSnapshotDocuments(params: {
  documents: SearchSnapshotDocument[];
  request: SearchRequest & { section: "moment" };
}): SearchSectionResponse<"moment">;
export function searchWithinSnapshotDocuments(params: {
  documents: SearchSnapshotDocument[];
  request: SearchRequest & { section: "gallery" };
}): SearchSectionResponse<"gallery">;
export function searchWithinSnapshotDocuments(params: {
  documents: SearchSnapshotDocument[];
  request: SearchRequest;
}): SearchResponse<SearchResponseItem> {
  const limit = Math.min(Math.max(params.request.limit ?? 12, 1), 30);
  const cursor = decodeCursor(params.request.cursor);
  const filtered = params.documents
    .filter((document) => document.section === params.request.section)
    .filter((document) => matchesQuery(document, params.request.query))
    .filter((document) => passesDateFilters(document, params.request.filters))
    .filter((document) => passesSectionFilters(document, params.request.filters))
    .filter((document) => passesCursor(document, cursor))
    .sort(compareDocuments);

  if (params.request.section === "post") {
    return buildResponse(
      filtered
        .filter(
          (document): document is SearchSnapshotPostDocument => document.section === "post"
        )
        .map(toPostResponse),
      limit
    );
  }

  if (params.request.section === "moment") {
    return buildResponse(
      filtered
        .filter(
          (document): document is SearchSnapshotMomentDocument =>
            document.section === "moment"
        )
        .map(toMomentResponse),
      limit
    );
  }

  return buildResponse(
    filtered
      .filter(
        (document): document is SearchSnapshotGalleryDocument =>
          document.section === "gallery"
      )
      .map(toGalleryResponse),
    limit
  );
}

export async function searchBySectionInSnapshot(
  request: SearchRequest & { section: "post" }
): Promise<SearchSectionResponse<"post">>;
export async function searchBySectionInSnapshot(
  request: SearchRequest & { section: "moment" }
): Promise<SearchSectionResponse<"moment">>;
export async function searchBySectionInSnapshot(
  request: SearchRequest & { section: "gallery" }
): Promise<SearchSectionResponse<"gallery">>;
export async function searchBySectionInSnapshot(
  request: SearchRequest
): Promise<SearchResponse<SearchResponseItem>> {
  const documents = await loadSnapshotsForRequest(request);
  if (request.section === "post") {
    return searchWithinSnapshotDocuments({
      documents,
      request: request as SearchRequest & { section: "post" },
    });
  }
  if (request.section === "moment") {
    return searchWithinSnapshotDocuments({
      documents,
      request: request as SearchRequest & { section: "moment" },
    });
  }
  return searchWithinSnapshotDocuments({
    documents,
    request: request as SearchRequest & { section: "gallery" },
  });
}
