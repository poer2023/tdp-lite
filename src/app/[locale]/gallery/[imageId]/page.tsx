import { notFound } from "next/navigation";
import { unstable_cache } from "next/cache";
import { GalleryImageDetail } from "@/components/stitch-details/GalleryImageDetail";
import {
  getAggregatedGalleryImages,
  serializeGalleryImage,
  type GalleryImageAggregateDTO,
} from "@/lib/gallery";

export const dynamic = "force-dynamic";

type Locale = "en" | "zh";

interface GalleryImageDetailPageProps {
  params: Promise<{ locale: Locale; imageId: string }>;
}

const getCachedGalleryItems = unstable_cache(
  async (locale: Locale): Promise<GalleryImageAggregateDTO[]> => {
    const items = await getAggregatedGalleryImages(locale);
    return items.map(serializeGalleryImage);
  },
  ["gallery-images-detail-v2"],
  { revalidate: 60 }
);

export default async function GalleryImageDetailPage({
  params,
}: GalleryImageDetailPageProps) {
  const { locale, imageId } = await params;
  const validLocale: Locale = locale === "zh" ? "zh" : "en";

  const items = await getCachedGalleryItems(validLocale);
  const item = items.find((entry) => entry.imageId === imageId);

  if (!item) {
    notFound();
  }

  return (
    <div className="text-ink relative min-h-screen overflow-x-hidden bg-[#e9e9e7] pb-20 font-display selection:bg-black/10 selection:text-black">
      <div className="bg-noise pointer-events-none fixed inset-0 z-0 opacity-40 mix-blend-multiply" />
      <div className="relative z-10 px-6 py-10 md:px-10 md:py-12">
        <GalleryImageDetail locale={validLocale} item={item} />
      </div>
    </div>
  );
}
