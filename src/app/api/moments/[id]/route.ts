import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { moments } from "@/lib/schema";
import { requireAuth } from "@/lib/auth";
import { eq } from "drizzle-orm";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/moments/:id - Get single moment (public)
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  try {
    const [moment] = await db
      .select()
      .from(moments)
      .where(eq(moments.id, id))
      .limit(1);

    if (!moment) {
      return NextResponse.json({ error: "Moment not found" }, { status: 404 });
    }

    return NextResponse.json({ moment });
  } catch (error) {
    console.error("Failed to fetch moment:", error);
    return NextResponse.json(
      { error: "Failed to fetch moment" },
      { status: 500 }
    );
  }
}

// DELETE /api/moments/:id - Delete moment (authenticated)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const authError = await requireAuth(request, "moments:write");
  if (authError) return authError;

  const { id } = await params;

  try {
    const [deletedMoment] = await db
      .delete(moments)
      .where(eq(moments.id, id))
      .returning();

    if (!deletedMoment) {
      return NextResponse.json({ error: "Moment not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete moment:", error);
    return NextResponse.json(
      { error: "Failed to delete moment" },
      { status: 500 }
    );
  }
}
