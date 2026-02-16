import { BentoGrid } from "@/components/bento/BentoGrid";
import { FeedItem } from "@/components/bento/types";
import { db } from "@/lib/db";
import { posts, moments, gallery } from "@/lib/schema";
import { desc, eq } from "drizzle-orm";
import { Layers } from "lucide-react";
import Link from "next/link";
import { BottomNav } from "@/components/BottomNav";

// Force dynamic rendering to avoid database queries during build
export const dynamic = "force-dynamic";

type Locale = "en" | "zh";

interface HomePageProps {
  params: Promise<{ locale: Locale }>;
}

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;

  // Fetch data from database
  const [postsData, momentsData, galleryData] = await Promise.all([
    db
      .select()
      .from(posts)
      .where(eq(posts.status, "published"))
      .orderBy(desc(posts.publishedAt))
      .limit(10),
    db
      .select()
      .from(moments)
      .where(eq(moments.visibility, "public"))
      .orderBy(desc(moments.createdAt))
      .limit(10),
    db.select().from(gallery).orderBy(desc(gallery.createdAt)).limit(10),
  ]);

  // Transform to FeedItem format (without ActionItem)
  type ContentItem =
    | ({ type: "post" } & typeof postsData[0])
    | ({ type: "moment" } & typeof momentsData[0])
    | ({ type: "gallery" } & typeof galleryData[0]);

  const postItems: ContentItem[] = postsData.map((post) => ({
    type: "post" as const,
    ...post,
  }));

  const momentItems: ContentItem[] = momentsData.map((moment) => ({
    type: "moment" as const,
    ...moment,
  }));

  const galleryItems: ContentItem[] = galleryData.map((item) => ({
    type: "gallery" as const,
    ...item,
  }));

  // Combine and sort by date
  const allItems = [...postItems, ...momentItems, ...galleryItems].sort(
    (a, b) => {
      const getDate = (item: ContentItem) => {
        if (item.type === "post") {
          return item.publishedAt?.getTime() ?? item.createdAt.getTime();
        }
        return item.createdAt.getTime();
      };
      return getDate(b) - getDate(a);
    }
  );

  // Add action button at the end
  const items: FeedItem[] = [
    ...(allItems.slice(0, 10) as FeedItem[]),
    {
      type: "action",
      id: "create-entry",
      icon: "Pencil",
      label: "Create Entry",
    },
  ];

  return (
    <div className="text-ink relative min-h-screen overflow-x-hidden bg-[#e9e9e7] pb-32 font-display selection:bg-black/10 selection:text-black">
      <div className="bg-noise pointer-events-none fixed inset-0 z-0 opacity-40 mix-blend-multiply" />
      <div className="relative z-10 mx-auto max-w-[1400px] px-6 py-12 md:px-12">
        {/* Top Navigation Bar */}
        <header className="mb-16 flex items-center justify-between">
          {/* Left: Logo + Brand */}
          <div className="group flex cursor-pointer items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg border border-black/5 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05),0_1px_3px_rgba(0,0,0,0.1)] transition-colors duration-300 group-hover:border-black/20">
              <Layers className="text-ink h-5 w-5" />
            </div>
            <h1 className="text-ink text-xl font-bold tracking-tight">
              Moments_v2
            </h1>
          </div>

          {/* Right: Status + Avatar */}
          <div className="flex items-center gap-6">
            <div className="hidden text-right font-mono sm:block">
              <p className="text-ink-light text-[10px] uppercase tracking-widest">
                Status
              </p>
              <p className="text-xs font-medium">ONLINE • TOKYO</p>
            </div>
            {/* Avatar - links to about page */}
            <Link href={`/${locale}/about`}>
              <img
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBy47viAR_LjhRiYmNAvIcG2Sls2o3grioez7j8CegtDxl-vr2YIA6NnC0g9i36Zj2EPGb3DhzFZQI9DN9jY-kQ-gx1cbrC3OQAvN5s-MC-vkWWti4cA6TwsHXT32V_DZqi8fVqx40OS-BMgP0jvEl4_AAjbkI81JzhVEV8O_GEXKaTfGE1k46yqh_-Z8SAut64Kiied5kkt_8yOLpFf_uUEtfh-YL2Am5CO3lsNWxbIt39Mg1DmLaQ0vnJDei6dbS28mrXzQQndzO1"
                alt="Profile portrait"
                className="size-12 rounded-full border border-white object-cover shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05),0_2px_4px_-1px_rgba(0,0,0,0.03),inset_0_0_0_1px_rgba(255,255,255,0.5)] ring-1 ring-black/5 sepia-[0.1] transition-transform hover:scale-105"
              />
            </Link>
          </div>
        </header>

        {/* Hero Title Section */}
        <section className="relative mb-14 px-2">
          <div className="absolute -left-4 top-0 hidden h-full w-1 rounded-full bg-black/5 md:block" />
          <h2 className="text-ink mb-6 text-6xl font-medium tracking-[-0.03em] md:text-8xl">
            October{" "}
            <span className="text-ink-light font-serif italic">
              Reflections
            </span>
          </h2>
          <p className="text-ink-light max-w-2xl pl-1 font-mono text-lg font-normal leading-relaxed md:text-xl">
            [001] Capturing the ephemeral fragments of daily life through a
            layered prism.
          </p>
        </section>

        {/* Main content */}
        <main>
          <BentoGrid items={items} />
        </main>
      </div>

      <BottomNav locale={locale} activeTab="home" />
    </div>
  );
}
