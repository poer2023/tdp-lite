import { z } from "zod";

export const localeSchema = z.enum(["en", "zh"]).default("en");
export const visibilitySchema = z.enum(["public", "private"]).default("public");
export const postStatusSchema = z.enum(["draft", "published"]).default("draft");
export const cardSpanSchema = z.enum(["1x1", "1x2", "2x1", "2x2"]);
export const manageCardSpanValueSchema = z.enum([
  "auto",
  "1x1",
  "1x2",
  "2x1",
  "2x2",
]);
export const manageContentKindSchema = z.enum(["moment", "post"]);
export const manageContentStatusSchema = z
  .enum(["all", "draft", "published", "archived"])
  .default("all");

export const mediaItemSchema = z.object({
  type: z.enum(["image", "video"]),
  url: z.string().url(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  thumbnailUrl: z.string().url().optional(),
});

const timestampStringSchema = z.string().refine((value) => {
  return !Number.isNaN(new Date(value).getTime());
}, "Invalid datetime");

export const publishMomentInputSchema = z
  .object({
    content: z.string().trim(),
    locale: localeSchema,
    visibility: visibilitySchema,
    locationName: z.string().trim().min(1).optional(),
    media: z.array(mediaItemSchema).default([]),
    cardSpan: cardSpanSchema.optional(),
  })
  .refine((value) => value.content.length > 0 || value.media.length > 0, {
    message: "content or media is required",
    path: ["content"],
  });

export const previewMomentInputSchema = z.object({
  content: z.string().trim().default(""),
  locale: localeSchema,
  visibility: visibilitySchema,
  locationName: z.string().trim().min(1).optional(),
  media: z.array(mediaItemSchema).default([]),
  cardSpan: cardSpanSchema.optional(),
});

export const publishPostInputSchema = z.object({
  title: z.string().trim().min(1),
  content: z.string().trim().min(1),
  excerpt: z.string().trim().min(1).optional(),
  locale: localeSchema,
  tags: z.array(z.string().trim().min(1)).default([]),
  status: postStatusSchema,
  coverUrl: z.string().url().optional(),
  cardSpan: cardSpanSchema.optional(),
});

export const previewPostInputSchema = z.object({
  title: z.string().trim().default(""),
  content: z.string().trim().default(""),
  excerpt: z.string().trim().min(1).optional(),
  locale: localeSchema,
  tags: z.array(z.string().trim().min(1)).default([]),
  status: postStatusSchema,
  coverUrl: z.string().url().optional(),
  cardSpan: cardSpanSchema.optional(),
});

export const publishGalleryInputSchema = z.object({
  locale: localeSchema,
  fileUrl: z.string().url(),
  thumbUrl: z.string().url().optional(),
  title: z.string().trim().min(1).optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  capturedAt: z.string().datetime().optional(),
  camera: z.string().trim().min(1).optional(),
  lens: z.string().trim().min(1).optional(),
  focalLength: z.string().trim().min(1).optional(),
  aperture: z.string().trim().min(1).optional(),
  iso: z.number().int().positive().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  isLivePhoto: z.boolean().optional(),
  videoUrl: z.string().url().optional(),
});

export const previewGalleryInputSchema = publishGalleryInputSchema;

export const publishDraftPayloadSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("moment"), data: publishMomentInputSchema }),
  z.object({ kind: z.literal("post"), data: publishPostInputSchema }),
  z.object({ kind: z.literal("gallery"), data: publishGalleryInputSchema }),
]);

export const previewDraftPayloadSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("moment"), data: previewMomentInputSchema }),
  z.object({ kind: z.literal("post"), data: previewPostInputSchema }),
  z.object({ kind: z.literal("gallery"), data: previewGalleryInputSchema }),
]);

export const previewSessionRequestSchema = z.object({
  sessionId: z.string().uuid().optional(),
  payload: previewDraftPayloadSchema,
});

export const publishRequestSchema = z.object({
  idempotencyKey: z.string().trim().min(1).max(128).optional(),
  payload: publishDraftPayloadSchema,
});

export const previewSessionResponseSchema = z.object({
  sessionId: z.string().uuid(),
  expiresAt: z.string().datetime(),
  cardPreviewUrl: z.string().url(),
  detailPreviewUrl: z.string().url(),
});

export const mediaUploadResponseSchema = z.object({
  url: z.string().url(),
  mimeType: z.string(),
  size: z.number().int().nonnegative(),
  kind: z.enum(["image", "video"]),
});

export const publishResultSchema = z.object({
  kind: z.enum(["moment", "post", "gallery"]),
  id: z.string().uuid(),
  url: z.string(),
  publishedAt: z.string().datetime(),
});

export const managedPostSchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  locale: localeSchema,
  title: z.string(),
  excerpt: z.string().optional(),
  content: z.string(),
  coverUrl: z.string().url().optional(),
  tags: z.array(z.string()).default([]),
  status: z.enum(["draft", "published", "archived"]),
  cardSpan: z.union([cardSpanSchema, z.null()]).optional(),
  publishedAt: timestampStringSchema.optional(),
  createdAt: timestampStringSchema,
  updatedAt: timestampStringSchema,
  revision: z.number().int().positive(),
});

export const managedMomentSchema = z.object({
  id: z.string().uuid(),
  content: z.string(),
  media: z.array(mediaItemSchema).default([]),
  locale: localeSchema,
  visibility: visibilitySchema,
  location: z
    .object({
      name: z.string(),
      lat: z.number().optional(),
      lng: z.number().optional(),
    })
    .optional(),
  status: z.enum(["draft", "published", "archived"]),
  cardSpan: z.union([cardSpanSchema, z.null()]).optional(),
  publishedAt: timestampStringSchema.optional(),
  createdAt: timestampStringSchema,
  updatedAt: timestampStringSchema,
});

export const managedPostListResponseSchema = z.object({
  items: z.array(managedPostSchema),
  limit: z.number().int().positive(),
  offset: z.number().int().nonnegative(),
  locale: localeSchema,
  status: manageContentStatusSchema,
});

export const managedMomentListResponseSchema = z.object({
  items: z.array(managedMomentSchema),
  limit: z.number().int().positive(),
  offset: z.number().int().nonnegative(),
  locale: localeSchema,
  status: manageContentStatusSchema,
});

export const manageActionResultSchema = z.object({
  ok: z.literal(true),
});

export const manageCardSpanUpdateSchema = z.object({
  cardSpan: manageCardSpanValueSchema,
});

export type PublishDraftPayload = z.infer<typeof publishDraftPayloadSchema>;
export type PreviewDraftPayload = z.infer<typeof previewDraftPayloadSchema>;
export type PreviewSessionRequest = z.infer<typeof previewSessionRequestSchema>;
export type PublishRequest = z.infer<typeof publishRequestSchema>;
export type PreviewSessionResponse = z.infer<
  typeof previewSessionResponseSchema
>;
export type MediaUploadResponse = z.infer<typeof mediaUploadResponseSchema>;
export type PublishResult = z.infer<typeof publishResultSchema>;
export type ManageContentKind = z.infer<typeof manageContentKindSchema>;
export type ManageContentStatus = z.infer<typeof manageContentStatusSchema>;
export type ManagedPost = z.infer<typeof managedPostSchema>;
export type ManagedMoment = z.infer<typeof managedMomentSchema>;
export type ManagedPostListResponse = z.infer<
  typeof managedPostListResponseSchema
>;
export type ManagedMomentListResponse = z.infer<
  typeof managedMomentListResponseSchema
>;
export type ManageActionResult = z.infer<typeof manageActionResultSchema>;
export type ManageCardSpanValue = z.infer<typeof manageCardSpanValueSchema>;
export type ManageCardSpanUpdate = z.infer<typeof manageCardSpanUpdateSchema>;

export type PublisherTab = PreviewDraftPayload["kind"];
