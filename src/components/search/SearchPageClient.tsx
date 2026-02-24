"use client";

import Image from "next/image";
import Link from "next/link";
import { Camera, MapPin } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatDate, formatRelativeTime } from "@/lib/utils";
import type {
  SearchFilters as SearchFiltersPayload,
  SearchGalleryItem,
  SearchMomentItem,
  SearchPostItem,
  SearchSection,
  SearchSectionResponse,
  SupportedLocale,
} from "@/lib/search/contracts";
import { SearchFilters, type SearchFilterDraft } from "./SearchFilters";
import { SearchInput } from "./SearchInput";
import { SearchSectionList } from "./SearchSectionList";
import { highlightText } from "./highlight";
import { toLocalizedPath } from "@/lib/locale-routing";

const SEARCH_SECTIONS: SearchSection[] = ["post", "moment", "gallery"];
const PUBLIC_SEARCH_ENDPOINT = "/api/search";
const MIN_QUERY_LENGTH = 2;

interface SearchPageClientProps {
  locale: SupportedLocale;
}

interface SectionState<T extends { id: string }> {
  items: T[];
  isLoading: boolean;
  hasMore: boolean;
  nextCursor: string | null;
  error: string | null;
}

type SectionStateMap = {
  post: SectionState<SearchPostItem>;
  moment: SectionState<SearchMomentItem>;
  gallery: SectionState<SearchGalleryItem>;
};

const defaultFilters: SearchFilterDraft = {
  localeScope: "all",
  dateFrom: "",
  dateTo: "",
  tags: "",
  location: "",
  camera: "",
  lens: "",
  focalLength: "",
  aperture: "",
  isoMin: "",
  isoMax: "",
};

function createEmptySectionState<T extends { id: string }>(): SectionState<T> {
  return {
    items: [],
    isLoading: false,
    hasMore: false,
    nextCursor: null,
    error: null,
  };
}

function createInitialSections(): SectionStateMap {
  return {
    post: createEmptySectionState<SearchPostItem>(),
    moment: createEmptySectionState<SearchMomentItem>(),
    gallery: createEmptySectionState<SearchGalleryItem>(),
  };
}

function parseOptionalNumber(value: string): number | undefined {
  if (!value.trim()) {
    return undefined;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function buildFiltersPayload(draft: SearchFilterDraft): SearchFiltersPayload {
  const tags = draft.tags
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
  const isoMin = parseOptionalNumber(draft.isoMin);
  const isoMax = parseOptionalNumber(draft.isoMax);

  return {
    localeScope: draft.localeScope,
    ...(draft.dateFrom ? { dateFrom: draft.dateFrom } : {}),
    ...(draft.dateTo ? { dateTo: draft.dateTo } : {}),
    ...(tags.length > 0 ? { tags } : {}),
    ...(draft.location.trim() ? { location: draft.location.trim() } : {}),
    ...(draft.camera.trim() ? { camera: draft.camera.trim() } : {}),
    ...(draft.lens.trim() ? { lens: draft.lens.trim() } : {}),
    ...(draft.focalLength.trim()
      ? { focalLength: draft.focalLength.trim() }
      : {}),
    ...(draft.aperture.trim() ? { aperture: draft.aperture.trim() } : {}),
    ...(isoMin !== undefined ? { isoMin } : {}),
    ...(isoMax !== undefined ? { isoMax } : {}),
  };
}

function mergeUniqueItems<T extends { id: string }>(existing: T[], next: T[]): T[] {
  const seen = new Set(existing.map((item) => item.id));
  const merged = [...existing];
  for (const item of next) {
    if (!seen.has(item.id)) {
      merged.push(item);
      seen.add(item.id);
    }
  }
  return merged;
}

function shouldSkipOptimization(src: string): boolean {
  return src.startsWith("blob:") || src.startsWith("data:");
}

export function SearchPageClient({ locale }: SearchPageClientProps) {
  const t =
    locale === "zh"
      ? {
          placeholder: "搜索文章、动态和画廊元数据...",
          clear: "清空搜索",
          startHint: "输入关键词，检索全部已发布文章、公开动态与画廊元数据。",
          minHint: `至少输入 ${MIN_QUERY_LENGTH} 个字符开始搜索。`,
          emptyHint: "当前查询与筛选条件下没有结果。",
          quickLabel: "快速开始",
          searchStatus: "检索状态",
          idleState: "等待输入关键词",
          typingState: "继续输入以开始检索",
          searchingState: "正在检索中...",
          resultState: "结果已更新",
          resultSummary: "检索结果",
          filterSummary: "筛选条件",
          noFilter: "无",
          posts: "文章",
          moments: "动态",
          gallery: "画廊",
          emptyPosts: "没有匹配的文章。",
          emptyMoments: "没有匹配的动态。",
          emptyGallery: "没有匹配的画廊内容。",
          loading: "加载中...",
          untitled: "未命名",
          noMetadata: "无元数据",
          requestFailed: "搜索请求失败",
        }
      : {
          placeholder: "Search posts, moments, gallery metadata...",
          clear: "Clear search",
          startHint:
            "Enter keywords to start searching all published posts, moments and gallery metadata.",
          minHint: `Type at least ${MIN_QUERY_LENGTH} characters to start searching.`,
          emptyHint: "No results found for current query and filters.",
          quickLabel: "Quick Start",
          searchStatus: "Search Status",
          idleState: "Waiting for keyword input",
          typingState: "Keep typing to start searching",
          searchingState: "Searching...",
          resultState: "Results updated",
          resultSummary: "Search Results",
          filterSummary: "Filters",
          noFilter: "None",
          posts: "Posts",
          moments: "Moments",
          gallery: "Gallery",
          emptyPosts: "No matching posts.",
          emptyMoments: "No matching moments.",
          emptyGallery: "No matching gallery items.",
          loading: "Loading...",
          untitled: "Untitled",
          noMetadata: "No metadata",
          requestFailed: "Search request failed",
        };

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [filters, setFilters] = useState<SearchFilterDraft>(defaultFilters);
  const [sections, setSections] = useState<SectionStateMap>(() =>
    createInitialSections()
  );
  const requestTokenRef = useRef(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  const filterPayload = useMemo(() => buildFiltersPayload(filters), [filters]);

  const fetchSection = useCallback(
    async <S extends SearchSection>(
      section: S,
      options: {
        reset: boolean;
        queryValue: string;
        cursor?: string | null;
        token: number;
      }
    ) => {
      setSections((prev) => {
        const current = prev[section];
        const nextState = {
          ...current,
          isLoading: true,
          error: null,
          ...(options.reset
            ? {
                items: [],
                hasMore: false,
                nextCursor: null,
              }
            : {}),
        };
        return {
          ...prev,
          [section]: nextState,
        } as SectionStateMap;
      });

      try {
        const response = await fetch(PUBLIC_SEARCH_ENDPOINT, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            section,
            query: options.queryValue,
            locale,
            filters: filterPayload,
            cursor: options.cursor || undefined,
            limit: 12,
          }),
        });

        if (!response.ok) {
          let message = `${t.requestFailed} (${response.status})`;
          try {
            const errorBody = (await response.json()) as { message?: string; error?: string };
            if (typeof errorBody.message === "string" && errorBody.message.trim()) {
              message = errorBody.message;
            } else if (
              typeof errorBody.error === "string" &&
              errorBody.error.trim()
            ) {
              message = errorBody.error;
            }
          } catch {
            // ignore malformed error body and keep status-based message
          }
          throw new Error(message);
        }

        const payload = (await response.json()) as SearchSectionResponse<S>;
        if (requestTokenRef.current !== options.token) {
          return;
        }

        setSections((prev) => {
          const current = prev[section] as SectionState<(typeof payload.items)[number]>;
          const nextItems = options.reset
            ? payload.items
            : mergeUniqueItems(current.items, payload.items);
          const nextState: SectionState<(typeof payload.items)[number]> = {
            items: nextItems,
            isLoading: false,
            hasMore: payload.hasMore,
            nextCursor: payload.nextCursor,
            error: null,
          };
          return {
            ...prev,
            [section]: nextState,
          } as SectionStateMap;
        });
      } catch (error) {
        if (requestTokenRef.current !== options.token) {
          return;
        }
        const message =
          error instanceof Error ? error.message : t.requestFailed;
        setSections((prev) => ({
          ...prev,
          [section]: {
            ...prev[section],
            isLoading: false,
            error: message,
          },
        }));
      }
    },
    [filterPayload, locale, t.requestFailed]
  );

  useEffect(() => {
    const trimmedQuery = debouncedQuery.trim();
    requestTokenRef.current += 1;
    const token = requestTokenRef.current;

    if (!trimmedQuery) {
      setSections(createInitialSections());
      return;
    }
    if (trimmedQuery.length < MIN_QUERY_LENGTH) {
      setSections(createInitialSections());
      return;
    }

    for (const section of SEARCH_SECTIONS) {
      void fetchSection(section, {
        reset: true,
        queryValue: trimmedQuery,
        token,
      });
    }
  }, [debouncedQuery, fetchSection, filterPayload]);

  const loadMore = useCallback(
    (section: SearchSection) => {
      const trimmedQuery = debouncedQuery.trim();
      if (!trimmedQuery || trimmedQuery.length < MIN_QUERY_LENGTH) {
        return;
      }
      const current = sections[section];
      if (!current.hasMore || current.isLoading || !current.nextCursor) {
        return;
      }

      void fetchSection(section, {
        reset: false,
        queryValue: trimmedQuery,
        cursor: current.nextCursor,
        token: requestTokenRef.current,
      });
    },
    [debouncedQuery, fetchSection, sections]
  );

  const queryLength = query.trim().length;
  const debouncedQueryLength = debouncedQuery.trim().length;
  const hasActiveQuery = queryLength > 0;
  const isQueryReady = queryLength >= MIN_QUERY_LENGTH;
  const hasExecutedSearch = debouncedQueryLength >= MIN_QUERY_LENGTH;
  const hasAnyResult =
    sections.post.items.length > 0 ||
    sections.moment.items.length > 0 ||
    sections.gallery.items.length > 0;
  const isAnyLoading =
    sections.post.isLoading || sections.moment.isLoading || sections.gallery.isLoading;
  const totalResults =
    sections.post.items.length + sections.moment.items.length + sections.gallery.items.length;
  const quickQueries =
    locale === "zh"
      ? ["东京", "咖啡", "街头", "夜景"]
      : ["tokyo", "coffee", "street", "night"];
  const activeFilterCount = useMemo(() => {
    const keywordFilters = [
      filters.dateFrom,
      filters.dateTo,
      filters.tags,
      filters.location,
      filters.camera,
      filters.lens,
      filters.focalLength,
      filters.aperture,
      filters.isoMin,
      filters.isoMax,
    ].filter((value) => value.trim().length > 0).length;
    return keywordFilters + (filters.localeScope === "current" ? 1 : 0);
  }, [filters]);
  const searchStateText = !hasActiveQuery
    ? t.idleState
    : !isQueryReady
      ? t.typingState
      : isAnyLoading
        ? t.searchingState
        : hasAnyResult
          ? t.resultState
          : t.emptyHint;

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,370px)_minmax(0,1fr)] xl:gap-6">
      <aside className="space-y-4 xl:sticky xl:top-8 xl:self-start">
        <section className="lg-panel-medium rounded-2xl border border-black/10 bg-white/80 p-4 shadow-sm">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder={t.placeholder}
            clearLabel={t.clear}
          />
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#777]">
              {t.quickLabel}
            </span>
            {quickQueries.map((term) => (
              <button
                key={term}
                type="button"
                onClick={() => setQuery(term)}
                className="rounded-full border border-black/10 bg-white/90 px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-[#666] transition-colors hover:border-black/20 hover:bg-black/5 hover:text-[#111]"
              >
                {term}
              </button>
            ))}
          </div>
        </section>

        <SearchFilters locale={locale} value={filters} onChange={setFilters} />

        <section className="lg-panel-medium rounded-2xl border border-black/10 bg-white/80 p-4 shadow-sm">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#777]">
            {t.searchStatus}
          </p>
          <p className="mt-1 text-sm text-[#333]">{searchStateText}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-[#666]">
            <span className="rounded-full bg-black/5 px-2.5 py-1">
              {t.resultSummary}: {totalResults}
            </span>
            <span className="rounded-full bg-black/5 px-2.5 py-1">
              {t.filterSummary}: {activeFilterCount > 0 ? activeFilterCount : t.noFilter}
            </span>
          </div>
        </section>
      </aside>

      <section className="space-y-4">
        {!hasActiveQuery ? (
          <div className="lg-panel-medium rounded-2xl border border-dashed border-black/15 bg-white/60 px-6 py-10 text-center">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-[#777]">
              {t.startHint}
            </p>
          </div>
        ) : !isQueryReady ? (
          <div className="lg-panel-medium rounded-2xl border border-dashed border-black/15 bg-white/60 px-6 py-10 text-center">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-[#777]">
              {t.minHint}
            </p>
          </div>
        ) : (
          <>
            {hasExecutedSearch && !isAnyLoading && !hasAnyResult ? (
              <div className="lg-panel-medium rounded-2xl border border-dashed border-black/15 bg-white/60 px-6 py-10 text-center">
                <p className="font-mono text-xs uppercase tracking-[0.22em] text-[#777]">
                  {t.emptyHint}
                </p>
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
              <SearchSectionList<SearchPostItem>
                title={t.posts}
                items={sections.post.items}
                isLoading={sections.post.isLoading}
                hasMore={sections.post.hasMore}
                error={sections.post.error}
                emptyLabel={t.emptyPosts}
                loadingLabel={t.loading}
                onLoadMore={() => loadMore("post")}
                renderItem={(item) => (
                  <article
                    key={item.id}
                    className="rounded-xl border border-black/8 bg-white px-3 py-3 shadow-[0_2px_10px_rgba(0,0,0,0.03)]"
                  >
                    <Link
                      href={toLocalizedPath(item.locale, `/posts/${item.slug}`)}
                      className="group block space-y-2"
                    >
                      <h4 className="line-clamp-2 text-base font-semibold text-[#111] transition-colors group-hover:text-[#000]">
                        {highlightText(item.title, debouncedQuery)}
                      </h4>
                      <p className="line-clamp-3 text-sm text-[#666]">
                        {highlightText(item.excerpt, debouncedQuery)}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-[#777]">
                        <span>{formatDate(item.sortAt, item.locale)}</span>
                        {item.tags.slice(0, 2).map((tag) => (
                          <span key={tag} className="rounded-full bg-black/5 px-2 py-0.5">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </Link>
                  </article>
                )}
              />

              <SearchSectionList<SearchMomentItem>
                title={t.moments}
                items={sections.moment.items}
                isLoading={sections.moment.isLoading}
                hasMore={sections.moment.hasMore}
                error={sections.moment.error}
                emptyLabel={t.emptyMoments}
                loadingLabel={t.loading}
                onLoadMore={() => loadMore("moment")}
                renderItem={(item) => (
                  <article
                    key={item.id}
                    className="rounded-xl border border-black/8 bg-white px-3 py-3 shadow-[0_2px_10px_rgba(0,0,0,0.03)]"
                  >
                    <Link
                      href={toLocalizedPath(item.locale, `/moments/${item.id}`)}
                      className="group block space-y-2"
                    >
                      <p className="line-clamp-5 text-sm leading-relaxed text-[#333]">
                        {highlightText(item.content, debouncedQuery)}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-[#777]">
                        <span className="font-mono uppercase tracking-wider">
                          {formatRelativeTime(item.sortAt, item.locale)}
                        </span>
                        {item.locationName ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-black/5 px-2 py-0.5">
                            <MapPin className="h-3 w-3" />
                            <span className="text-[11px]">
                              {highlightText(item.locationName, debouncedQuery)}
                            </span>
                          </span>
                        ) : null}
                      </div>
                    </Link>
                  </article>
                )}
              />

              <SearchSectionList<SearchGalleryItem>
                title={t.gallery}
                items={sections.gallery.items}
                isLoading={sections.gallery.isLoading}
                hasMore={sections.gallery.hasMore}
                error={sections.gallery.error}
                emptyLabel={t.emptyGallery}
                loadingLabel={t.loading}
                onLoadMore={() => loadMore("gallery")}
                renderItem={(item) => {
                  const imageSrc = item.thumbUrl || item.fileUrl;
                  const galleryHref = item.imageId
                    ? `/gallery/${item.imageId}`
                    : "/gallery";
                  const title = item.title?.trim() || t.untitled;
                  const metaParts = [
                    item.camera,
                    item.lens,
                    item.focalLength,
                    item.aperture,
                  ].filter((part): part is string => Boolean(part));
                  return (
                    <article
                      key={item.id}
                      className="rounded-xl border border-black/8 bg-white px-3 py-3 shadow-[0_2px_10px_rgba(0,0,0,0.03)]"
                    >
                      <Link
                        href={toLocalizedPath(item.locale, galleryHref)}
                        className="group flex gap-3"
                      >
                        <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border border-black/8 bg-black/5">
                          <Image
                            src={imageSrc}
                            alt={title}
                            fill
                            unoptimized={shouldSkipOptimization(imageSrc)}
                            sizes="64px"
                            className="object-cover"
                          />
                        </div>

                        <div className="min-w-0 space-y-1.5">
                          <h4 className="line-clamp-1 text-sm font-semibold text-[#111]">
                            {highlightText(title, debouncedQuery)}
                          </h4>
                          <div className="line-clamp-2 text-xs text-[#666]">
                            {metaParts.length > 0
                              ? metaParts.map((part, index) => (
                                  <span key={`${item.id}-${part}-${index}`}>
                                    {index > 0 ? " • " : ""}
                                    {highlightText(part, debouncedQuery)}
                                  </span>
                                ))
                              : t.noMetadata}
                          </div>
                          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-[#777]">
                            <span>{formatDate(item.sortAt, item.locale)}</span>
                            {item.iso ? (
                              <span className="inline-flex items-center gap-1">
                                <Camera className="h-3 w-3" />
                                ISO {item.iso}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </Link>
                    </article>
                  );
                }}
              />
            </div>
          </>
        )}
      </section>
    </div>
  );
}
