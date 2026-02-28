import { describe, expect, it } from "vitest";
import type { GalleryItem, Moment, Post } from "@/lib/content/types";
import { reviveSearchFeedItem } from "../feedItemSnapshot";
import { buildSearchSnapshot, searchWithinSnapshotDocuments } from "../searchSnapshot";

const baseDate = new Date("2026-02-28T12:00:00.000Z");

function makePost(overrides: Partial<Post> = {}): Post {
  return {
    id: "post-1",
    translationKey: "post-tk-1",
    slug: "atelier-notes",
    locale: "en",
    title: "Atelier Notes",
    excerpt: "Search systems and quiet interfaces.",
    content: "Designing a lightweight search snapshot for the atelier.",
    coverUrl: null,
    tags: ["search", "design"],
    status: "published",
    publishedAt: baseDate,
    createdAt: baseDate,
    updatedAt: baseDate,
    ...overrides,
  };
}

function makeMoment(overrides: Partial<Moment> = {}): Moment {
  return {
    id: "moment-1",
    translationKey: "moment-tk-1",
    content: "Late walk through Tokyo alleys.",
    media: [],
    locale: "en",
    visibility: "public",
    location: { name: "Tokyo" },
    status: "published",
    publishedAt: new Date("2026-02-27T10:00:00.000Z"),
    createdAt: new Date("2026-02-27T10:00:00.000Z"),
    updatedAt: new Date("2026-02-27T10:00:00.000Z"),
    deletedAt: null,
    ...overrides,
  };
}

function makeGalleryItem(overrides: Partial<GalleryItem> = {}): GalleryItem {
  return {
    id: "gallery-1",
    translationKey: "gallery-tk-1",
    locale: "en",
    fileUrl: "https://cdn.example.com/gallery/frame.jpg",
    thumbUrl: "https://cdn.example.com/gallery/frame-thumb.jpg",
    title: "Leica Street Frame",
    width: 1200,
    height: 1600,
    capturedAt: baseDate,
    camera: "Leica M6",
    lens: "35mm",
    focalLength: "35mm",
    aperture: "f/2.0",
    iso: 400,
    latitude: null,
    longitude: null,
    isLivePhoto: false,
    videoUrl: null,
    status: "published",
    publishedAt: new Date("2026-02-26T09:00:00.000Z"),
    createdAt: new Date("2026-02-26T09:00:00.000Z"),
    updatedAt: new Date("2026-02-26T09:00:00.000Z"),
    deletedAt: null,
    ...overrides,
  };
}

describe("search snapshot", () => {
  it("builds a locale snapshot and finds matching posts", () => {
    const snapshot = buildSearchSnapshot({
      locale: "en",
      posts: [makePost({ title: "Search Atelier" })],
      moments: [makeMoment()],
      gallery: [makeGalleryItem()],
      generatedAt: "2026-02-28T12:00:00.000Z",
    });

    const result = searchWithinSnapshotDocuments({
      documents: snapshot.items,
      request: {
        section: "post",
        query: "atelier",
        locale: "en",
        filters: { localeScope: "all" },
        limit: 12,
      },
    });

    expect(snapshot.counts.post).toBe(1);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.section).toBe("post");
    expect(result.items[0]?.title).toBe("Search Atelier");
    expect(result.items[0]?.feedItem?.type).toBe("post");
    const feedItem = result.items[0]?.feedItem;
    expect(feedItem).toBeDefined();
    expect(reviveSearchFeedItem(feedItem!)).toHaveProperty("type", "post");
  });

  it("honors section-specific metadata filters for gallery", () => {
    const snapshot = buildSearchSnapshot({
      locale: "en",
      posts: [],
      moments: [],
      gallery: [
        makeGalleryItem({ camera: "Leica M6" }),
        makeGalleryItem({
          id: "gallery-2",
          camera: "Nikon FM2",
          title: "Nikon Frame",
        }),
      ],
    });

    const result = searchWithinSnapshotDocuments({
      documents: snapshot.items,
      request: {
        section: "gallery",
        query: "frame",
        locale: "en",
        filters: { localeScope: "all", camera: "Leica" },
        limit: 12,
      },
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.camera).toBe("Leica M6");
  });

  it("supports cross-locale documents when localeScope is all", () => {
    const enSnapshot = buildSearchSnapshot({
      locale: "en",
      posts: [makePost({ id: "post-en", locale: "en", title: "Kyoto Post" })],
      moments: [],
      gallery: [],
    });
    const zhSnapshot = buildSearchSnapshot({
      locale: "zh",
      posts: [
        makePost({
          id: "post-zh",
          locale: "zh",
          slug: "jing-du",
          title: "京都手记",
          content: "记录京都夜色",
        }),
      ],
      moments: [],
      gallery: [],
    });

    const result = searchWithinSnapshotDocuments({
      documents: [...enSnapshot.items, ...zhSnapshot.items],
      request: {
        section: "post",
        query: "京都",
        locale: "en",
        filters: { localeScope: "all" },
        limit: 12,
      },
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.locale).toBe("zh");
    expect(result.items[0]?.title).toBe("京都手记");
  });
});
