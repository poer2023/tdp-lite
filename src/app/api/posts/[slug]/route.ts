import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { posts } from "@/lib/schema";
import { requireAuth } from "@/lib/auth";
import { eq, or } from "drizzle-orm";

interface RouteParams {
  params: Promise<{ slug: string }>;
}

// GET /api/posts/:slug - Get single post (public)
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { slug } = await params;

  try {
    // Try to find by slug or id
    const [post] = await db
      .select()
      .from(posts)
      .where(or(eq(posts.slug, slug), eq(posts.id, slug)))
      .limit(1);

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    return NextResponse.json({ post });
  } catch (error) {
    console.error("Failed to fetch post:", error);
    return NextResponse.json(
      { error: "Failed to fetch post" },
      { status: 500 }
    );
  }
}

// PUT /api/posts/:id - Update post (authenticated)
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const authError = await requireAuth(request, "posts:write");
  if (authError) return authError;

  const { slug: id } = await params;

  try {
    const body = await request.json();
    const { slug, locale, title, excerpt, content, coverUrl, tags, status } =
      body;

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (slug !== undefined) updateData.slug = slug;
    if (locale !== undefined) updateData.locale = locale;
    if (title !== undefined) updateData.title = title;
    if (excerpt !== undefined) updateData.excerpt = excerpt;
    if (content !== undefined) updateData.content = content;
    if (coverUrl !== undefined) updateData.coverUrl = coverUrl;
    if (tags !== undefined) updateData.tags = tags;
    if (status !== undefined) {
      updateData.status = status;
      if (status === "published") {
        updateData.publishedAt = new Date();
      }
    }

    const [updatedPost] = await db
      .update(posts)
      .set(updateData)
      .where(eq(posts.id, id))
      .returning();

    if (!updatedPost) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    return NextResponse.json({ post: updatedPost });
  } catch (error) {
    console.error("Failed to update post:", error);
    return NextResponse.json(
      { error: "Failed to update post" },
      { status: 500 }
    );
  }
}

// DELETE /api/posts/:id - Delete post (authenticated)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const authError = await requireAuth(request, "posts:write");
  if (authError) return authError;

  const { slug: id } = await params;

  try {
    const [deletedPost] = await db
      .delete(posts)
      .where(eq(posts.id, id))
      .returning();

    if (!deletedPost) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete post:", error);
    return NextResponse.json(
      { error: "Failed to delete post" },
      { status: 500 }
    );
  }
}
