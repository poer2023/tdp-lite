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
  const t =
    validLocale === "zh"
      ? {
          kicker: "检索中枢",
          title: "搜索",
          description: "检索全部已发布文章、公开动态与图片元数据。",
          scopeLabel: "索引范围",
          postChip: "文章",
          momentChip: "动态",
          galleryChip: "图片",
        }
      : {
          kicker: "Discovery",
          title: "Search",
          description:
            "Query all published posts, public moments, and image metadata.",
          scopeLabel: "Index Scope",
          postChip: "Posts",
          momentChip: "Moments",
          galleryChip: "Images",
        };

  return (
    <div className="text-ink relative min-h-screen overflow-x-hidden bg-page-surface pb-32 font-display selection:bg-black/10 selection:text-black">
      <div className="bg-noise pointer-events-none fixed inset-0 z-0 opacity-40 mix-blend-multiply" />

      <div className="relative z-10 mx-auto max-w-[1320px] px-6 py-12 md:px-12">
        <header className="mb-8 flex items-start justify-between gap-6">
          <div className="relative min-w-0 flex-1 px-2">
            <div className="absolute -left-4 top-0 hidden h-full w-1 rounded-full bg-black/5 md:block" />
            <div className="mb-4 inline-flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[#111]" />
              <span className="font-mono text-xs uppercase tracking-widest text-[#999]">
                {t.kicker}
              </span>
              <span className="h-1.5 w-1.5 rounded-full bg-[#111]" />
            </div>
            <h1 className="mb-3 font-serif text-5xl font-medium tracking-[-0.03em] text-[#111] md:text-7xl">
              {t.title}
            </h1>
            <p className="max-w-2xl font-mono text-sm leading-relaxed text-[#777]">
              {t.description}
            </p>
          </div>

          <div className="hidden shrink-0 lg:block">
            <p className="mb-2 text-right font-mono text-[10px] uppercase tracking-widest text-[#888]">
              {t.scopeLabel}
            </p>
            <div className="flex items-center gap-2">
              <span className="rounded-full border border-black/10 bg-white/75 px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-[#666]">
                {t.postChip}
              </span>
              <span className="rounded-full border border-black/10 bg-white/75 px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-[#666]">
                {t.momentChip}
              </span>
              <span className="rounded-full border border-black/10 bg-white/75 px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-[#666]">
                {t.galleryChip}
              </span>
            </div>
          </div>
        </header>

        <SearchPageClient locale={validLocale} />
      </div>

      <BottomNav locale={validLocale} activeTab="search" />
    </div>
  );
}
