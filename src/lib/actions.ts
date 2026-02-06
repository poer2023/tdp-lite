"use server";

import { revalidatePath } from "next/cache";
import { auth } from "./auth";
import { db } from "./db";
import { posts, moments, gallery, type MediaItem } from "./schema";
import { uploadImage } from "./r2";
import { eq } from "drizzle-orm";

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
 * Generate a URL-friendly slug from title
 */
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 100);
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
        type: "image",
        url,
      });
    }
  }

  const location = locationName ? { name: locationName } : null;

  const [newMoment] = await db
    .insert(moments)
    .values({
      content: content.trim(),
      media,
      locale,
      visibility,
      location,
    })
    .returning();

  revalidatePath("/");
  return newMoment;
}

/**
 * Create a new post (article with optional cover image)
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

  // Upload cover image if provided
  let coverUrl: string | null = null;
  if (coverFile && coverFile.size > 0) {
    coverUrl = await uploadImage(coverFile, coverFile.name);
  }

  // Parse tags from comma-separated string
  const tags = tagsRaw
    ? tagsRaw
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
    : [];

  const slug = generateSlug(title);
  const publishedAt = status === "published" ? new Date() : null;

  const [newPost] = await db
    .insert(posts)
    .values({
      slug,
      locale,
      title: title.trim(),
      excerpt: excerpt?.trim() || null,
      content: content.trim(),
      coverUrl,
      tags,
      status,
      publishedAt,
    })
    .returning();

  revalidatePath("/");
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

  const [newGalleryItem] = await db
    .insert(gallery)
    .values({
      fileUrl,
      title: title?.trim() || null,
      camera,
      lens,
      focalLength,
      aperture,
      iso: isoRaw ? parseInt(isoRaw, 10) : null,
      width: widthRaw ? parseInt(widthRaw, 10) : null,
      height: heightRaw ? parseInt(heightRaw, 10) : null,
      capturedAt: capturedAtRaw ? new Date(capturedAtRaw) : null,
    })
    .returning();

  revalidatePath("/");
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
  return { success: true };
}
