import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { gallery } from "@/lib/schema";
import { requireAuth } from "@/lib/auth";
import { eq } from "drizzle-orm";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/gallery/:id - Get single gallery item (public)
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  try {
    const [item] = await db
      .select()
      .from(gallery)
      .where(eq(gallery.id, id))
      .limit(1);

    if (!item) {
      return NextResponse.json(
        { error: "Gallery item not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ item });
  } catch (error) {
    console.error("Failed to fetch gallery item:", error);
    return NextResponse.json(
      { error: "Failed to fetch gallery item" },
      { status: 500 }
    );
  }
}

// DELETE /api/gallery/:id - Delete gallery item (authenticated)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const authError = await requireAuth(request, "gallery:write");
  if (authError) return authError;

  const { id } = await params;

  try {
    const [deletedItem] = await db
      .delete(gallery)
      .where(eq(gallery.id, id))
      .returning();

    if (!deletedItem) {
      return NextResponse.json(
        { error: "Gallery item not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete gallery item:", error);
    return NextResponse.json(
      { error: "Failed to delete gallery item" },
      { status: 500 }
    );
  }
}
