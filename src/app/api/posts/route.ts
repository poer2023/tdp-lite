import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { posts } from "@/lib/schema";
import { requireAuth } from "@/lib/auth";
import { eq, desc, and } from "drizzle-orm";

// GET /api/posts - List posts (public)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const locale = searchParams.get("locale") || "en";
  const status = searchParams.get("status") || "published";

  try {
    const result = await db
      .select()
      .from(posts)
      .where(and(eq(posts.locale, locale), eq(posts.status, status)))
      .orderBy(desc(posts.publishedAt));

    return NextResponse.json({ posts: result });
  } catch (error) {
    console.error("Failed to fetch posts:", error);
    return NextResponse.json(
      { error: "Failed to fetch posts" },
      { status: 500 }
    );
  }
}

// POST /api/posts - Create post (authenticated)
export async function POST(request: NextRequest) {
  const authError = await requireAuth(request, "posts:write");
  if (authError) return authError;

  try {
    const body = await request.json();
    const { slug, locale, title, excerpt, content, coverUrl, tags, status } =
      body;

    if (!slug || !title || !content) {
      return NextResponse.json(
        { error: "Missing required fields: slug, title, content" },
        { status: 400 }
      );
    }

    const [newPost] = await db
      .insert(posts)
      .values({
        slug,
        locale: locale || "en",
        title,
        excerpt,
        content,
        coverUrl,
        tags: tags || [],
        status: status || "draft",
        publishedAt: status === "published" ? new Date() : null,
      })
      .returning();

    return NextResponse.json({ post: newPost }, { status: 201 });
  } catch (error) {
    console.error("Failed to create post:", error);
    return NextResponse.json(
      { error: "Failed to create post" },
      { status: 500 }
    );
  }
}
