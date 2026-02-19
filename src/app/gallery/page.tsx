import LocaleGalleryPage from "../[locale]/gallery/page";

export const dynamic = "force-dynamic";

export default function GalleryPage() {
  return LocaleGalleryPage({
    params: Promise.resolve({ locale: "zh" as const }),
  });
}
