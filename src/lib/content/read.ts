import { and, desc, eq, isNull, sql } from "drizzle-orm";
import type { FeedItem } from "@/components/bento/types";
import { db } from "@/lib/db";
import { normalizeLocale, type AppLocale } from "@/lib/locale";
import { gallery, moments, posts, type GalleryItem, type Moment, type Post } from "@/lib/schema";

export type Locale = AppLocale;
type ContentFeedItem = Exclude<FeedItem, { type: "action" }>;

const postSortExpr = sql<Date>`coalesce(${posts.publishedAt}, ${posts.createdAt})`;
const momentSortExpr = sql<Date>`coalesce(${moments.publishedAt}, ${moments.createdAt})`;
const gallerySortExpr = sql<Date>`coalesce(${gallery.publishedAt}, ${gallery.createdAt})`;

async function listPublicPosts(locale: Locale, limit?: number): Promise<Post[]> {
  const baseQuery = db
    .select()
    .from(posts)
    .where(
      and(
        eq(posts.locale, locale),
        eq(posts.status, "published"),
        sql`deleted_at IS NULL`
      )
    )
    .orderBy(desc(postSortExpr));

  if (typeof limit === "number") {
    return baseQuery.limit(limit);
  }

  return baseQuery;
}

async function listPublicMoments(locale: Locale, limit?: number): Promise<Moment[]> {
  const baseQuery = db
    .select()
    .from(moments)
    .where(
      and(
        eq(moments.locale, locale),
        eq(moments.status, "published"),
        eq(moments.visibility, "public"),
        isNull(moments.deletedAt)
      )
    )
    .orderBy(desc(momentSortExpr));

  if (typeof limit === "number") {
    return baseQuery.limit(limit);
  }

  return baseQuery;
}

async function listPublicGallery(locale: Locale, limit?: number): Promise<GalleryItem[]> {
  const baseQuery = db
    .select()
    .from(gallery)
    .where(
      and(
        eq(gallery.locale, locale),
        eq(gallery.status, "published"),
        isNull(gallery.deletedAt)
      )
    )
    .orderBy(desc(gallerySortExpr));

  if (typeof limit === "number") {
    return baseQuery.limit(limit);
  }

  return baseQuery;
}

export async function getPublicFeed(locale: string, limit: number = 10): Promise<FeedItem[]> {
  const resolvedLocale = normalizeLocale(locale);
  const cappedLimit = Math.max(1, Math.min(limit, 100));

  const [postItems, momentItems, galleryItems] = await Promise.all([
    listPublicPosts(resolvedLocale, cappedLimit),
    listPublicMoments(resolvedLocale, cappedLimit),
    listPublicGallery(resolvedLocale, cappedLimit),
  ]);

  const allItems: ContentFeedItem[] = [
    ...postItems.map((item) => ({ type: "post" as const, ...item })),
    ...momentItems.map((item) => ({ type: "moment" as const, ...item })),
    ...galleryItems.map((item) => ({ type: "gallery" as const, ...item })),
  ];

  allItems.sort((a, b) => {
    const aSortAt = (a.publishedAt ?? a.createdAt).getTime();
    const bSortAt = (b.publishedAt ?? b.createdAt).getTime();
    return bSortAt - aSortAt;
  });

  return allItems.slice(0, cappedLimit);
}

export async function getPublicPosts(locale: string): Promise<Post[]> {
  return listPublicPosts(normalizeLocale(locale));
}

export async function getPublicPost(locale: string, slug: string): Promise<Post | null> {
  const resolvedLocale = normalizeLocale(locale);
  const rows = await db
    .select()
    .from(posts)
    .where(
      and(
        eq(posts.locale, resolvedLocale),
        eq(posts.slug, slug),
        eq(posts.status, "published"),
        sql`deleted_at IS NULL`
      )
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function getPublicMoments(locale: string): Promise<Moment[]> {
  return listPublicMoments(normalizeLocale(locale));
}

export async function getPublicMoment(locale: string, id: string): Promise<Moment | null> {
  const resolvedLocale = normalizeLocale(locale);
  const rows = await db
    .select()
    .from(moments)
    .where(
      and(
        eq(moments.locale, resolvedLocale),
        eq(moments.id, id),
        eq(moments.status, "published"),
        eq(moments.visibility, "public"),
        isNull(moments.deletedAt)
      )
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function getPublicGallery(locale: string): Promise<GalleryItem[]> {
  return listPublicGallery(normalizeLocale(locale));
}

export async function getPublicGalleryItem(
  locale: string,
  id: string
): Promise<GalleryItem | null> {
  const resolvedLocale = normalizeLocale(locale);
  const rows = await db
    .select()
    .from(gallery)
    .where(
      and(
        eq(gallery.locale, resolvedLocale),
        eq(gallery.id, id),
        eq(gallery.status, "published"),
        isNull(gallery.deletedAt)
      )
    )
    .limit(1);
  return rows[0] ?? null;
}
