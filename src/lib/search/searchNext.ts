import { and, desc, eq, isNull, sql, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import { getGalleryImageIdFromUrl } from "@/lib/gallery";
import { gallery, moments, posts } from "@/lib/schema";
import type {
  SearchCursorPayload,
  SearchFilters,
  SearchGalleryItem,
  SearchItemBySection,
  SearchMomentItem,
  SearchPostItem,
  SearchRequest,
  SearchResponse,
  SearchResponseItem,
  SearchSection,
  SearchSectionResponse,
  SupportedLocale,
} from "./contracts";
import { SearchSourceError } from "./errors";

function normalizeLocale(value: string): SupportedLocale {
  return value === "zh" ? "zh" : "en";
}

function normalizeDate(date: Date | string): string {
  const value = date instanceof Date ? date : new Date(date);
  return value.toISOString();
}

function parseDayStartUtc(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function parseDayEndExclusiveUtc(value: string): Date {
  const date = parseDayStartUtc(value);
  date.setUTCDate(date.getUTCDate() + 1);
  return date;
}

function escapeLike(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

function createLikePattern(value: string): string {
  return `%${escapeLike(value)}%`;
}

function shortenText(input: string, maxLength: number): string {
  const text = input.trim();
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength - 3)}...`;
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

function parseLocationName(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  return typeof record.name === "string" ? record.name : null;
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

async function searchPosts(
  request: SearchRequest & { limit: number }
): Promise<SearchSectionResponse<"post">> {
  const { query, locale, filters, limit } = request;
  const searchPattern = createLikePattern(query);
  const cursor = decodeCursor(request.cursor);
  const sortBy = sql<Date>`coalesce(${posts.publishedAt}, ${posts.createdAt})`;
  const clauses: SQL[] = [
    eq(posts.status, "published"),
    sql`deleted_at IS NULL`,
    sql`(
      ${posts.title} ILIKE ${searchPattern} ESCAPE '\\'
      OR COALESCE(${posts.excerpt}, '') ILIKE ${searchPattern} ESCAPE '\\'
      OR ${posts.content} ILIKE ${searchPattern} ESCAPE '\\'
      OR COALESCE(${posts.tags}::text, '') ILIKE ${searchPattern} ESCAPE '\\'
    )`,
  ];

  if (filters.localeScope === "current") {
    clauses.push(eq(posts.locale, locale));
  }
  if (filters.dateFrom) {
    clauses.push(sql`${sortBy} >= ${parseDayStartUtc(filters.dateFrom)}`);
  }
  if (filters.dateTo) {
    clauses.push(sql`${sortBy} < ${parseDayEndExclusiveUtc(filters.dateTo)}`);
  }
  for (const tag of filters.tags ?? []) {
    clauses.push(
      sql`COALESCE(${posts.tags}::text, '') ILIKE ${createLikePattern(tag)} ESCAPE '\\'`
    );
  }
  if (cursor) {
    const cursorDate = new Date(cursor.sortAt);
    clauses.push(
      sql`(${sortBy} < ${cursorDate} OR (${sortBy} = ${cursorDate} AND ${posts.id}::text < ${cursor.id}))`
    );
  }

  const rows = await db
    .select({
      id: posts.id,
      locale: posts.locale,
      slug: posts.slug,
      title: posts.title,
      excerpt: posts.excerpt,
      content: posts.content,
      tags: posts.tags,
      sortAt: sortBy,
    })
    .from(posts)
    .where(and(...clauses))
    .orderBy(desc(sortBy), desc(posts.id))
    .limit(limit + 1);

  const mapped: SearchPostItem[] = rows.map((row) => {
    const tags = Array.isArray(row.tags)
      ? row.tags.filter((tag): tag is string => typeof tag === "string")
      : [];
    const previewSource = row.excerpt?.trim() || row.content;
    return {
      id: row.id,
      section: "post",
      locale: normalizeLocale(row.locale),
      sortAt: normalizeDate(row.sortAt),
      slug: row.slug,
      title: row.title,
      excerpt: shortenText(previewSource, 180),
      tags,
    };
  });

  return buildResponse(mapped, limit);
}

async function searchMoments(
  request: SearchRequest & { limit: number }
): Promise<SearchSectionResponse<"moment">> {
  const { query, locale, filters, limit } = request;
  const searchPattern = createLikePattern(query);
  const locationExpr = sql`COALESCE(${moments.location}->>'name', '')`;
  const cursor = decodeCursor(request.cursor);
  const sortBy = sql<Date>`coalesce(${moments.publishedAt}, ${moments.createdAt})`;
  const clauses: SQL[] = [
    eq(moments.status, "published"),
    eq(moments.visibility, "public"),
    isNull(moments.deletedAt),
    sql`(
      ${moments.content} ILIKE ${searchPattern} ESCAPE '\\'
      OR ${locationExpr} ILIKE ${searchPattern} ESCAPE '\\'
    )`,
  ];

  if (filters.localeScope === "current") {
    clauses.push(eq(moments.locale, locale));
  }
  if (filters.dateFrom) {
    clauses.push(sql`${sortBy} >= ${parseDayStartUtc(filters.dateFrom)}`);
  }
  if (filters.dateTo) {
    clauses.push(sql`${sortBy} < ${parseDayEndExclusiveUtc(filters.dateTo)}`);
  }
  if (filters.location) {
    clauses.push(
      sql`${locationExpr} ILIKE ${createLikePattern(filters.location)} ESCAPE '\\'`
    );
  }
  if (cursor) {
    const cursorDate = new Date(cursor.sortAt);
    clauses.push(
      sql`(${sortBy} < ${cursorDate} OR (${sortBy} = ${cursorDate} AND ${moments.id}::text < ${cursor.id}))`
    );
  }

  const rows = await db
    .select({
      id: moments.id,
      locale: moments.locale,
      content: moments.content,
      location: moments.location,
      sortAt: sortBy,
    })
    .from(moments)
    .where(and(...clauses))
    .orderBy(desc(sortBy), desc(moments.id))
    .limit(limit + 1);

  const mapped: SearchMomentItem[] = rows.map((row) => ({
    id: row.id,
    section: "moment",
    locale: normalizeLocale(row.locale),
    sortAt: normalizeDate(row.sortAt),
    content: shortenText(row.content, 220),
    locationName: parseLocationName(row.location),
  }));

  return buildResponse(mapped, limit);
}

async function searchGallery(
  request: SearchRequest & { limit: number }
): Promise<SearchSectionResponse<"gallery">> {
  const { query, locale, filters, limit } = request;
  const searchPattern = createLikePattern(query);
  const cursor = decodeCursor(request.cursor);
  const sortBy = sql<Date>`coalesce(${gallery.publishedAt}, ${gallery.createdAt})`;
  const clauses: SQL[] = [
    eq(gallery.status, "published"),
    isNull(gallery.deletedAt),
    sql`(
      COALESCE(${gallery.title}, '') ILIKE ${searchPattern} ESCAPE '\\'
      OR COALESCE(${gallery.camera}, '') ILIKE ${searchPattern} ESCAPE '\\'
      OR COALESCE(${gallery.lens}, '') ILIKE ${searchPattern} ESCAPE '\\'
      OR COALESCE(${gallery.focalLength}, '') ILIKE ${searchPattern} ESCAPE '\\'
      OR COALESCE(${gallery.aperture}, '') ILIKE ${searchPattern} ESCAPE '\\'
      OR COALESCE(${gallery.iso}::text, '') ILIKE ${searchPattern} ESCAPE '\\'
    )`,
  ];

  if (filters.localeScope === "current") {
    clauses.push(eq(gallery.locale, locale));
  }
  if (filters.dateFrom) {
    clauses.push(sql`${sortBy} >= ${parseDayStartUtc(filters.dateFrom)}`);
  }
  if (filters.dateTo) {
    clauses.push(sql`${sortBy} < ${parseDayEndExclusiveUtc(filters.dateTo)}`);
  }
  if (filters.camera) {
    clauses.push(
      sql`COALESCE(${gallery.camera}, '') ILIKE ${createLikePattern(filters.camera)} ESCAPE '\\'`
    );
  }
  if (filters.lens) {
    clauses.push(
      sql`COALESCE(${gallery.lens}, '') ILIKE ${createLikePattern(filters.lens)} ESCAPE '\\'`
    );
  }
  if (filters.focalLength) {
    clauses.push(
      sql`COALESCE(${gallery.focalLength}, '') ILIKE ${createLikePattern(filters.focalLength)} ESCAPE '\\'`
    );
  }
  if (filters.aperture) {
    clauses.push(
      sql`COALESCE(${gallery.aperture}, '') ILIKE ${createLikePattern(filters.aperture)} ESCAPE '\\'`
    );
  }
  if (typeof filters.isoMin === "number") {
    clauses.push(sql`${gallery.iso} >= ${filters.isoMin}`);
  }
  if (typeof filters.isoMax === "number") {
    clauses.push(sql`${gallery.iso} <= ${filters.isoMax}`);
  }
  if (cursor) {
    const cursorDate = new Date(cursor.sortAt);
    clauses.push(
      sql`(${sortBy} < ${cursorDate} OR (${sortBy} = ${cursorDate} AND ${gallery.id}::text < ${cursor.id}))`
    );
  }

  const rows = await db
    .select({
      id: gallery.id,
      locale: gallery.locale,
      title: gallery.title,
      camera: gallery.camera,
      lens: gallery.lens,
      focalLength: gallery.focalLength,
      aperture: gallery.aperture,
      iso: gallery.iso,
      thumbUrl: gallery.thumbUrl,
      fileUrl: gallery.fileUrl,
      sortAt: sortBy,
    })
    .from(gallery)
    .where(and(...clauses))
    .orderBy(desc(sortBy), desc(gallery.id))
    .limit(limit + 1);

  const mapped: SearchGalleryItem[] = rows.map((row) => ({
    id: row.id,
    section: "gallery",
    locale: normalizeLocale(row.locale),
    sortAt: normalizeDate(row.sortAt),
    imageId: getGalleryImageIdFromUrl(row.fileUrl),
    title: row.title,
    camera: row.camera,
    lens: row.lens,
    focalLength: row.focalLength,
    aperture: row.aperture,
    iso: row.iso,
    thumbUrl: row.thumbUrl,
    fileUrl: row.fileUrl,
  }));

  return buildResponse(mapped, limit);
}

function normalizeFilters(filters: SearchFilters): SearchFilters {
  const next: SearchFilters = {
    localeScope: filters.localeScope ?? "all",
  };

  if (filters.dateFrom) next.dateFrom = filters.dateFrom;
  if (filters.dateTo) next.dateTo = filters.dateTo;
  if (filters.tags && filters.tags.length > 0) next.tags = filters.tags;
  if (filters.location) next.location = filters.location;
  if (filters.camera) next.camera = filters.camera;
  if (filters.lens) next.lens = filters.lens;
  if (filters.focalLength) next.focalLength = filters.focalLength;
  if (filters.aperture) next.aperture = filters.aperture;
  if (typeof filters.isoMin === "number") next.isoMin = filters.isoMin;
  if (typeof filters.isoMax === "number") next.isoMax = filters.isoMax;

  return next;
}

export async function searchBySectionInNext<S extends SearchSection>(
  input: SearchRequest
): Promise<SearchSectionResponse<S>> {
  const request: SearchRequest & { limit: number } = {
    ...input,
    query: input.query.trim(),
    limit: Math.min(Math.max(input.limit ?? 12, 1), 30),
    filters: normalizeFilters(input.filters),
  };

  try {
    if (request.section === "post") {
      return searchPosts(request) as Promise<SearchSectionResponse<S>>;
    }
    if (request.section === "moment") {
      return searchMoments(request) as Promise<SearchSectionResponse<S>>;
    }
    return searchGallery(request) as Promise<SearchSectionResponse<S>>;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "next local search failed";
    throw new SearchSourceError(message, {
      source: "next",
      fallbackEligible: true,
      cause: error,
    });
  }
}

export type SearchResultBySection = {
  [S in SearchSection]: SearchSectionResponse<S>;
};

export type SearchItemUnion = SearchItemBySection[keyof SearchItemBySection];
