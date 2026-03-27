import { SearchPageClient } from "@/components/search/SearchPageClient";
import { getPublicFeed } from "@/lib/content/read";
import { isAppLocale, type AppLocale } from "@/lib/locale";
import { cn } from "@/lib/utils";
import styles from "@/components/search/search-page.module.css";

type Locale = AppLocale;

interface SearchPageProps {
  params: Promise<{ locale: Locale }>;
}

export default async function SearchPage({ params }: SearchPageProps) {
  const { locale } = await params;
  const validLocale = isAppLocale(locale) ? locale : "en";
  const initialItems = await getPublicFeed(validLocale, 12);

  return (
    <div
      className={cn(
        styles.root,
        "relative min-h-dvh overflow-hidden pb-[calc(8rem+var(--tdp-inset-bottom))] font-display selection:bg-black selection:text-white"
      )}
    >
      <SearchPageClient locale={validLocale} initialItems={initialItems} />
    </div>
  );
}
