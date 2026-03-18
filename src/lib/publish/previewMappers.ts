import type { GalleryItem, Moment, Post } from "@/lib/schema";
import { isVideoUrl } from "@/lib/media";
import { generateSlug } from "@/lib/slug";
import type {
  PreviewGalleryInput,
  PreviewMomentInput,
  PreviewPostInput,
} from "./contracts";

const NOW = () => new Date();

export function toPreviewMoment(input: PreviewMomentInput): Moment {
  const now = NOW();
  const content = input.content.trim();
  const hasMedia = input.media.length > 0;
  return {
    id: "preview-moment",
    translationKey: "preview-moment",
    content: content || (hasMedia ? "" : "你的动态预览会显示在这里。"),
    media: input.media,
    locale: input.locale,
    visibility: input.visibility,
    location: input.locationName ? { name: input.locationName } : null,
    status: "draft",
    cardSpan: input.cardSpan ?? null,
    publishedAt: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };
}

export function toPreviewPost(input: PreviewPostInput): Post {
  const now = NOW();
  const title = input.title.trim() || "未命名文章";
  const content = input.content.trim() || "填写正文后会在这里预览。";
  return {
    id: "preview-post",
    translationKey: "preview-post",
    slug: generateSlug(title) || "preview-post",
    locale: input.locale,
    title,
    excerpt: input.excerpt || null,
    content,
    coverUrl: input.coverUrl || null,
    tags: input.tags,
    status: input.status,
    cardSpan: input.cardSpan ?? null,
    publishedAt: input.status === "published" ? now : null,
    createdAt: now,
    updatedAt: now,
  };
}

export function toPreviewGallery(input: PreviewGalleryInput): GalleryItem {
  const now = NOW();
  return {
    id: "preview-gallery",
    translationKey: "preview-gallery",
    locale: input.locale,
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
    status: "draft",
    publishedAt: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };
}

export function inferPostCoverMediaType(
  input: PreviewPostInput
): "image" | "video" | undefined {
  if (!input.coverUrl) return undefined;
  return isVideoUrl(input.coverUrl) ? "video" : "image";
}

export function inferMomentHasMedia(input: PreviewMomentInput): boolean {
  return input.media.length > 0;
}

export function inferGalleryMediaType(input: PreviewGalleryInput): "image" | "video" {
  if (input.videoUrl) return "video";
  if (isVideoUrl(input.fileUrl)) return "video";
  return "image";
}
