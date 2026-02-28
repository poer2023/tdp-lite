export const PUBLIC_CACHE_REVALIDATE = {
  presence: 10,
  feed: 30,
  contentList: 30,
  contentDetail: 30,
  profileSnapshot: 30,
} as const;

export const PUBLIC_CACHE_TAGS = {
  feed: "public:feed",
  posts: "public:posts",
  moments: "public:moments",
  gallery: "public:gallery",
  presence: "public:presence",
  profileSnapshot: "public:profile-snapshot",
} as const;

export function localeTag(baseTag: string, locale: string): string {
  return `${baseTag}:${locale}`;
}

export function itemTag(baseTag: string, locale: string, id: string): string {
  return `${baseTag}:${locale}:${id}`;
}

export function publicFeedTags(locale: string): string[] {
  return [PUBLIC_CACHE_TAGS.feed, localeTag(PUBLIC_CACHE_TAGS.feed, locale)];
}

export function publicPostsTags(locale: string): string[] {
  return [PUBLIC_CACHE_TAGS.posts, localeTag(PUBLIC_CACHE_TAGS.posts, locale)];
}

export function publicPostTags(locale: string, slug: string): string[] {
  return [...publicPostsTags(locale), itemTag("public:post", locale, slug)];
}

export function publicMomentsTags(locale: string): string[] {
  return [PUBLIC_CACHE_TAGS.moments, localeTag(PUBLIC_CACHE_TAGS.moments, locale)];
}

export function publicMomentTags(locale: string, id: string): string[] {
  return [...publicMomentsTags(locale), itemTag("public:moment", locale, id)];
}

export function publicGalleryTags(locale: string): string[] {
  return [PUBLIC_CACHE_TAGS.gallery, localeTag(PUBLIC_CACHE_TAGS.gallery, locale)];
}

export function publicGalleryItemTags(locale: string, id: string): string[] {
  return [...publicGalleryTags(locale), itemTag("public:gallery-item", locale, id)];
}
