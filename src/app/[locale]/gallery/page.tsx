import { BottomNav } from "@/components/BottomNav";
import { GalleryPageClient } from "@/components/gallery/GalleryPageClient";
import {
  getAggregatedGalleryImages,
  serializeGalleryImage,
  type GalleryImageAggregateDTO,
} from "@/lib/gallery";
import { unstable_cache } from "next/cache";
import { type AppLocale } from "@/lib/locale";

export const dynamic = "force-dynamic";

type Locale = AppLocale;

interface GalleryPageProps {
  params: Promise<{ locale: Locale }>;
}

const getCachedGalleryItems = unstable_cache(
  async (locale: Locale): Promise<GalleryImageAggregateDTO[]> => {
    const items = await getAggregatedGalleryImages(locale);
    return items.map(serializeGalleryImage);
  },
  ["gallery-images-v2"],
  { revalidate: 60 }
);

export default async function GalleryPage({ params }: GalleryPageProps) {
  const { locale } = await params;
  const items = await getCachedGalleryItems(locale);

  return (
    <div className="text-ink relative min-h-screen overflow-x-hidden bg-[#e9e9e7] pb-32 font-display selection:bg-black/10 selection:text-black">
      <div className="bg-noise pointer-events-none fixed inset-0 z-0 opacity-40 mix-blend-multiply" />

      <div className="relative z-10 mx-auto max-w-[1400px] px-6 py-12 md:px-12">
        <header className="mb-10">
          <div className="mb-4 inline-flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[#111]" />
            <span className="font-mono text-xs uppercase tracking-widest text-[#999]">
              Photography
            </span>
            <span className="h-1.5 w-1.5 rounded-full bg-[#111]" />
          </div>
          <h1 className="mb-4 font-serif text-6xl font-medium tracking-[-0.03em] text-[#111] md:text-8xl">
            Gallery
          </h1>
          <p className="max-w-2xl font-mono text-sm leading-relaxed text-[#777]">
            Pure image stream extracted from published posts and moments. Browse by source and time,
            then open each frame with detail metadata and origin links.
          </p>
        </header>

        <GalleryPageClient locale={locale} items={items} />
      </div>

      <BottomNav locale={locale} activeTab="gallery" />
    </div>
  );
}
