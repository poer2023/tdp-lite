import { z } from "zod";

export const localeSchema = z.enum(["en", "zh"]).default("en");
export const visibilitySchema = z.enum(["public", "private"]).default("public");
export const postStatusSchema = z.enum(["draft", "published"]).default("draft");

export const mediaItemSchema = z.object({
  type: z.enum(["image", "video"]),
  url: z.string().url(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  thumbnailUrl: z.string().url().optional(),
});

export const publishMomentInputSchema = z.object({
  content: z.string().trim().min(1),
  locale: localeSchema,
  visibility: visibilitySchema,
  locationName: z.string().trim().min(1).optional(),
  media: z.array(mediaItemSchema).default([]),
});

export const publishPostInputSchema = z.object({
  title: z.string().trim().min(1),
  content: z.string().trim().min(1),
  excerpt: z.string().trim().min(1).optional(),
  locale: localeSchema,
  tags: z.array(z.string().trim().min(1)).default([]),
  status: postStatusSchema,
  coverUrl: z.string().url().optional(),
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

export const previewDraftPayloadSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("moment"), data: publishMomentInputSchema }),
  z.object({ kind: z.literal("post"), data: publishPostInputSchema }),
  z.object({ kind: z.literal("gallery"), data: publishGalleryInputSchema }),
]);

export const previewSessionRequestSchema = z.object({
  sessionId: z.string().uuid().optional(),
  payload: previewDraftPayloadSchema,
});

export const publishRequestSchema = z.object({
  idempotencyKey: z.string().trim().min(1).max(128).optional(),
  payload: previewDraftPayloadSchema,
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

export type PreviewDraftPayload = z.infer<typeof previewDraftPayloadSchema>;
export type PreviewSessionRequest = z.infer<typeof previewSessionRequestSchema>;
export type PublishRequest = z.infer<typeof publishRequestSchema>;
export type PreviewSessionResponse = z.infer<typeof previewSessionResponseSchema>;
export type MediaUploadResponse = z.infer<typeof mediaUploadResponseSchema>;
export type PublishResult = z.infer<typeof publishResultSchema>;

export type PublisherTab = PreviewDraftPayload["kind"];
