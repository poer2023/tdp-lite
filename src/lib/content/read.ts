import type { FeedItem } from "@/components/bento/types";
import { type AppLocale, normalizeLocale } from "@/lib/locale";
import type { GalleryItem, Moment, Post } from "@/lib/schema";
import {
  fetchPublicFeed,
  fetchPublicGallery,
  fetchPublicGalleryItem,
  fetchPublicMoment,
  fetchPublicMoments,
  fetchPublicPost,
  fetchPublicPosts,
} from "@/lib/publicApi";

export type Locale = AppLocale;

function toLocale(value: string): Locale {
  return normalizeLocale(value) as Locale;
}

function logReadError(scope: string, error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[content/read] ${scope} failed: ${message}`);
}

export async function getPublicFeed(locale: string, limit: number = 10): Promise<FeedItem[]> {
  try {
    return await fetchPublicFeed(toLocale(locale), limit);
  } catch (error) {
    logReadError("feed", error);
    return [];
  }
}

export async function getPublicPosts(locale: string): Promise<Post[]> {
  try {
    return await fetchPublicPosts(toLocale(locale));
  } catch (error) {
    logReadError("posts", error);
    return [];
  }
}

export async function getPublicPost(locale: string, slug: string): Promise<Post | null> {
  try {
    return await fetchPublicPost(toLocale(locale), slug);
  } catch (error) {
    logReadError(`post(${slug})`, error);
    return null;
  }
}

export async function getPublicMoments(locale: string): Promise<Moment[]> {
  try {
    return await fetchPublicMoments(toLocale(locale));
  } catch (error) {
    logReadError("moments", error);
    return [];
  }
}

export async function getPublicMoment(locale: string, id: string): Promise<Moment | null> {
  try {
    return await fetchPublicMoment(toLocale(locale), id);
  } catch (error) {
    logReadError(`moment(${id})`, error);
    return null;
  }
}

export async function getPublicGallery(locale: string): Promise<GalleryItem[]> {
  try {
    return await fetchPublicGallery(toLocale(locale));
  } catch (error) {
    logReadError("gallery", error);
    return [];
  }
}

export async function getPublicGalleryItem(
  locale: string,
  id: string
): Promise<GalleryItem | null> {
  try {
    return await fetchPublicGalleryItem(toLocale(locale), id);
  } catch (error) {
    logReadError(`gallery(${id})`, error);
    return null;
  }
}
