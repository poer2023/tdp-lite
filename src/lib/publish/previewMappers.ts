import type { GalleryItem, Moment, Post } from "@/lib/schema";
import { isVideoUrl } from "@/lib/media";
import { generateSlug } from "@/lib/slug";
import type {
  PublishGalleryInput,
  PublishMomentInput,
  PublishPostInput,
} from "./contracts";

const NOW = () => new Date();

export function toPreviewMoment(input: PublishMomentInput): Moment {
  return {
    id: "preview-moment",
    content: input.content,
    media: input.media,
    locale: input.locale,
    visibility: input.visibility,
    location: input.locationName ? { name: input.locationName } : null,
    createdAt: NOW(),
  };
}

export function toPreviewPost(input: PublishPostInput): Post {
  const now = NOW();
  return {
    id: "preview-post",
    slug: generateSlug(input.title) || "preview-post",
    locale: input.locale,
    title: input.title,
    excerpt: input.excerpt || null,
    content: input.content,
    coverUrl: input.coverUrl || null,
    tags: input.tags,
    status: input.status,
    publishedAt: input.status === "published" ? now : null,
    createdAt: now,
    updatedAt: now,
  };
}

export function toPreviewGallery(input: PublishGalleryInput): GalleryItem {
  return {
    id: "preview-gallery",
    fileUrl: input.fileUrl,
    thumbUrl: input.thumbUrl || null,
    title: input.title || null,
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
    createdAt: NOW(),
  };
}

export function inferPostCoverMediaType(
  input: PublishPostInput
): "image" | "video" | undefined {
  if (!input.coverUrl) return undefined;
  return isVideoUrl(input.coverUrl) ? "video" : "image";
}

export function inferMomentHasMedia(input: PublishMomentInput): boolean {
  return input.media.length > 0;
}

export function inferGalleryMediaType(input: PublishGalleryInput): "image" | "video" {
  if (input.videoUrl) return "video";
  if (isVideoUrl(input.fileUrl)) return "video";
  return "image";
}
