import { BottomNav } from "@/components/BottomNav";
import { SearchPageClient } from "@/components/search/SearchPageClient";
import { getPublicFeed } from "@/lib/content/read";
import { isAppLocale, type AppLocale } from "@/lib/locale";

export const dynamic = "force-dynamic";

type Locale = AppLocale;

interface SearchPageProps {
  params: Promise<{ locale: Locale }>;
}

export default async function SearchPage({ params }: SearchPageProps) {
  const { locale } = await params;
  const validLocale = isAppLocale(locale) ? locale : "en";
  const initialItems = await getPublicFeed(validLocale, 12);

  return (
    <div className="search-stitch-page relative min-h-screen overflow-hidden pb-32 font-display selection:bg-black selection:text-white">
      <SearchPageClient locale={validLocale} initialItems={initialItems} />
      <BottomNav locale={validLocale} activeTab="search" />
    </div>
  );
}
