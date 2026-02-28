import LocaleGalleryImagePage from "../../[locale]/gallery/[imageId]/page";
import { getDefaultGalleryDetailStaticParams } from "@/lib/detailRouteParams";

interface GalleryImagePageProps {
  params: Promise<{ imageId: string }>;
}

export async function generateStaticParams() {
  return getDefaultGalleryDetailStaticParams();
}

export default async function GalleryImagePage({ params }: GalleryImagePageProps) {
  const { imageId } = await params;

  return LocaleGalleryImagePage({
    params: Promise.resolve({ locale: "zh" as const, imageId }),
  });
}
