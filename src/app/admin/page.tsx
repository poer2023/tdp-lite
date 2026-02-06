import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { posts, moments, gallery } from "@/lib/schema";
import { desc } from "drizzle-orm";
import { AdminDashboard } from "./AdminDashboard";

export default async function AdminPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/admin/login");
  }

  // Fetch recent content
  const [recentPosts, recentMoments, recentGallery] = await Promise.all([
    db.select().from(posts).orderBy(desc(posts.createdAt)).limit(20),
    db.select().from(moments).orderBy(desc(moments.createdAt)).limit(20),
    db.select().from(gallery).orderBy(desc(gallery.createdAt)).limit(20),
  ]);

  return (
    <AdminDashboard
      user={session.user}
      initialPosts={recentPosts}
      initialMoments={recentMoments}
      initialGallery={recentGallery}
    />
  );
}
