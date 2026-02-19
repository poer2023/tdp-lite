import LocaleGalleryImagePage from "../../[locale]/gallery/[imageId]/page";

export const dynamic = "force-dynamic";

interface GalleryImagePageProps {
  params: Promise<{ imageId: string }>;
}

export default async function GalleryImagePage({ params }: GalleryImagePageProps) {
  const { imageId } = await params;

  return LocaleGalleryImagePage({
    params: Promise.resolve({ locale: "zh" as const, imageId }),
  });
}
