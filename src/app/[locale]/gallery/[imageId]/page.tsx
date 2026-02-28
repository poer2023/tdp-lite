import { notFound } from "next/navigation";
import { GalleryImageDetail } from "@/components/stitch-details/GalleryImageDetail";
import { getGalleryDetailStaticParams } from "@/lib/detailRouteParams";
import {
  getAggregatedGalleryImages,
  serializeGalleryImage,
  type GalleryImageAggregateDTO,
} from "@/lib/gallery";
import { toLocalizedPath } from "@/lib/locale-routing";

type Locale = "en" | "zh";

interface GalleryImageDetailPageProps {
  params: Promise<{ locale: Locale; imageId: string }>;
}

export async function generateStaticParams() {
  return getGalleryDetailStaticParams();
}

export default async function GalleryImageDetailPage({
  params,
}: GalleryImageDetailPageProps) {
  const { locale, imageId } = await params;
  const validLocale: Locale = locale === "zh" ? "zh" : "en";
  const alternateLocale: Locale = validLocale === "zh" ? "en" : "zh";

  const items: GalleryImageAggregateDTO[] = (await getAggregatedGalleryImages(
    validLocale
  )).map(serializeGalleryImage);
  const item = items.find((entry) => entry.imageId === imageId);

  if (!item) {
    notFound();
  }

  const alternateItems: GalleryImageAggregateDTO[] = (await getAggregatedGalleryImages(
    alternateLocale
  )).map(serializeGalleryImage);
  const alternateItem = alternateItems.find((entry) => entry.imageId === imageId);
  const alternateHref = alternateItem
    ? toLocalizedPath(alternateLocale, `/gallery/${alternateItem.imageId}`)
    : null;

  return (
    <div className="text-ink relative min-h-screen overflow-x-hidden bg-page-surface pb-20 font-display selection:bg-black/10 selection:text-black">
      <div className="bg-noise pointer-events-none fixed inset-0 z-0 opacity-40 mix-blend-multiply" />
      <div className="relative z-10 px-6 py-10 md:px-10 md:py-12">
        <GalleryImageDetail
          locale={validLocale}
          item={item}
          alternateHref={alternateHref}
          alternateLabel={alternateLocale === "zh" ? "切换中文" : "Switch EN"}
        />
      </div>
    </div>
  );
}
