import { BentoGrid } from "@/components/bento/BentoGrid";
import { FeedItem } from "@/components/bento/types";
import { Home, Grid3X3, Search, User, Layers } from "lucide-react";
import Link from "next/link";

type Locale = "en" | "zh";

interface HomePageProps {
  params: Promise<{ locale: Locale }>;
}

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;

  // Mock Data matching Stitch design
  const items: FeedItem[] = [
    {
      type: "post",
      id: "1",
      slug: "finding-stillness",
      locale: "en",
      title: "Finding Stillness in Chaos",
      excerpt: "Exploring the untouched wilderness of the northern highlands, seeking a moment of absolute silence.",
      content: "...",
      coverUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=2070&auto=format&fit=crop",
      tags: ["featured"],
      status: "published",
      publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hrs ago
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      type: "moment",
      id: "2",
      locale: "en",
      content: "Designing for the future requires forgetting the past. Embrace the void.",
      media: [],
      visibility: "public",
      location: null,
      createdAt: new Date("2025-10-25T08:30:00Z"),
    },
    {
      type: "moment",
      id: "3",
      locale: "en",
      content: "Shinjuku",
      media: [],
      visibility: "public",
      location: { name: "Tokyo, JP • 35.69° N" },
      createdAt: new Date("2025-10-25T23:00:00Z"),
    },
    {
      type: "moment",
      id: "4",
      locale: "en",
      content: "Midnight City",
      media: [],
      visibility: "public",
      location: { name: "M83 • HURRAY" },
      createdAt: new Date("2025-10-25T23:00:00Z"),
    },
    {
      type: "gallery",
      id: "5",
      fileUrl: "https://images.unsplash.com/photo-1500462918059-b1a0cb512f1d?q=80&w=1974&auto=format&fit=crop",
      thumbUrl: "https://images.unsplash.com/photo-1500462918059-b1a0cb512f1d?q=80&w=600&auto=format&fit=crop",
      title: "Neon Dreams",
      camera: "Sony A7III",
      width: 4000,
      height: 6000,
      capturedAt: new Date(),
      createdAt: new Date(),
      isLivePhoto: false,
      videoUrl: null,
      lens: "24-70mm f/2.8",
      focalLength: "35mm",
      aperture: "f/2.8",
      iso: 800,
      latitude: null,
      longitude: null,
    },
    {
      type: "post",
      id: "6",
      slug: "digital-minimalism",
      locale: "en",
      title: "Digital Minimalism",
      excerpt: "How reducing digital clutter can lead to a more focused and intentional life.",
      content: "...",
      coverUrl: null,
      tags: ["journal"],
      status: "published",
      publishedAt: new Date("2025-10-22T14:00:00Z"),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  return (
    <div className="min-h-screen bg-textured">
      <div className="mx-auto max-w-6xl px-6 py-6">
        {/* Top Navigation Bar */}
        <header className="mb-10 flex items-center justify-between">
          {/* Left: Logo + Brand */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white">
              <Layers className="h-5 w-5 text-gray-600" />
            </div>
            <span className="font-display text-lg font-semibold text-foreground">
              Moments_v2
            </span>
          </div>

          {/* Right: Status + Avatar */}
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                Status
              </p>
              <p className="font-mono text-xs text-foreground">
                ONLINE • TOKYO
              </p>
            </div>
            {/* Avatar - links to about page */}
            <Link href={`/${locale}/about`}>
              <img
                src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=100&auto=format&fit=crop"
                alt="Avatar"
                className="h-11 w-11 rounded-full object-cover transition-transform hover:scale-105"
              />
            </Link>
          </div>
        </header>

        {/* Hero Title Section */}
        <section className="mb-10">
          <h1 className="font-display text-6xl font-bold tracking-tight text-foreground md:text-7xl">
            October <span className="italic font-normal">Reflections</span>
          </h1>
          <p className="mt-4 max-w-xl font-mono text-sm leading-relaxed text-muted-foreground">
            [001] Capturing the ephemeral fragments of daily life through a layered prism.
          </p>
        </section>

        {/* Main content */}
        <main>
          <BentoGrid items={items} />
        </main>

        {/* Bottom Navigation - Stitch style */}
        <nav className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
          <div className="flex items-center gap-1 rounded-full border border-gray-200 bg-white p-1.5 shadow-lg">
            <Link
              href={`/${locale}`}
              className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-gray-100 hover:text-foreground"
            >
              <Home className="h-5 w-5" />
            </Link>
            <Link
              href={`/${locale}/gallery`}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-foreground text-background"
            >
              <Grid3X3 className="h-5 w-5" />
            </Link>
            <Link
              href={`/${locale}/posts`}
              className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-gray-100 hover:text-foreground"
            >
              <Search className="h-5 w-5" />
            </Link>
            <Link
              href={`/${locale}/about`}
              className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-gray-100 hover:text-foreground"
            >
              <User className="h-5 w-5" />
            </Link>
          </div>
        </nav>
      </div>
    </div>
  );
}
