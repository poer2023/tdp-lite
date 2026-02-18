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
    <div
      className="text-ink relative min-h-screen overflow-x-hidden bg-[#e9e9e7] pb-32 font-display selection:bg-black/10 selection:text-black"
      data-lg-bg-layer="gallery-root"
    >
      <div
        className="bg-noise pointer-events-none fixed inset-0 z-0 opacity-40 mix-blend-multiply"
        data-lg-bg-layer="gallery-noise"
      />

      <div className="relative z-10 mx-auto max-w-[1400px] px-6 py-12 md:px-12">
        <header className="mb-8">
          <h1 className="mb-4 font-serif text-6xl font-medium tracking-[-0.03em] text-[#111] md:text-8xl">
            Gallery
          </h1>
        </header>

        <GalleryPageClient locale={locale} items={items} />
      </div>

      <BottomNav locale={locale} activeTab="gallery" />
    </div>
  );
}
