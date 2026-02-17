import { describe, expect, it } from "vitest";
import type { Moment, Post } from "@/lib/schema";
import {
  aggregateGalleryImages,
  extractImageUrlsFromPostContent,
  filterGalleryImages,
} from "../index";

function createPost(overrides: Partial<Post>): Post {
  return {
    id: overrides.id ?? "post-1",
    slug: overrides.slug ?? "post-1",
    locale: overrides.locale ?? "en",
    title: overrides.title ?? "Post Title",
    excerpt: overrides.excerpt ?? null,
    content: overrides.content ?? "",
    coverUrl: overrides.coverUrl ?? null,
    tags: overrides.tags ?? [],
    status: overrides.status ?? "published",
    publishedAt: overrides.publishedAt ?? new Date("2026-02-10T08:00:00.000Z"),
    createdAt: overrides.createdAt ?? new Date("2026-02-10T08:00:00.000Z"),
    updatedAt: overrides.updatedAt ?? new Date("2026-02-10T08:00:00.000Z"),
  };
}

function createMoment(overrides: Partial<Moment>): Moment {
  return {
    id: overrides.id ?? "moment-1",
    content: overrides.content ?? "Moment content",
    media: overrides.media ?? [],
    locale: overrides.locale ?? "en",
    visibility: overrides.visibility ?? "public",
    location: overrides.location ?? null,
    status: overrides.status ?? "published",
    publishedAt: overrides.publishedAt ?? new Date("2026-02-11T08:00:00.000Z"),
    createdAt: overrides.createdAt ?? new Date("2026-02-11T08:00:00.000Z"),
    updatedAt: overrides.updatedAt ?? new Date("2026-02-11T08:00:00.000Z"),
    deletedAt: overrides.deletedAt ?? null,
  };
}

describe("gallery aggregation", () => {
  it("extracts cover image and markdown/html body images from posts", () => {
    const urls = extractImageUrlsFromPostContent(`
      Intro
      ![one](https://cdn.example.com/body-a.jpg)
      <img src="https://cdn.example.com/body-b.jpg" />
      ![video](https://cdn.example.com/video.mp4)
    `);

    expect(urls).toEqual([
      "https://cdn.example.com/body-a.jpg",
      "https://cdn.example.com/body-b.jpg",
    ]);

    const post = createPost({
      id: "post-a",
      slug: "post-a",
      title: "Post A",
      coverUrl: "https://cdn.example.com/cover.jpg#hash",
      content: "![body](https://cdn.example.com/body.jpg)",
      publishedAt: new Date("2026-02-09T01:00:00.000Z"),
    });

    const items = aggregateGalleryImages({
      locale: "en",
      posts: [post],
      moments: [],
    });

    expect(items).toHaveLength(2);
    expect(items.map((item) => item.imageUrl)).toEqual([
      "https://cdn.example.com/cover.jpg",
      "https://cdn.example.com/body.jpg",
    ]);
    expect(items[0]?.title).toBe("Post A");
  });

  it("includes only image media from moments and carries metadata", () => {
    const moment = createMoment({
      id: "moment-a",
      content: "Street walk",
      media: [
        {
          type: "image",
          url: "https://cdn.example.com/moment.jpg",
          width: 1200,
          height: 800,
          camera: "Fujifilm X100V",
          iso: 400,
        },
        {
          type: "video",
          url: "https://cdn.example.com/moment.mp4",
        },
      ],
      publishedAt: new Date("2026-02-10T00:00:00.000Z"),
    });

    const items = aggregateGalleryImages({
      locale: "en",
      posts: [],
      moments: [moment],
    });

    expect(items).toHaveLength(1);
    expect(items[0]?.imageUrl).toBe("https://cdn.example.com/moment.jpg");
    expect(items[0]?.camera).toBe("Fujifilm X100V");
    expect(items[0]?.iso).toBe(400);
    expect(items[0]?.width).toBe(1200);
  });

  it("deduplicates by URL and aggregates source entries", () => {
    const sharedUrl = "https://cdn.example.com/shared.jpg";

    const post = createPost({
      id: "post-shared",
      slug: "post-shared",
      title: "Shared Post",
      coverUrl: sharedUrl,
      content: `![same](${sharedUrl})`,
      publishedAt: new Date("2026-02-10T10:00:00.000Z"),
    });

    const moment = createMoment({
      id: "moment-shared",
      content: "Shared moment",
      media: [{ type: "image", url: `${sharedUrl}#fragment` }],
      publishedAt: new Date("2026-02-11T10:00:00.000Z"),
    });

    const items = aggregateGalleryImages({
      locale: "en",
      posts: [post],
      moments: [moment],
    });

    expect(items).toHaveLength(1);
    expect(items[0]?.sourceCount).toBe(3);
    expect(items[0]?.sourceTypes).toEqual(["moment", "post"]);
    expect(items[0]?.latestAt.toISOString()).toBe("2026-02-11T10:00:00.000Z");
  });

  it("filters by source type and time preset", () => {
    const now = new Date("2026-02-17T12:00:00.000Z");

    const post = createPost({
      id: "post-filter",
      slug: "post-filter",
      title: "Post Filter",
      coverUrl: "https://cdn.example.com/post-filter.jpg",
      publishedAt: new Date("2026-02-16T12:00:00.000Z"),
    });

    const moment = createMoment({
      id: "moment-filter",
      content: "Moment Filter",
      media: [{ type: "image", url: "https://cdn.example.com/moment-filter.jpg" }],
      publishedAt: new Date("2026-01-01T12:00:00.000Z"),
    });

    const items = aggregateGalleryImages({
      locale: "en",
      posts: [post],
      moments: [moment],
    });

    const sourceFiltered = filterGalleryImages(items, {
      sourceTypes: ["post"],
      timePreset: "all",
      now,
    });
    expect(sourceFiltered).toHaveLength(1);
    expect(sourceFiltered[0]?.sourceTypes).toContain("post");

    const timeFiltered = filterGalleryImages(items, {
      sourceTypes: ["post", "moment"],
      timePreset: "7d",
      now,
    });
    expect(timeFiltered).toHaveLength(1);
    expect(timeFiltered[0]?.imageUrl).toBe("https://cdn.example.com/post-filter.jpg");
  });

  it("generates stable imageId for the same normalized URL", () => {
    const postOne = createPost({
      id: "post-one",
      slug: "post-one",
      title: "One",
      coverUrl: "https://cdn.example.com/stable.jpg#v1",
    });

    const postTwo = createPost({
      id: "post-two",
      slug: "post-two",
      title: "Two",
      coverUrl: "https://cdn.example.com/stable.jpg",
    });

    const first = aggregateGalleryImages({
      locale: "en",
      posts: [postOne],
      moments: [],
    });

    const second = aggregateGalleryImages({
      locale: "en",
      posts: [postTwo],
      moments: [],
    });

    expect(first[0]?.imageId).toBe(second[0]?.imageId);
  });
});
