import type { GalleryItem, MediaItem, Moment, Post } from "@/lib/schema";
import { generateSlug } from "@/lib/slug";
import type { GalleryDraft, MomentDraft, PostDraft } from "./types";

export function mapMomentDraftToPreview(
  draft: MomentDraft,
  mediaUrls: string[]
): Moment {
  const now = new Date();
  const media: MediaItem[] = mediaUrls.map((url) => ({ type: "image", url }));

  return {
    id: "preview-moment",
    content: draft.content.trim() || "Your moment preview will appear here.",
    media,
    locale: draft.locale,
    visibility: draft.visibility,
    location: draft.locationName.trim()
      ? { name: draft.locationName.trim() }
      : null,
    status: "draft",
    publishedAt: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };
}

export function mapPostDraftToPreview(
  draft: PostDraft,
  coverUrl: string | null
): Post {
  const title = draft.title.trim() || "Untitled Post";
  const content = draft.content.trim() || "Write your post content to preview it.";

  return {
    id: "preview-post",
    slug: generateSlug(title) || "untitled-post",
    locale: draft.locale,
    title,
    excerpt: draft.excerpt.trim() || null,
    content,
    coverUrl,
    tags: draft.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean),
    status: draft.status,
    publishedAt: draft.status === "published" ? new Date() : null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export function mapGalleryDraftToPreview(
  draft: GalleryDraft,
  imageUrl: string | null
): GalleryItem {
  const now = new Date();
  return {
    id: "preview-gallery",
    locale: "en",
    fileUrl:
      imageUrl ||
      "https://images.unsplash.com/photo-1500462918059-b1a0cb512f1d?q=80&w=600&auto=format&fit=crop",
    thumbUrl: imageUrl,
    title: draft.title.trim() || "Preview Photo",
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
    isLivePhoto: false,
    videoUrl: null,
    status: "draft",
    publishedAt: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };
}
