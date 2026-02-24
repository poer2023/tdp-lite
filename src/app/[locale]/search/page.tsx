import { BottomNav } from "@/components/BottomNav";
import { SearchPageClient } from "@/components/search/SearchPageClient";
import { isAppLocale, type AppLocale } from "@/lib/locale";

export const dynamic = "force-dynamic";

type Locale = AppLocale;

interface SearchPageProps {
  params: Promise<{ locale: Locale }>;
}

export default async function SearchPage({ params }: SearchPageProps) {
  const { locale } = await params;
  const validLocale = isAppLocale(locale) ? locale : "en";

  return (
    <div className="text-ink relative min-h-screen overflow-x-hidden bg-[#e9e9e7] pb-32 font-display selection:bg-black/10 selection:text-black">
      <div className="bg-noise pointer-events-none fixed inset-0 z-0 opacity-40 mix-blend-multiply" />

      <div className="relative z-10 mx-auto max-w-[1400px] px-6 py-12 md:px-12">
        <header className="mb-8">
          <div className="mb-4 inline-flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[#111]" />
            <span className="font-mono text-xs uppercase tracking-widest text-[#999]">
              Discovery
            </span>
            <span className="h-1.5 w-1.5 rounded-full bg-[#111]" />
          </div>
          <h1 className="mb-3 font-serif text-5xl font-medium tracking-[-0.03em] text-[#111] md:text-7xl">
            Search
          </h1>
          <p className="max-w-2xl font-mono text-sm leading-relaxed text-[#777]">
            Query all published posts, public moments and gallery metadata.
          </p>
        </header>

        <SearchPageClient locale={validLocale} />
      </div>

      <BottomNav locale={validLocale} activeTab="search" />
    </div>
  );
}
