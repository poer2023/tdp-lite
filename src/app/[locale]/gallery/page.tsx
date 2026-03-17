import { redirect } from "next/navigation";
import { type AppLocale } from "@/lib/locale";
import { toLocalizedPath } from "@/lib/locale-routing";

type Locale = AppLocale;

interface GalleryPageProps {
  params: Promise<{ locale: Locale }>;
}

export default async function GalleryPage({ params }: GalleryPageProps) {
  const { locale } = await params;
  redirect(toLocalizedPath(locale, "/moments"));
}
