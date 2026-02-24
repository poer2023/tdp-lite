import { type AppLocale } from "@/lib/locale";

export type Tab = "moment" | "post" | "gallery";
export type Locale = AppLocale;

export interface MomentDraft {
  content: string;
  locale: Locale;
  visibility: "public" | "private";
  locationName: string;
  images: File[];
}

export interface PostDraft {
  title: string;
  content: string;
  excerpt: string;
  tags: string;
  locale: Locale;
  status: "draft" | "published";
  cover: File | null;
}

export interface GalleryDraft {
  title: string;
  image: File | null;
}

export const defaultMomentDraft: MomentDraft = {
  content: "",
  locale: "en",
  visibility: "public",
  locationName: "",
  images: [],
};

export const defaultPostDraft: PostDraft = {
  title: "",
  content: "",
  excerpt: "",
  tags: "",
  locale: "en",
  status: "draft",
  cover: null,
};

export const defaultGalleryDraft: GalleryDraft = {
  title: "",
  image: null,
};
