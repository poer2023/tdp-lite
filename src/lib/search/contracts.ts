import { z } from "zod";

export type SearchSection = "post" | "moment" | "gallery";
export type LocaleScope = "all" | "current";
export type SupportedLocale = "en" | "zh";

const dateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const searchSectionSchema = z.enum(["post", "moment", "gallery"]);
export const localeScopeSchema = z.enum(["all", "current"]);
export const supportedLocaleSchema = z.enum(["en", "zh"]);

export const searchFiltersSchema = z.object({
  localeScope: localeScopeSchema.default("all"),
  dateFrom: dateStringSchema.optional(),
  dateTo: dateStringSchema.optional(),
  tags: z.array(z.string().trim().min(1)).optional(),
  location: z.string().trim().min(1).optional(),
  camera: z.string().trim().min(1).optional(),
  lens: z.string().trim().min(1).optional(),
  focalLength: z.string().trim().min(1).optional(),
  aperture: z.string().trim().min(1).optional(),
  isoMin: z.number().int().min(0).optional(),
  isoMax: z.number().int().min(0).optional(),
});

export const searchRequestSchema = z.object({
  section: searchSectionSchema,
  query: z.string().trim().min(2).max(200),
  locale: supportedLocaleSchema,
  filters: searchFiltersSchema.default({ localeScope: "all" }),
  cursor: z.string().trim().min(1).optional(),
  limit: z.number().int().min(1).max(30).default(12),
});

export interface SearchFilters {
  localeScope: LocaleScope;
  dateFrom?: string;
  dateTo?: string;
  tags?: string[];
  location?: string;
  camera?: string;
  lens?: string;
  focalLength?: string;
  aperture?: string;
  isoMin?: number;
  isoMax?: number;
}

export interface SearchRequest {
  section: SearchSection;
  query: string;
  locale: SupportedLocale;
  filters: SearchFilters;
  cursor?: string;
  limit?: number;
}

export interface SearchResponseItemBase {
  id: string;
  section: SearchSection;
  locale: SupportedLocale;
  sortAt: string;
}

export interface SearchPostItem extends SearchResponseItemBase {
  section: "post";
  slug: string;
  title: string;
  excerpt: string;
  tags: string[];
}

export interface SearchMomentItem extends SearchResponseItemBase {
  section: "moment";
  content: string;
  locationName: string | null;
}

export interface SearchGalleryItem extends SearchResponseItemBase {
  section: "gallery";
  title: string | null;
  camera: string | null;
  lens: string | null;
  focalLength: string | null;
  aperture: string | null;
  iso: number | null;
  thumbUrl: string | null;
  fileUrl: string;
}

export type SearchResponseItem =
  | SearchPostItem
  | SearchMomentItem
  | SearchGalleryItem;

export interface SearchResponse<T extends SearchResponseItem = SearchResponseItem> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface SearchCursorPayload {
  sortAt: string;
  id: string;
}

export type SearchItemBySection = {
  post: SearchPostItem;
  moment: SearchMomentItem;
  gallery: SearchGalleryItem;
};

export type SearchSectionResponse<S extends SearchSection> = SearchResponse<
  SearchItemBySection[S]
>;
