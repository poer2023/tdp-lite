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
    slug: text("slug").notNull(),
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
    status: text("status").notNull().default("published"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [index("idx_moments_created").on(table.createdAt)]
);

// Gallery - 图片相册
export const gallery = pgTable(
  "gallery",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    locale: text("locale").notNull().default("en"),
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
    status: text("status").notNull().default("published"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("idx_gallery_created").on(table.createdAt),
    index("idx_gallery_locale_created").on(table.locale, table.createdAt),
  ]
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

// Preview sessions - transient drafts for remote publisher iframe preview
export const previewSessions = pgTable(
  "preview_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    payload: jsonb("payload")
      .$type<Record<string, unknown>>()
      .notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("idx_preview_sessions_expires").on(table.expiresAt)]
);

// Publish idempotency keys - prevent duplicate writes on retries
export const publishIdempotencyKeys = pgTable(
  "publish_idempotency_keys",
  {
    key: text("key").primaryKey(),
    requestHash: text("request_hash").notNull(),
    response: jsonb("response")
      .$type<Record<string, unknown>>()
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("idx_publish_idempotency_created").on(table.createdAt)]
);

// Type exports
export type Post = typeof posts.$inferSelect;
export type NewPost = typeof posts.$inferInsert;
export type Moment = typeof moments.$inferSelect;
export type NewMoment = typeof moments.$inferInsert;
export type GalleryItem = typeof gallery.$inferSelect;
export type NewGalleryItem = typeof gallery.$inferInsert;
export type ApiKey = typeof apiKeys.$inferSelect;
export type NewApiKey = typeof apiKeys.$inferInsert;
export type PreviewSession = typeof previewSessions.$inferSelect;
export type NewPreviewSession = typeof previewSessions.$inferInsert;
export type PublishIdempotencyKey = typeof publishIdempotencyKeys.$inferSelect;
export type NewPublishIdempotencyKey = typeof publishIdempotencyKeys.$inferInsert;
