import { Post, Moment, GalleryItem, ActionItem } from "@/lib/schema";

// Re-export ActionItem from schema for backward compatibility
export type { ActionItem };

export type FeedItem =
  | ({ type: "post" } & Post)
  | ({ type: "moment" } & Moment)
  | ({ type: "gallery" } & GalleryItem)
  | ActionItem;
