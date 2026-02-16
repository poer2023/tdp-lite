import { db } from "@/lib/db";
import {
  gallery,
  moments,
  posts,
  type GalleryItem,
  type Moment,
  type Post,
} from "@/lib/schema";
import { generateSlug } from "@/lib/slug";
import type {
  PreviewDraftPayload,
  PublishGalleryInput,
  PublishMomentInput,
  PublishPostInput,
} from "./contracts";

export async function createMomentEntry(
  input: PublishMomentInput
): Promise<Moment> {
  const location = input.locationName ? { name: input.locationName } : null;

  const [record] = await db
    .insert(moments)
    .values({
      content: input.content.trim(),
      media: input.media,
      locale: input.locale,
      visibility: input.visibility,
      location,
    })
    .returning();

  return record;
}

export async function createPostEntry(input: PublishPostInput): Promise<Post> {
  const status = input.status;
  const publishedAt = status === "published" ? new Date() : null;

  const [record] = await db
    .insert(posts)
    .values({
      slug: generateSlug(input.title),
      locale: input.locale,
      title: input.title.trim(),
      excerpt: input.excerpt?.trim() || null,
      content: input.content.trim(),
      coverUrl: input.coverUrl || null,
      tags: input.tags,
      status,
      publishedAt,
    })
    .returning();

  return record;
}

export async function createGalleryEntry(
  input: PublishGalleryInput
): Promise<GalleryItem> {
  const [record] = await db
    .insert(gallery)
    .values({
      fileUrl: input.fileUrl,
      thumbUrl: input.thumbUrl || null,
      title: input.title?.trim() || null,
      width: input.width || null,
      height: input.height || null,
      capturedAt: input.capturedAt ? new Date(input.capturedAt) : null,
      camera: input.camera || null,
      lens: input.lens || null,
      focalLength: input.focalLength || null,
      aperture: input.aperture || null,
      iso: input.iso || null,
      latitude: input.latitude || null,
      longitude: input.longitude || null,
      isLivePhoto: input.isLivePhoto || false,
      videoUrl: input.videoUrl || null,
    })
    .returning();

  return record;
}

export type PublishExecutionResult = {
  kind: "moment" | "post" | "gallery";
  id: string;
  url: string;
  publishedAt: string;
};

function toMomentUrl(locale: string, momentId: string): string {
  return `/${locale}/moments/${momentId}`;
}

function toPostUrl(locale: string, slug: string): string {
  return `/${locale}/posts/${slug}`;
}

function toGalleryUrl(locale: string): string {
  return `/${locale}/gallery`;
}

export async function publishByPayload(
  payload: PreviewDraftPayload
): Promise<PublishExecutionResult> {
  if (payload.kind === "moment") {
    const record = await createMomentEntry(payload.data);
    return {
      kind: "moment",
      id: record.id,
      url: toMomentUrl(record.locale, record.id),
      publishedAt: record.createdAt.toISOString(),
    };
  }

  if (payload.kind === "post") {
    const record = await createPostEntry(payload.data);
    return {
      kind: "post",
      id: record.id,
      url: toPostUrl(record.locale, record.slug),
      publishedAt: (record.publishedAt || record.createdAt).toISOString(),
    };
  }

  const record = await createGalleryEntry(payload.data);
  return {
    kind: "gallery",
    id: record.id,
    url: toGalleryUrl(payload.data.locale),
    publishedAt: record.createdAt.toISOString(),
  };
}
