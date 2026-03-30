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
import {
  getSearchMobileCellBudget,
  getSearchMobileRowHeight,
} from "@/components/search/mobileLayout";
import styles from "./search-page.module.css";

const PUBLIC_SEARCH_ENDPOINT = "/api/search";
const MIN_QUERY_LENGTH = 2;
const MAX_DISPLAY_ITEMS = 12;

interface SearchPageClientProps {
  locale: SupportedLocale;
  initialItems: FeedItem[];
}

type SearchState =
  | "hot"
  | "typing"
  | "searching"
  | "results"
  | "empty"
  | "error";

interface HydratedFeedRecord {
  item: FeedItem;
  sortAtMillis: number;
  order: number;
}

interface ViewportMetrics {
  height: number;
  isCompact: boolean;
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
      const errorBody = (await response.json()) as {
        message?: string;
        error?: string;
      };
      if (typeof errorBody.message === "string" && errorBody.message.trim()) {
        message = errorBody.message;
      } else if (
        typeof errorBody.error === "string" &&
        errorBody.error.trim()
      ) {
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

export function SearchPageClient({
  locale,
  initialItems,
}: SearchPageClientProps) {
  const t =
    locale === "zh"
      ? {
          protocol: "检索协议",
          placeholder: "Search Atelier...",
          recentLabel: "最近",
          quickTerms: ["极简", "东京", "胶片", "夜色"],
          hotLabel: "热门内容",
          typingHint: `至少输入 ${MIN_QUERY_LENGTH} 个字符开始搜索。`,
          searching:
            "正在检索全部可搜索内容（标题 / 正文 / 标签 / 地点 / 元数据）...",
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
    () =>
      initialItems
        .filter((item) => item.type !== "action")
        .slice(0, MAX_DISPLAY_ITEMS),
    [initialItems]
  );

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [searchItems, setSearchItems] = useState<FeedItem[]>([]);
  const [searchState, setSearchState] = useState<SearchState>("hot");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [viewportMetrics, setViewportMetrics] = useState<ViewportMetrics>({
    height: 844,
    isCompact: false,
  });

  const requestTokenRef = useRef(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(query);
    }, 280);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const mediaQuery = window.matchMedia("(max-width: 767px)");
    let frame = 0;

    const commitViewportMetrics = () => {
      frame = 0;
      const nextMetrics = {
        height: Math.round(window.innerHeight),
        isCompact: mediaQuery.matches,
      };

      setViewportMetrics((previous) =>
        previous.height === nextMetrics.height &&
        previous.isCompact === nextMetrics.isCompact
          ? previous
          : nextMetrics
      );
    };

    const scheduleViewportSync = () => {
      if (frame !== 0) {
        return;
      }

      frame = window.requestAnimationFrame(commitViewportMetrics);
    };

    scheduleViewportSync();

    window.addEventListener("resize", scheduleViewportSync);

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", scheduleViewportSync);
    } else {
      mediaQuery.addListener(scheduleViewportSync);
    }

    return () => {
      if (frame !== 0) {
        window.cancelAnimationFrame(frame);
      }
      window.removeEventListener("resize", scheduleViewportSync);
      if (typeof mediaQuery.addEventListener === "function") {
        mediaQuery.removeEventListener("change", scheduleViewportSync);
      } else {
        mediaQuery.removeListener(scheduleViewportSync);
      }
    };
  }, []);

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
  const hasActiveQuery = queryLength >= MIN_QUERY_LENGTH;
  const isCompactViewport = viewportMetrics.isCompact;
  const mobileCellBudget = isCompactViewport
    ? getSearchMobileCellBudget(viewportMetrics.height)
    : undefined;
  const mobileRowHeight = isCompactViewport
    ? getSearchMobileRowHeight(viewportMetrics.height)
    : undefined;
  const shouldHideQuickTerms = isCompactViewport && hasActiveQuery;
  const shouldCondenseHeader =
    isCompactViewport && (queryLength > 0 || viewportMetrics.height < 760);
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
          "fixed inset-0 z-20 flex flex-col items-center pt-3 sm:pt-4 md:pt-[10vh]"
        )}
      >
        <div className="bg-noise pointer-events-none fixed inset-0 z-0 opacity-30 mix-blend-overlay" />

        <div className="relative z-30 mb-3 w-full max-w-[28rem] px-4 md:mb-10 md:max-w-4xl md:px-8">
          <div className="group relative mx-auto max-w-2xl">
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className={cn(
                styles.input,
                "text-ink w-full bg-transparent text-center leading-none focus:outline-none md:py-4 md:text-6xl",
                shouldCondenseHeader
                  ? "py-1 text-[clamp(2rem,10vw,3rem)]"
                  : "py-1.5 text-[clamp(2.35rem,11vw,3.6rem)]",
                !isCompactViewport && "py-2 text-[clamp(2.5rem,11vw,3.75rem)]"
              )}
              placeholder={t.placeholder}
              type="text"
            />
            <div className="dark:via-white/16 absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-black/20 to-transparent transition-all duration-500 group-focus-within:via-black/80 dark:group-focus-within:via-white/55" />
          </div>

          {!shouldHideQuickTerms ? (
            <div className="mt-2 flex justify-center opacity-70 md:mt-5">
              <div className="text-ink-light flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[10px] md:gap-2 md:text-xs">
                <span>{t.recentLabel}:</span>
                {t.quickTerms.map((term, index) => (
                  <span key={term} className="inline-flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setQuery(term)}
                      className="hover:text-ink transition-colors hover:underline"
                    >
                      {term}
                    </button>
                    {index < t.quickTerms.length - 1 ? (
                      <span className="opacity-30">•</span>
                    ) : null}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          <p className="text-ink-light mt-2 text-center text-[10px] md:mt-4 md:text-xs">
            {headerText}
          </p>
        </div>

        <div
          className={cn(
            styles.noScrollbar,
            "z-10 min-h-0 w-full max-w-[28rem] flex-1 px-4 pb-[calc(5.75rem+env(safe-area-inset-bottom))] md:max-w-5xl md:px-6 md:pb-36",
            searchState === "hot" || searchState === "typing"
              ? "overflow-hidden"
              : "overflow-hidden md:overflow-y-auto"
          )}
        >
          {displayItems.length > 0 ? (
            <SearchFeedGrid
              items={displayItems}
              isCompactViewport={isCompactViewport}
              mobileRowHeight={mobileRowHeight}
              mobileViewportHeight={viewportMetrics.height}
              stretchSparseItems={searchState === "results"}
              maxMobileCells={mobileCellBudget}
              maxDesktopCells={
                searchState === "hot" || searchState === "typing"
                  ? 8
                  : undefined
              }
            />
          ) : searchState === "searching" ? (
            <div className="text-ink-light dark:border-white/12 mx-auto max-w-2xl rounded-3xl border border-black/10 bg-white/75 px-5 py-6 text-center text-sm dark:bg-[rgba(43,51,64,0.78)] dark:text-[#b7c3d2] md:px-6 md:py-8">
              {t.searching}
            </div>
          ) : (
            <div className="text-ink-light dark:border-white/12 mx-auto max-w-2xl rounded-3xl border border-black/10 bg-white/75 px-5 py-6 text-center text-sm dark:bg-[rgba(43,51,64,0.78)] dark:text-[#b7c3d2] md:px-6 md:py-8">
              {headerText}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
