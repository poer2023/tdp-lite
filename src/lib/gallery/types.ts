import type { Moment, Post } from "@/lib/schema";

export type GallerySourceType = "post" | "moment";
export type GallerySourcePosition = "post_cover" | "post_body" | "moment_media";
export type GalleryTimePreset = "all" | "today" | "7d" | "30d";

export interface GallerySourceEntry {
  sourceType: GallerySourceType;
  sourceId: string;
  sourcePath: string;
  sourceTitle: string;
  sourceDate: Date;
  position: GallerySourcePosition;
  mediaIndex?: number;
}

export interface GalleryImageAggregate {
  imageId: string;
  locale: "en" | "zh";
  normalizedUrl: string;
  imageUrl: string;
  thumbUrl: string | null;
  title: string;
  width: number | null;
  height: number | null;
  capturedAt: Date | null;
  camera: string | null;
  lens: string | null;
  focalLength: string | null;
  aperture: string | null;
  iso: number | null;
  latitude: number | null;
  longitude: number | null;
  latestAt: Date;
  sourceTypes: GallerySourceType[];
  sourceCount: number;
  sources: GallerySourceEntry[];
}

export interface GalleryImageAggregateDTO {
  imageId: string;
  locale: "en" | "zh";
  imageUrl: string;
  thumbUrl: string | null;
  title: string;
  width: number | null;
  height: number | null;
  capturedAt: string | null;
  camera: string | null;
  lens: string | null;
  focalLength: string | null;
  aperture: string | null;
  iso: number | null;
  latitude: number | null;
  longitude: number | null;
  latestAt: string;
  sourceTypes: GallerySourceType[];
  sourceCount: number;
  sources: Array<{
    sourceType: GallerySourceType;
    sourceId: string;
    sourcePath: string;
    sourceTitle: string;
    sourceDate: string;
    position: GallerySourcePosition;
    mediaIndex?: number;
  }>;
}

export interface GalleryFilterOptions {
  sourceTypes: GallerySourceType[];
  timePreset: GalleryTimePreset;
  now?: Date;
}

export interface GalleryAggregationInput {
  locale: "en" | "zh";
  posts: Post[];
  moments: Moment[];
}
