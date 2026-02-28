import { BottomNav } from "@/components/BottomNav";
import { GalleryPageClient } from "@/components/gallery/GalleryPageClient";
import {
  getAggregatedGalleryImages,
  serializeGalleryImage,
  type GalleryImageAggregateDTO,
} from "@/lib/gallery";
import { type AppLocale } from "@/lib/locale";

type Locale = AppLocale;

interface GalleryPageProps {
  params: Promise<{ locale: Locale }>;
}

export default async function GalleryPage({ params }: GalleryPageProps) {
  const { locale } = await params;
  const items: GalleryImageAggregateDTO[] = (await getAggregatedGalleryImages(locale)).map(
    serializeGalleryImage
  );
  const heading = locale === "zh" ? "画廊" : "Gallery";

  return (
    <div
      className="text-ink relative min-h-screen overflow-x-hidden bg-page-surface pb-32 font-display selection:bg-black/10 selection:text-black"
      data-lg-bg-layer="gallery-root"
    >
      <div
        className="bg-noise pointer-events-none fixed inset-0 z-0 opacity-40 mix-blend-multiply"
        data-lg-bg-layer="gallery-noise"
      />

      <div className="relative z-10 mx-auto max-w-[1400px] px-6 py-12 md:px-12">
        <header className="mb-8">
          <h1 className="mb-4 font-serif text-6xl font-medium tracking-[-0.03em] text-[#111] md:text-8xl">
            {heading}
          </h1>
        </header>

        <GalleryPageClient locale={locale} items={items} />
      </div>

      <BottomNav locale={locale} activeTab="gallery" />
    </div>
  );
}
