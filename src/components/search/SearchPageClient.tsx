"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { SearchFeedGrid } from "@/components/search/SearchFeedGrid";
import type { FeedItem } from "@/components/bento/types";
import { cn } from "@/lib/utils";
import type {
  SearchGalleryItem,
  SearchMomentItem,
  SearchPostItem,
  SearchSection,
  SearchSectionResponse,
  SupportedLocale,
} from "@/lib/search/contracts";
import { reviveSearchFeedItem } from "@/lib/search/feedItemSnapshot";
import styles from "./search-page.module.css";

const PUBLIC_SEARCH_ENDPOINT = "/api/search";
const MIN_QUERY_LENGTH = 2;
const MAX_DISPLAY_ITEMS = 12;

interface SearchPageClientProps {
  locale: SupportedLocale;
  initialItems: FeedItem[];
}

type SearchState = "hot" | "typing" | "searching" | "results" | "empty" | "error";

interface HydratedFeedRecord {
  item: FeedItem;
  sortAtMillis: number;
  order: number;
}

async function fetchSearchSection<S extends SearchSection>(params: {
  section: S;
  query: string;
  locale: SupportedLocale;
}): Promise<SearchSectionResponse<S>> {
  const response = await fetch(PUBLIC_SEARCH_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      section: params.section,
      query: params.query,
      locale: params.locale,
      filters: { localeScope: "all" },
      limit: 12,
    }),
  });

  if (!response.ok) {
    let message = `Search request failed (${response.status})`;
    try {
      const errorBody = (await response.json()) as { message?: string; error?: string };
      if (typeof errorBody.message === "string" && errorBody.message.trim()) {
        message = errorBody.message;
      } else if (typeof errorBody.error === "string" && errorBody.error.trim()) {
        message = errorBody.error;
      }
    } catch {
      // keep status message
    }
    throw new Error(message);
  }

  return (await response.json()) as SearchSectionResponse<S>;
}

function toSortMillis(sortAt: string): number {
  const value = Date.parse(sortAt);
  return Number.isFinite(value) ? value : 0;
}

async function hydrateSearchToFeed(params: {
  posts: SearchPostItem[];
  moments: SearchMomentItem[];
  gallery: SearchGalleryItem[];
}): Promise<FeedItem[]> {
  let orderCursor = 0;

  const postRecords = params.posts.map((entry) => {
    if (!entry.feedItem) {
      return null;
    }
    const order = orderCursor++;
    const record: HydratedFeedRecord = {
      item: reviveSearchFeedItem(entry.feedItem),
      sortAtMillis: toSortMillis(entry.sortAt),
      order,
    };
    return record;
  });

  const momentRecords = params.moments.map((entry) => {
    if (!entry.feedItem) {
      return null;
    }
    const order = orderCursor++;
    const record: HydratedFeedRecord = {
      item: reviveSearchFeedItem(entry.feedItem),
      sortAtMillis: toSortMillis(entry.sortAt),
      order,
    };
    return record;
  });

  const galleryRecords = params.gallery.map((entry) => {
    if (!entry.feedItem) {
      return null;
    }
    const order = orderCursor++;
    const record: HydratedFeedRecord = {
      item: reviveSearchFeedItem(entry.feedItem),
      sortAtMillis: toSortMillis(entry.sortAt),
      order,
    };
    return record;
  });

  const records = [...postRecords, ...momentRecords, ...galleryRecords].filter(
    (record): record is HydratedFeedRecord => record !== null
  );

  records.sort((a, b) => {
    if (b.sortAtMillis !== a.sortAtMillis) {
      return b.sortAtMillis - a.sortAtMillis;
    }
    return a.order - b.order;
  });

  const dedup = new Set<string>();
  const finalItems: FeedItem[] = [];

  for (const record of records) {
    const key = `${record.item.type}:${record.item.id}`;
    if (dedup.has(key)) {
      continue;
    }
    dedup.add(key);
    finalItems.push(record.item);
    if (finalItems.length >= MAX_DISPLAY_ITEMS) {
      break;
    }
  }

  return finalItems;
}

export function SearchPageClient({ locale, initialItems }: SearchPageClientProps) {
  const t =
    locale === "zh"
      ? {
          protocol: "检索协议",
          placeholder: "Search Atelier...",
          recentLabel: "最近",
          quickTerms: ["极简", "东京", "胶片", "夜色"],
          hotLabel: "热门内容",
          typingHint: `至少输入 ${MIN_QUERY_LENGTH} 个字符开始搜索。`,
          searching: "正在检索全部可搜索内容（标题 / 正文 / 标签 / 地点 / 元数据）...",
          empty: "没有匹配结果",
          error: "搜索失败，请稍后重试",
          resultPrefix: "匹配结果",
        }
      : {
          protocol: "Search Protocol",
          placeholder: "Search Atelier...",
          recentLabel: "Recent",
          quickTerms: ["Minimalism", "Kyoto", "Film", "Night"],
          hotLabel: "Hot Content",
          typingHint: `Type at least ${MIN_QUERY_LENGTH} characters to search.`,
          searching:
            "Searching all indexed fields (title / content / tags / location / metadata)...",
          empty: "No matching results",
          error: "Search failed, please retry",
          resultPrefix: "Matched Results",
        };

  const hotItems = useMemo(
    () => initialItems.filter((item) => item.type !== "action").slice(0, MAX_DISPLAY_ITEMS),
    [initialItems]
  );

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [searchItems, setSearchItems] = useState<FeedItem[]>([]);
  const [searchState, setSearchState] = useState<SearchState>("hot");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const requestTokenRef = useRef(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(query);
    }, 280);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const trimmed = debouncedQuery.trim();

    requestTokenRef.current += 1;
    const token = requestTokenRef.current;

    if (!trimmed) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSearchState("hot");
      setErrorMessage(null);
      return;
    }

    if (trimmed.length < MIN_QUERY_LENGTH) {
      setSearchState("typing");
      setErrorMessage(null);
      return;
    }

    setSearchState("searching");
    setErrorMessage(null);

    void (async () => {
      try {
        const [postResult, momentResult, galleryResult] = await Promise.all([
          fetchSearchSection({ section: "post", query: trimmed, locale }),
          fetchSearchSection({ section: "moment", query: trimmed, locale }),
          fetchSearchSection({ section: "gallery", query: trimmed, locale }),
        ]);

        const hydrated = await hydrateSearchToFeed({
          posts: postResult.items,
          moments: momentResult.items,
          gallery: galleryResult.items,
        });

        if (requestTokenRef.current !== token) {
          return;
        }

        setSearchItems(hydrated);
        setSearchState(hydrated.length > 0 ? "results" : "empty");
      } catch (error) {
        if (requestTokenRef.current !== token) {
          return;
        }
        setSearchItems([]);
        setSearchState("error");
        setErrorMessage(error instanceof Error ? error.message : t.error);
      }
    })();
  }, [debouncedQuery, locale, t.error]);

  const queryLength = query.trim().length;
  const displayItems =
    searchState === "hot" || searchState === "typing"
      ? hotItems
      : searchState === "searching"
        ? []
        : searchItems;

  const headerText =
    searchState === "hot"
      ? `${t.hotLabel}`
      : searchState === "typing"
        ? t.typingHint
        : searchState === "searching"
          ? t.searching
          : searchState === "results"
            ? `${t.resultPrefix}: "${debouncedQuery.trim()}"`
            : searchState === "empty"
              ? t.empty
              : errorMessage || t.error;

  return (
    <div className="relative">
      <div className="pointer-events-none fixed inset-0 z-[1] opacity-40 blur-xl">
        <div className="mx-auto max-w-[1400px] px-12 py-12">
          <div className="grid auto-rows-[200px] grid-cols-4 gap-6">
            <div className="col-span-2 row-span-2 rounded-3xl bg-white shadow-xl" />
            <div className="col-span-2 rounded-3xl bg-gray-200 shadow-xl" />
            <div className="col-span-1 rounded-3xl bg-white shadow-xl" />
            <div className="col-span-1 rounded-3xl bg-gray-100 shadow-xl" />
          </div>
        </div>
      </div>

      <div
        className={cn(
          styles.overlay,
          "fixed inset-0 z-20 flex flex-col items-center pt-[8vh] md:pt-[10vh]"
        )}
      >
        <div className="bg-noise pointer-events-none fixed inset-0 z-0 opacity-30 mix-blend-overlay" />

        <div className="relative z-30 mb-8 w-full max-w-4xl px-6 md:mb-10 md:px-8">
          <div className="group relative mx-auto max-w-2xl">
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className={cn(
                styles.input,
                "w-full bg-transparent py-4 text-center text-4xl leading-tight text-ink focus:outline-none md:text-6xl"
              )}
              placeholder={t.placeholder}
              type="text"
            />
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-black/20 to-transparent transition-all duration-500 group-focus-within:via-black/80 dark:via-white/16 dark:group-focus-within:via-white/55" />
          </div>

          <div className="mt-5 flex justify-center opacity-70">
            <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-ink-light">
              <span>{t.recentLabel}:</span>
              {t.quickTerms.map((term, index) => (
                <span key={term} className="inline-flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setQuery(term)}
                    className="transition-colors hover:text-ink hover:underline"
                  >
                    {term}
                  </button>
                  {index < t.quickTerms.length - 1 ? <span className="opacity-30">•</span> : null}
                </span>
              ))}
            </div>
          </div>

          <p className="mt-4 text-center text-xs text-ink-light">{headerText}</p>
          {queryLength > 0 && queryLength < MIN_QUERY_LENGTH ? (
            <p className="mt-1 text-center text-[11px] text-ink-light/80">{t.typingHint}</p>
          ) : null}
        </div>

        <div
          className={cn(
            styles.noScrollbar,
            "z-10 w-full max-w-5xl px-6 pb-36",
            searchState === "hot" || searchState === "typing"
              ? "overflow-hidden"
              : "overflow-y-auto"
          )}
        >
          {displayItems.length > 0 ? (
            <SearchFeedGrid
              items={displayItems}
              maxDesktopCells={
                searchState === "hot" || searchState === "typing" ? 8 : undefined
              }
            />
          ) : searchState === "searching" ? (
            <div className="mx-auto max-w-2xl rounded-3xl border border-black/10 bg-white/75 px-6 py-8 text-center text-sm text-ink-light dark:border-white/12 dark:bg-[rgba(43,51,64,0.78)] dark:text-[#b7c3d2]">
              {t.searching}
            </div>
          ) : (
            <div className="mx-auto max-w-2xl rounded-3xl border border-black/10 bg-white/75 px-6 py-8 text-center text-sm text-ink-light dark:border-white/12 dark:bg-[rgba(43,51,64,0.78)] dark:text-[#b7c3d2]">
              {headerText}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
