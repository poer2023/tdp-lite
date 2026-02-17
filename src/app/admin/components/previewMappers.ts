import type { GalleryItem, MediaItem, Moment, Post } from "@/lib/schema";
import {
  toPreviewGallery,
  toPreviewMoment,
  toPreviewPost,
} from "@/lib/publish/previewMappers";
import type { PublishGalleryInput, PublishMomentInput, PublishPostInput } from "@/lib/publish/contracts";
import type { GalleryDraft, MomentDraft, PostDraft } from "./types";

export function mapMomentDraftToPreview(
  draft: MomentDraft,
  mediaUrls: string[]
): Moment {
  const media: MediaItem[] = mediaUrls.map((url) => ({ type: "image", url }));
  const input: PublishMomentInput = {
    content: draft.content.trim() || "Your moment preview will appear here.",
    locale: draft.locale,
    visibility: draft.visibility,
    ...(draft.locationName.trim() ? { locationName: draft.locationName.trim() } : {}),
    media,
  };

  return toPreviewMoment(input);
}

export function mapPostDraftToPreview(
  draft: PostDraft,
  coverUrl: string | null
): Post {
  const title = draft.title.trim() || "Untitled Post";
  const input: PublishPostInput = {
    title,
    content: draft.content.trim() || "Write your post content to preview it.",
    ...(draft.excerpt.trim() ? { excerpt: draft.excerpt.trim() } : {}),
    locale: draft.locale,
    tags: draft.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean),
    status: draft.status,
    ...(coverUrl ? { coverUrl } : {}),
  };

  return toPreviewPost(input);
}

export function mapGalleryDraftToPreview(
  draft: GalleryDraft,
  imageUrl: string | null
): GalleryItem {
  const input: PublishGalleryInput = {
    locale: "en",
    fileUrl:
      imageUrl ||
      "https://images.unsplash.com/photo-1500462918059-b1a0cb512f1d?q=80&w=600&auto=format&fit=crop",
    ...(imageUrl ? { thumbUrl: imageUrl } : {}),
    ...(draft.title.trim() ? { title: draft.title.trim() } : { title: "Preview Photo" }),
  };

  return toPreviewGallery(input);
}
