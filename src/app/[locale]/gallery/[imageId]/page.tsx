import { redirect } from "next/navigation";
import { toLocalizedPath } from "@/lib/locale-routing";

type Locale = "en" | "zh";

interface GalleryImageDetailPageProps {
  params: Promise<{ locale: Locale; imageId: string }>;
}

export default async function GalleryImageDetailPage({
  params,
}: GalleryImageDetailPageProps) {
  const { locale } = await params;
  const validLocale: Locale = locale === "zh" ? "zh" : "en";
  redirect(toLocalizedPath(validLocale, "/moments"));
}
