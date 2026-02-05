import { Post, Moment, GalleryItem } from "@/lib/schema";

export type FeedItem =
  | ({ type: "post" } & Post)
  | ({ type: "moment" } & Moment)
  | ({ type: "gallery" } & GalleryItem);
