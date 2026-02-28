export interface MediaItem {
  type: "image" | "video" | "audio";
  url: string;
  width?: number;
  height?: number;
  thumbnailUrl?: string;
  title?: string;
  artist?: string;
  album?: string;
  duration?: string;
  capturedAt?: Date;
  camera?: string;
  lens?: string;
  focalLength?: string;
  aperture?: string;
  iso?: number;
  latitude?: number;
  longitude?: number;
}

export interface Location {
  name: string;
  lat?: number;
  lng?: number;
}

export interface Post {
  id: string;
  translationKey: string;
  slug: string;
  locale: string;
  title: string;
  excerpt: string | null;
  content: string;
  coverUrl: string | null;
  tags: string[] | null;
  status: string;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Moment {
  id: string;
  translationKey: string;
  content: string;
  media: MediaItem[] | null;
  locale: string;
  visibility: string;
  location: Location | null;
  status: string;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface GalleryItem {
  id: string;
  translationKey: string;
  locale: string;
  fileUrl: string;
  thumbUrl: string | null;
  title: string | null;
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
  isLivePhoto: boolean | null;
  videoUrl: string | null;
  status: string;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface ActionItem {
  type: "action";
  id: string;
  icon: string;
  label: string;
}
