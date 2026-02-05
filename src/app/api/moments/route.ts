import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { moments } from "@/lib/schema";
import { requireAuth } from "@/lib/auth";
import { eq, desc, and } from "drizzle-orm";

// GET /api/moments - List moments (public)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const locale = searchParams.get("locale") || "en";
  const limit = parseInt(searchParams.get("limit") || "20", 10);
  const offset = parseInt(searchParams.get("offset") || "0", 10);

  try {
    const result = await db
      .select()
      .from(moments)
      .where(and(eq(moments.locale, locale), eq(moments.visibility, "public")))
      .orderBy(desc(moments.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({ moments: result });
  } catch (error) {
    console.error("Failed to fetch moments:", error);
    return NextResponse.json(
      { error: "Failed to fetch moments" },
      { status: 500 }
    );
  }
}

// POST /api/moments - Create moment (authenticated)
export async function POST(request: NextRequest) {
  const authError = await requireAuth(request, "moments:write");
  if (authError) return authError;

  try {
    const body = await request.json();
    const { content, media, locale, visibility, location } = body;

    if (!content) {
      return NextResponse.json(
        { error: "Missing required field: content" },
        { status: 400 }
      );
    }

    const [newMoment] = await db
      .insert(moments)
      .values({
        content,
        media: media || [],
        locale: locale || "en",
        visibility: visibility || "public",
        location: location || null,
      })
      .returning();

    return NextResponse.json({ moment: newMoment }, { status: 201 });
  } catch (error) {
    console.error("Failed to create moment:", error);
    return NextResponse.json(
      { error: "Failed to create moment" },
      { status: 500 }
    );
  }
}
