import { describe, expect, it } from "vitest";
import type { GalleryItem, Moment, Post } from "@/lib/schema";
import type { ActionItem, FeedItem } from "../types";
import {
  BENTO_SPAN_CLASS,
  computeBentoSpans,
  getFeedItemLayoutKey,
  getHighlightedItemId,
  type BentoSpanKey,
} from "../layoutEngine";

function createPost(id: string, options?: { withCover?: boolean }): FeedItem {
  const post: Post = {
    id,
    slug: `slug-${id}`,
    locale: "en",
    title: `Post ${id}`,
    excerpt: "Excerpt",
    content: "Content",
    coverUrl: options?.withCover === false ? null : `https://example.com/${id}.jpg`,
    tags: [],
    status: "published",
    publishedAt: new Date("2026-02-16T00:00:00.000Z"),
    createdAt: new Date("2026-02-16T00:00:00.000Z"),
    updatedAt: new Date("2026-02-16T00:00:00.000Z"),
  };

  return { type: "post", ...post };
}

function createMoment(
  id: string,
  options?: { withMedia?: boolean; contentLength?: number }
): FeedItem {
  const contentLength = options?.contentLength ?? 50;
  const now = new Date("2026-02-16T00:00:00.000Z");
  const moment: Moment = {
    id,
    content: "x".repeat(contentLength),
    media: options?.withMedia
      ? [{ type: "image", url: `https://example.com/${id}.jpg` }]
      : [],
    locale: "en",
    visibility: "public",
    location: null,
    status: "published",
    publishedAt: now,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };

  return { type: "moment", ...moment };
}

function createGallery(
  id: string,
  options?: { width?: number | null; height?: number | null }
): FeedItem {
  const now = new Date("2026-02-16T00:00:00.000Z");
  const gallery: GalleryItem = {
    id,
    locale: "en",
    fileUrl: `https://example.com/${id}.jpg`,
    thumbUrl: null,
    title: null,
    width: options?.width ?? null,
    height: options?.height ?? null,
    capturedAt: null,
    camera: null,
    lens: null,
    focalLength: null,
    aperture: null,
    iso: null,
    latitude: null,
    longitude: null,
    isLivePhoto: false,
    videoUrl: null,
    status: "published",
    publishedAt: now,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };

  return { type: "gallery", ...gallery };
}

function createAction(id: string): FeedItem {
  const action: ActionItem = {
    type: "action",
    id,
    icon: "Pencil",
    label: "Create Entry",
  };
  return action;
}

const spanLookup = new Map<string, BentoSpanKey>(
  Object.entries(BENTO_SPAN_CLASS).map(([key, value]) => [value, key as BentoSpanKey])
);

function getSpanKey(layout: Record<string, string>, item: FeedItem): BentoSpanKey {
  const layoutKey = getFeedItemLayoutKey(item);
  const className = layout[layoutKey];
  const span = spanLookup.get(className);
  if (!span) {
    throw new Error(`Unknown layout class: ${className}`);
  }
  return span;
}

function countSpan(items: FeedItem[], layout: Record<string, string>, span: BentoSpanKey): number {
  return items.filter((item) => getSpanKey(layout, item) === span).length;
}

describe("layoutEngine", () => {
  it("returns stable spans for same input", () => {
    const items = [
      createPost("p1"),
      createMoment("m1", { withMedia: true }),
      createGallery("g1", { width: 800, height: 1200 }),
      createPost("p2", { withCover: false }),
      createMoment("m2", { contentLength: 140 }),
    ];

    const first = computeBentoSpans(items);
    const second = computeBentoSpans(items);
    expect(first).toEqual(second);
  });

  it("keeps existing items stable when prepending a non-content card", () => {
    const baseItems = [
      createPost("p1", { withCover: false }),
      createMoment("m1", { withMedia: false, contentLength: 60 }),
      createGallery("g1", { width: 1000, height: 1000 }),
      createPost("p2", { withCover: false }),
      createMoment("m2", { withMedia: false, contentLength: 90 }),
    ];

    const baseLayout = computeBentoSpans(baseItems);
    const prepended = [createAction("action-prepend"), ...baseItems];
    const nextLayout = computeBentoSpans(prepended);

    for (const item of baseItems) {
      const key = getFeedItemLayoutKey(item);
      expect(nextLayout[key]).toBe(baseLayout[key]);
    }
  });

  it("does not force first card to 2x2", () => {
    const items = [
      createPost("p-first-no-cover", { withCover: false }),
      createMoment("m1", { withMedia: true }),
      createGallery("g1", { width: 900, height: 700 }),
      createPost("p2"),
    ];

    const layout = computeBentoSpans(items);
    expect(getSpanKey(layout, items[0])).not.toBe("2x2");
  });

  it("enforces 2x2 cap rules", () => {
    const twentyItems = Array.from({ length: 20 }, (_, index) =>
      createPost(`post-large-${index}`)
    );
    const twentyLayout = computeBentoSpans(twentyItems);
    expect(countSpan(twentyItems, twentyLayout, "2x2")).toBeLessThanOrEqual(2);

    const sevenItems = Array.from({ length: 7 }, (_, index) =>
      createPost(`post-small-${index}`)
    );
    const sevenLayout = computeBentoSpans(sevenItems);
    expect(countSpan(sevenItems, sevenLayout, "2x2")).toBe(0);
  });

  it("keeps source order unchanged", () => {
    const items = [
      createMoment("m1", { withMedia: true }),
      createPost("p1"),
      createGallery("g1", { width: 1200, height: 600 }),
      createMoment("m2", { contentLength: 180 }),
    ];
    const expectedOrder = items.map((item) => getFeedItemLayoutKey(item));

    const layout = computeBentoSpans(items);
    expect(Object.keys(layout)).toEqual(expectedOrder);
  });

  it("uses content signals to influence span tendency", () => {
    const coveredPosts = Array.from({ length: 20 }, (_, index) =>
      createPost(`covered-${index}`)
    );
    const plainPosts = Array.from({ length: 20 }, (_, index) =>
      createPost(`plain-${index}`, { withCover: false })
    );

    const coveredLayout = computeBentoSpans(coveredPosts);
    const plainLayout = computeBentoSpans(plainPosts);

    const coveredLarge = coveredPosts.filter((item) =>
      ["1x2", "2x1", "2x2"].includes(getSpanKey(coveredLayout, item))
    ).length;
    const plainLarge = plainPosts.filter((item) =>
      ["1x2", "2x1", "2x2"].includes(getSpanKey(plainLayout, item))
    ).length;
    expect(coveredLarge).toBeGreaterThan(plainLarge);

    const verticalGallery = Array.from({ length: 20 }, (_, index) =>
      createGallery(`gallery-vertical-${index}`, { width: 700, height: 1400 })
    );
    const horizontalGallery = Array.from({ length: 20 }, (_, index) =>
      createGallery(`gallery-horizontal-${index}`, { width: 1600, height: 700 })
    );

    const verticalLayout = computeBentoSpans(verticalGallery);
    const horizontalLayout = computeBentoSpans(horizontalGallery);

    const verticalTall = countSpan(verticalGallery, verticalLayout, "1x2");
    const horizontalTall = countSpan(horizontalGallery, horizontalLayout, "1x2");
    const verticalWide = countSpan(verticalGallery, verticalLayout, "2x1");
    const horizontalWide = countSpan(horizontalGallery, horizontalLayout, "2x1");

    expect(verticalTall).toBeGreaterThan(horizontalTall);
    expect(horizontalWide).toBeGreaterThan(verticalWide);
  });

  it("always keeps action cards as 1x1", () => {
    const items = [
      createAction("action-1"),
      createPost("p1"),
      createAction("action-2"),
      createMoment("m1", { withMedia: true }),
    ];

    const layout = computeBentoSpans(items);

    const actionSpans = items
      .filter((item) => item.type === "action")
      .map((item) => getSpanKey(layout, item));

    expect(actionSpans).toEqual(["1x1", "1x1"]);
  });

  it("highlights first non-action item", () => {
    const items = [
      createAction("action-first"),
      createMoment("moment-first-content"),
      createPost("post-after"),
    ];
    expect(getHighlightedItemId(items)).toBe("moment-first-content");
  });
});
