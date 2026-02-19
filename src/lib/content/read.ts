import { and, desc, eq, isNull, sql } from "drizzle-orm";
import type { FeedItem } from "@/components/bento/types";
import { db } from "@/lib/db";
import { normalizeLocale, type AppLocale } from "@/lib/locale";
import { gallery, moments, posts, type GalleryItem, type Moment, type Post } from "@/lib/schema";

export type Locale = AppLocale;
type ContentFeedItem = Exclude<FeedItem, { type: "action" }>;

const CHINESE_LOCALE: Locale = "zh";

function alternateLocale(locale: Locale): Locale {
  return locale === CHINESE_LOCALE ? "en" : "zh";
}

const postSortExpr = sql<Date>`coalesce(${posts.publishedAt}, ${posts.createdAt})`;
const momentSortExpr = sql<Date>`coalesce(${moments.publishedAt}, ${moments.createdAt})`;
const gallerySortExpr = sql<Date>`coalesce(${gallery.publishedAt}, ${gallery.createdAt})`;

async function listPublicPosts(locale: Locale, limit?: number): Promise<Post[]> {
  const fallbackLocale = alternateLocale(locale);
  const localeClause =
    sql`(
      ${posts.locale} = ${locale}
      OR (
        ${posts.locale} = ${fallbackLocale}
        AND NOT EXISTS (
          SELECT 1
          FROM posts AS posts_primary
          WHERE posts_primary.translation_key = ${posts.translationKey}
            AND posts_primary.locale = ${locale}
            AND posts_primary.status = 'published'
            AND posts_primary.deleted_at IS NULL
        )
      )
    )`;

  const baseQuery = db
    .select()
    .from(posts)
    .where(
      and(
        localeClause,
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
  const fallbackLocale = alternateLocale(locale);
  const localeClause =
    sql`(
      ${moments.locale} = ${locale}
      OR (
        ${moments.locale} = ${fallbackLocale}
        AND NOT EXISTS (
          SELECT 1
          FROM moments AS moments_primary
          WHERE moments_primary.translation_key = ${moments.translationKey}
            AND moments_primary.locale = ${locale}
            AND moments_primary.status = 'published'
            AND moments_primary.visibility = 'public'
            AND moments_primary.deleted_at IS NULL
        )
      )
    )`;

  const baseQuery = db
    .select()
    .from(moments)
    .where(
      and(
        localeClause,
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
  const fallbackLocale = alternateLocale(locale);
  const localeClause =
    sql`(
      ${gallery.locale} = ${locale}
      OR (
        ${gallery.locale} = ${fallbackLocale}
        AND NOT EXISTS (
          SELECT 1
          FROM gallery AS gallery_primary
          WHERE gallery_primary.translation_key = ${gallery.translationKey}
            AND gallery_primary.locale = ${locale}
            AND gallery_primary.status = 'published'
            AND gallery_primary.deleted_at IS NULL
        )
      )
    )`;

  const baseQuery = db
    .select()
    .from(gallery)
    .where(
      and(
        localeClause,
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

async function findPublicPostBySlug(locale: Locale, slug: string): Promise<Post | null> {
  const rows = await db
    .select()
    .from(posts)
    .where(
      and(
        eq(posts.locale, locale),
        eq(posts.slug, slug),
        eq(posts.status, "published"),
        sql`deleted_at IS NULL`
      )
    )
    .limit(1);
  return rows[0] ?? null;
}

async function findPublicPostByTranslationKey(
  locale: Locale,
  translationKey: string
): Promise<Post | null> {
  const rows = await db
    .select()
    .from(posts)
    .where(
      and(
        eq(posts.locale, locale),
        eq(posts.translationKey, translationKey),
        eq(posts.status, "published"),
        sql`deleted_at IS NULL`
      )
    )
    .limit(1);
  return rows[0] ?? null;
}

async function findPublicMomentById(locale: Locale, id: string): Promise<Moment | null> {
  const rows = await db
    .select()
    .from(moments)
    .where(
      and(
        eq(moments.locale, locale),
        eq(moments.id, id),
        eq(moments.status, "published"),
        eq(moments.visibility, "public"),
        isNull(moments.deletedAt)
      )
    )
    .limit(1);
  return rows[0] ?? null;
}

async function findPublicMomentByTranslationKey(
  locale: Locale,
  translationKey: string
): Promise<Moment | null> {
  const rows = await db
    .select()
    .from(moments)
    .where(
      and(
        eq(moments.locale, locale),
        eq(moments.translationKey, translationKey),
        eq(moments.status, "published"),
        eq(moments.visibility, "public"),
        isNull(moments.deletedAt)
      )
    )
    .limit(1);
  return rows[0] ?? null;
}

async function findPublicGalleryById(locale: Locale, id: string): Promise<GalleryItem | null> {
  const rows = await db
    .select()
    .from(gallery)
    .where(
      and(
        eq(gallery.locale, locale),
        eq(gallery.id, id),
        eq(gallery.status, "published"),
        isNull(gallery.deletedAt)
      )
    )
    .limit(1);
  return rows[0] ?? null;
}

async function findPublicGalleryByTranslationKey(
  locale: Locale,
  translationKey: string
): Promise<GalleryItem | null> {
  const rows = await db
    .select()
    .from(gallery)
    .where(
      and(
        eq(gallery.locale, locale),
        eq(gallery.translationKey, translationKey),
        eq(gallery.status, "published"),
        isNull(gallery.deletedAt)
      )
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function getPublicFeed(locale: string, limit: number = 10): Promise<FeedItem[]> {
  const resolvedLocale = normalizeLocale(locale);
  const cappedLimit = Math.max(1, Math.min(limit, 100));

  const [postItems, momentItems] = await Promise.all([
    listPublicPosts(resolvedLocale, cappedLimit),
    listPublicMoments(resolvedLocale, cappedLimit),
  ]);

  const allItems: ContentFeedItem[] = [
    ...postItems.map((item) => ({ type: "post" as const, ...item })),
    ...momentItems.map((item) => ({ type: "moment" as const, ...item })),
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
  const directMatch = await findPublicPostBySlug(resolvedLocale, slug);
  if (directMatch) {
    return directMatch;
  }

  const fallbackLocale = alternateLocale(resolvedLocale);
  const fallbackMatch = await findPublicPostBySlug(fallbackLocale, slug);
  if (!fallbackMatch) {
    return null;
  }

  const localizedVariant = await findPublicPostByTranslationKey(
    resolvedLocale,
    fallbackMatch.translationKey
  );
  return localizedVariant ?? fallbackMatch;
}

export async function getPublicPostByTranslationKey(
  locale: string,
  translationKey: string
): Promise<Post | null> {
  const resolvedLocale = normalizeLocale(locale);
  const directMatch = await findPublicPostByTranslationKey(
    resolvedLocale,
    translationKey
  );
  if (directMatch) {
    return directMatch;
  }

  return findPublicPostByTranslationKey(
    alternateLocale(resolvedLocale),
    translationKey
  );
}

export async function getPublicMoments(locale: string): Promise<Moment[]> {
  return listPublicMoments(normalizeLocale(locale));
}

export async function getPublicMoment(locale: string, id: string): Promise<Moment | null> {
  const resolvedLocale = normalizeLocale(locale);
  const directMatch = await findPublicMomentById(resolvedLocale, id);
  if (directMatch) {
    return directMatch;
  }

  const fallbackLocale = alternateLocale(resolvedLocale);
  const fallbackMatch = await findPublicMomentById(fallbackLocale, id);
  if (!fallbackMatch) {
    return null;
  }

  const localizedVariant = await findPublicMomentByTranslationKey(
    resolvedLocale,
    fallbackMatch.translationKey
  );
  return localizedVariant ?? fallbackMatch;
}

export async function getPublicMomentByTranslationKey(
  locale: string,
  translationKey: string
): Promise<Moment | null> {
  const resolvedLocale = normalizeLocale(locale);
  const directMatch = await findPublicMomentByTranslationKey(
    resolvedLocale,
    translationKey
  );
  if (directMatch) {
    return directMatch;
  }

  return findPublicMomentByTranslationKey(
    alternateLocale(resolvedLocale),
    translationKey
  );
}

export async function getPublicGallery(locale: string): Promise<GalleryItem[]> {
  return listPublicGallery(normalizeLocale(locale));
}

export async function getPublicGalleryItem(
  locale: string,
  id: string
): Promise<GalleryItem | null> {
  const resolvedLocale = normalizeLocale(locale);
  const directMatch = await findPublicGalleryById(resolvedLocale, id);
  if (directMatch) {
    return directMatch;
  }

  const fallbackLocale = alternateLocale(resolvedLocale);
  const fallbackMatch = await findPublicGalleryById(fallbackLocale, id);
  if (!fallbackMatch) {
    return null;
  }

  const localizedVariant = await findPublicGalleryByTranslationKey(
    resolvedLocale,
    fallbackMatch.translationKey
  );
  return localizedVariant ?? fallbackMatch;
}

export async function getPublicGalleryItemByTranslationKey(
  locale: string,
  translationKey: string
): Promise<GalleryItem | null> {
  const resolvedLocale = normalizeLocale(locale);
  const directMatch = await findPublicGalleryByTranslationKey(
    resolvedLocale,
    translationKey
  );
  if (directMatch) {
    return directMatch;
  }

  return findPublicGalleryByTranslationKey(
    alternateLocale(resolvedLocale),
    translationKey
  );
}
