import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  integer,
  doublePrecision,
  boolean,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

// Posts - 长文章
export const posts = pgTable(
  "posts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    locale: text("locale").notNull().default("en"),
    title: text("title").notNull(),
    excerpt: text("excerpt"),
    content: text("content").notNull(),
    coverUrl: text("cover_url"),
    tags: jsonb("tags").$type<string[]>().default([]),
    status: text("status").notNull().default("draft"), // draft | published
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex("idx_posts_locale_slug").on(table.locale, table.slug)]
);

// Media type for moments
export interface MediaItem {
  type: "image" | "video";
  url: string;
  width?: number;
  height?: number;
  thumbnailUrl?: string;
}

// Location type
export interface Location {
  name: string;
  lat?: number;
  lng?: number;
}

// Moments - 短动态
export const moments = pgTable(
  "moments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    content: text("content").notNull(),
    media: jsonb("media").$type<MediaItem[]>().default([]),
    locale: text("locale").notNull().default("en"),
    visibility: text("visibility").notNull().default("public"), // public | private
    location: jsonb("location").$type<Location | null>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("idx_moments_created").on(table.createdAt)]
);

// Gallery - 图片相册
export const gallery = pgTable(
  "gallery",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    fileUrl: text("file_url").notNull(),
    thumbUrl: text("thumb_url"),
    title: text("title"),
    width: integer("width"),
    height: integer("height"),
    // EXIF data
    capturedAt: timestamp("captured_at", { withTimezone: true }),
    camera: text("camera"),
    lens: text("lens"),
    focalLength: text("focal_length"),
    aperture: text("aperture"),
    iso: integer("iso"),
    // Location
    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),
    // Live Photo
    isLivePhoto: boolean("is_live_photo").default(false),
    videoUrl: text("video_url"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("idx_gallery_created").on(table.createdAt)]
);

// API Keys - 认证
export const apiKeys = pgTable("api_keys", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  keyHash: text("key_hash").notNull().unique(),
  permissions: jsonb("permissions").$type<string[]>().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Type exports
export type Post = typeof posts.$inferSelect;
export type NewPost = typeof posts.$inferInsert;
export type Moment = typeof moments.$inferSelect;
export type NewMoment = typeof moments.$inferInsert;
export type GalleryItem = typeof gallery.$inferSelect;
export type NewGalleryItem = typeof gallery.$inferInsert;
export type ApiKey = typeof apiKeys.$inferSelect;
export type NewApiKey = typeof apiKeys.$inferInsert;
