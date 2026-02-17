import type { MediaItem, Moment, Post } from "@/lib/schema";
import { generateSlug } from "@/lib/slug";
import type { MomentDraft, PostDraft } from "./types";

export function mapMomentDraftToPreview(
  draft: MomentDraft,
  mediaUrls: string[]
): Moment {
  const now = new Date();
  const media: MediaItem[] = mediaUrls.map((url) => ({ type: "image", url }));
  const content = draft.content.trim();
  const resolvedContent =
    content || (media.length > 0 ? "" : "Your moment preview will appear here.");

  return {
    id: "preview-moment",
    content: resolvedContent,
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
