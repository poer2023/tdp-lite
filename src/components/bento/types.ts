import { Post, Moment, GalleryItem } from "@/lib/schema";

export interface ActionItem {
  type: "action";
  id: string;
  icon: string;
  label: string;
}

export type FeedItem =
  | ({ type: "post" } & Post)
  | ({ type: "moment" } & Moment)
  | ({ type: "gallery" } & GalleryItem)
  | ActionItem;
