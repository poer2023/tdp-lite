import type { ActionItem, GalleryItem, Moment, Post } from "@/lib/content/types";

// Re-export the UI action card type from the content domain types.
export type { ActionItem };

export type FeedItem =
  | ({ type: "post" } & Post)
  | ({ type: "moment" } & Moment)
  | ({ type: "gallery" } & GalleryItem)
  | ActionItem;
