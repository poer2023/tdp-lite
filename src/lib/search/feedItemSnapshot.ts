import type { FeedItem } from "@/components/bento/types";
import type { GalleryItem, MediaItem, Moment, Post } from "@/lib/content/types";

export interface SearchSerializedPostFeedItem {
  type: "post";
  id: string;
  translationKey: string;
  slug: string;
  locale: string;
  title: string;
  excerpt: string | null;
  content: string;
  coverUrl: string | null;
  tags: string[];
  status: string;
  cardSpan: Post["cardSpan"];
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SearchSerializedMediaItem {
  type: MediaItem["type"];
  url: string;
  width?: number;
  height?: number;
  thumbnailUrl?: string;
  title?: string;
  artist?: string;
  album?: string;
  duration?: string;
  capturedAt?: string;
  camera?: string;
  lens?: string;
  focalLength?: string;
  aperture?: string;
  iso?: number;
  latitude?: number;
  longitude?: number;
}

export interface SearchSerializedMomentFeedItem {
  type: "moment";
  id: string;
  translationKey: string;
  content: string;
  media: SearchSerializedMediaItem[];
  locale: string;
  visibility: string;
  location: {
    name: string;
    lat?: number;
    lng?: number;
  } | null;
  status: string;
  cardSpan: Moment["cardSpan"];
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface SearchSerializedGalleryFeedItem {
  type: "gallery";
  id: string;
  translationKey: string;
  locale: string;
  fileUrl: string;
  thumbUrl: string | null;
  title: string | null;
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
  isLivePhoto: boolean;
  videoUrl: string | null;
  status: string;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export type SearchSerializedFeedItem =
  | SearchSerializedPostFeedItem
  | SearchSerializedMomentFeedItem
  | SearchSerializedGalleryFeedItem;

function toIsoString(value: Date | string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

function toRequiredIsoString(value: Date | string): string {
  const resolved = toIsoString(value);
  return resolved ?? new Date(0).toISOString();
}

function toDate(value: string | null | undefined): Date | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

function serializeMediaItem(item: MediaItem): SearchSerializedMediaItem {
  return {
    type: item.type,
    url: item.url,
    width: item.width,
    height: item.height,
    thumbnailUrl: item.thumbnailUrl,
    title: item.title,
    artist: item.artist,
    album: item.album,
    duration: item.duration,
    capturedAt: toIsoString(item.capturedAt) ?? undefined,
    camera: item.camera,
    lens: item.lens,
    focalLength: item.focalLength,
    aperture: item.aperture,
    iso: item.iso,
    latitude: item.latitude,
    longitude: item.longitude,
  };
}

function reviveMediaItem(item: SearchSerializedMediaItem): MediaItem {
  return {
    type: item.type,
    url: item.url,
    width: item.width,
    height: item.height,
    thumbnailUrl: item.thumbnailUrl,
    title: item.title,
    artist: item.artist,
    album: item.album,
    duration: item.duration,
    capturedAt: toDate(item.capturedAt) ?? undefined,
    camera: item.camera,
    lens: item.lens,
    focalLength: item.focalLength,
    aperture: item.aperture,
    iso: item.iso,
    latitude: item.latitude,
    longitude: item.longitude,
  };
}

export function serializePostFeedItem(post: Post): SearchSerializedPostFeedItem {
  return {
    type: "post",
    id: post.id,
    translationKey: post.translationKey,
    slug: post.slug,
    locale: post.locale,
    title: post.title,
    excerpt: post.excerpt,
    content: post.content,
    coverUrl: post.coverUrl,
    tags: Array.isArray(post.tags) ? post.tags.filter(Boolean) : [],
    status: post.status,
    cardSpan: post.cardSpan,
    publishedAt: toIsoString(post.publishedAt),
    createdAt: toRequiredIsoString(post.createdAt),
    updatedAt: toRequiredIsoString(post.updatedAt),
  };
}

export function serializeMomentFeedItem(moment: Moment): SearchSerializedMomentFeedItem {
  return {
    type: "moment",
    id: moment.id,
    translationKey: moment.translationKey,
    content: moment.content,
    media: Array.isArray(moment.media) ? moment.media.map(serializeMediaItem) : [],
    locale: moment.locale,
    visibility: moment.visibility,
    location: moment.location
      ? {
          name: moment.location.name,
          lat: moment.location.lat,
          lng: moment.location.lng,
        }
      : null,
    status: moment.status,
    cardSpan: moment.cardSpan,
    publishedAt: toIsoString(moment.publishedAt),
    createdAt: toRequiredIsoString(moment.createdAt),
    updatedAt: toRequiredIsoString(moment.updatedAt),
    deletedAt: toIsoString(moment.deletedAt),
  };
}

export function serializeGalleryFeedItem(item: GalleryItem): SearchSerializedGalleryFeedItem {
  return {
    type: "gallery",
    id: item.id,
    translationKey: item.translationKey,
    locale: item.locale,
    fileUrl: item.fileUrl,
    thumbUrl: item.thumbUrl,
    title: item.title,
    width: item.width,
    height: item.height,
    capturedAt: toIsoString(item.capturedAt),
    camera: item.camera,
    lens: item.lens,
    focalLength: item.focalLength,
    aperture: item.aperture,
    iso: item.iso,
    latitude: item.latitude,
    longitude: item.longitude,
    isLivePhoto: Boolean(item.isLivePhoto),
    videoUrl: item.videoUrl,
    status: item.status,
    publishedAt: toIsoString(item.publishedAt),
    createdAt: toRequiredIsoString(item.createdAt),
    updatedAt: toRequiredIsoString(item.updatedAt),
    deletedAt: toIsoString(item.deletedAt),
  };
}

export function serializeFeedItem(
  item: FeedItem
): SearchSerializedFeedItem | null {
  if (item.type === "post") {
    return serializePostFeedItem(item);
  }

  if (item.type === "moment") {
    return serializeMomentFeedItem(item);
  }

  if (item.type === "gallery") {
    return serializeGalleryFeedItem(item);
  }

  return null;
}

export function reviveSearchFeedItem(item: SearchSerializedFeedItem): FeedItem {
  if (item.type === "post") {
    return {
      type: "post",
      id: item.id,
      translationKey: item.translationKey,
      slug: item.slug,
      locale: item.locale,
      title: item.title,
      excerpt: item.excerpt,
      content: item.content,
      coverUrl: item.coverUrl,
      tags: item.tags,
      status: item.status,
      cardSpan: item.cardSpan ?? null,
      publishedAt: toDate(item.publishedAt),
      createdAt: toDate(item.createdAt) ?? new Date(0),
      updatedAt: toDate(item.updatedAt) ?? new Date(0),
    };
  }

  if (item.type === "moment") {
    return {
      type: "moment",
      id: item.id,
      translationKey: item.translationKey,
      content: item.content,
      media: item.media.map(reviveMediaItem),
      locale: item.locale,
      visibility: item.visibility,
      location: item.location
        ? {
            name: item.location.name,
            lat: item.location.lat,
            lng: item.location.lng,
          }
        : null,
      status: item.status,
      cardSpan: item.cardSpan ?? null,
      publishedAt: toDate(item.publishedAt),
      createdAt: toDate(item.createdAt) ?? new Date(0),
      updatedAt: toDate(item.updatedAt) ?? new Date(0),
      deletedAt: toDate(item.deletedAt),
    };
  }

  return {
    type: "gallery",
    id: item.id,
    translationKey: item.translationKey,
    locale: item.locale,
    fileUrl: item.fileUrl,
    thumbUrl: item.thumbUrl,
    title: item.title,
    width: item.width,
    height: item.height,
    capturedAt: toDate(item.capturedAt),
    camera: item.camera,
    lens: item.lens,
    focalLength: item.focalLength,
    aperture: item.aperture,
    iso: item.iso,
    latitude: item.latitude,
    longitude: item.longitude,
    isLivePhoto: item.isLivePhoto,
    videoUrl: item.videoUrl,
    status: item.status,
    publishedAt: toDate(item.publishedAt),
    createdAt: toDate(item.createdAt) ?? new Date(0),
    updatedAt: toDate(item.updatedAt) ?? new Date(0),
    deletedAt: toDate(item.deletedAt),
  };
}
