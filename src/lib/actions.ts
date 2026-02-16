"use server";

import { revalidatePath } from "next/cache";
import { auth } from "./auth";
import { db } from "./db";
import { posts, moments, gallery, type MediaItem } from "./schema";
import { uploadImage } from "./r2";
import { eq } from "drizzle-orm";
import {
  createGalleryEntry,
  createMomentEntry,
  createPostEntry,
} from "./publish/service";

/**
 * Ensure user is authenticated, throw if not
 */
async function requireAuth() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }
  return session.user;
}

/**
 * Create a new moment (short post with optional media)
 */
export async function createMoment(formData: FormData) {
  await requireAuth();

  const content = formData.get("content") as string;
  const locale = (formData.get("locale") as string) || "en";
  const visibility =
    (formData.get("visibility") as string) || "public";
  const locationName = formData.get("locationName") as string | null;

  if (!content?.trim()) {
    throw new Error("Content is required");
  }

  // Handle multiple image uploads
  const media: MediaItem[] = [];
  const files = formData.getAll("images") as File[];

  for (const file of files) {
    if (file && file.size > 0) {
      const url = await uploadImage(file, file.name);
      media.push({
        type: file.type.startsWith("video/") ? "video" : "image",
        url,
      });
    }
  }

  const newMoment = await createMomentEntry({
    content: content.trim(),
    locale: locale === "zh" ? "zh" : "en",
    visibility: visibility === "private" ? "private" : "public",
    locationName: locationName?.trim() || undefined,
    media,
  });

  revalidatePath("/");
  revalidatePath("/admin");
  return newMoment;
}

/**
 * Create a new post (article with optional cover media)
 */
export async function createPost(formData: FormData) {
  await requireAuth();

  const title = formData.get("title") as string;
  const content = formData.get("content") as string;
  const excerpt = formData.get("excerpt") as string | null;
  const locale = (formData.get("locale") as string) || "en";
  const tagsRaw = formData.get("tags") as string | null;
  const status = (formData.get("status") as string) || "draft";
  const coverFile = formData.get("cover") as File | null;

  if (!title?.trim()) {
    throw new Error("Title is required");
  }
  if (!content?.trim()) {
    throw new Error("Content is required");
  }

  // Upload cover media (image/video) if provided
  let coverUrl: string | null = null;
  if (coverFile && coverFile.size > 0) {
    coverUrl = await uploadImage(coverFile, coverFile.name);
  }

  const tags = tagsRaw
    ? tagsRaw
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
    : [];

  const newPost = await createPostEntry({
    title: title.trim(),
    content: content.trim(),
    excerpt: excerpt?.trim() || undefined,
    locale: locale === "zh" ? "zh" : "en",
    tags,
    status: status === "published" ? "published" : "draft",
    coverUrl: coverUrl || undefined,
  });

  revalidatePath("/");
  revalidatePath("/admin");
  return newPost;
}

/**
 * Create a new gallery item (photo with EXIF data)
 */
export async function createGallery(formData: FormData) {
  await requireAuth();

  const imageFile = formData.get("image") as File;
  const title = formData.get("title") as string | null;

  if (!imageFile || imageFile.size === 0) {
    throw new Error("Image is required");
  }

  // Upload image to R2
  const fileUrl = await uploadImage(imageFile, imageFile.name);

  // Optional EXIF and metadata from form
  const camera = formData.get("camera") as string | null;
  const lens = formData.get("lens") as string | null;
  const focalLength = formData.get("focalLength") as string | null;
  const aperture = formData.get("aperture") as string | null;
  const isoRaw = formData.get("iso") as string | null;
  const widthRaw = formData.get("width") as string | null;
  const heightRaw = formData.get("height") as string | null;
  const capturedAtRaw = formData.get("capturedAt") as string | null;

  const locale = (formData.get("locale") as string) || "en";

  const newGalleryItem = await createGalleryEntry({
    locale: locale === "zh" ? "zh" : "en",
    fileUrl,
    title: title?.trim() || undefined,
    camera: camera || undefined,
    lens: lens || undefined,
    focalLength: focalLength || undefined,
    aperture: aperture || undefined,
    iso: isoRaw ? parseInt(isoRaw, 10) : undefined,
    width: widthRaw ? parseInt(widthRaw, 10) : undefined,
    height: heightRaw ? parseInt(heightRaw, 10) : undefined,
    capturedAt: capturedAtRaw
      ? new Date(capturedAtRaw).toISOString()
      : undefined,
  });

  revalidatePath("/");
  revalidatePath("/admin");
  return newGalleryItem;
}

/**
 * Delete content by type and id
 */
export async function deleteContent(
  type: "moment" | "post" | "gallery",
  id: string
) {
  await requireAuth();

  if (!id) {
    throw new Error("ID is required");
  }

  switch (type) {
    case "moment":
      await db.delete(moments).where(eq(moments.id, id));
      break;
    case "post":
      await db.delete(posts).where(eq(posts.id, id));
      break;
    case "gallery":
      await db.delete(gallery).where(eq(gallery.id, id));
      break;
    default:
      throw new Error(`Unknown content type: ${type}`);
  }

  revalidatePath("/");
  revalidatePath("/admin");
  return { success: true };
}
