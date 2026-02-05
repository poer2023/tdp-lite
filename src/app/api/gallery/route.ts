import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { gallery } from "@/lib/schema";
import { requireAuth } from "@/lib/auth";
import { desc } from "drizzle-orm";

// GET /api/gallery - List gallery items (public)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get("limit") || "50", 10);
  const offset = parseInt(searchParams.get("offset") || "0", 10);

  try {
    const result = await db
      .select()
      .from(gallery)
      .orderBy(desc(gallery.capturedAt), desc(gallery.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({ items: result });
  } catch (error) {
    console.error("Failed to fetch gallery:", error);
    return NextResponse.json(
      { error: "Failed to fetch gallery" },
      { status: 500 }
    );
  }
}

// POST /api/gallery - Create gallery item (authenticated)
export async function POST(request: NextRequest) {
  const authError = await requireAuth(request, "gallery:write");
  if (authError) return authError;

  try {
    const body = await request.json();
    const {
      fileUrl,
      thumbUrl,
      title,
      width,
      height,
      capturedAt,
      camera,
      lens,
      focalLength,
      aperture,
      iso,
      latitude,
      longitude,
      isLivePhoto,
      videoUrl,
    } = body;

    if (!fileUrl) {
      return NextResponse.json(
        { error: "Missing required field: fileUrl" },
        { status: 400 }
      );
    }

    const [newItem] = await db
      .insert(gallery)
      .values({
        fileUrl,
        thumbUrl,
        title,
        width,
        height,
        capturedAt: capturedAt ? new Date(capturedAt) : null,
        camera,
        lens,
        focalLength,
        aperture,
        iso,
        latitude,
        longitude,
        isLivePhoto: isLivePhoto || false,
        videoUrl,
      })
      .returning();

    return NextResponse.json({ item: newItem }, { status: 201 });
  } catch (error) {
    console.error("Failed to create gallery item:", error);
    return NextResponse.json(
      { error: "Failed to create gallery item" },
      { status: 500 }
    );
  }
}
