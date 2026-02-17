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
          let message = `search request failed (${response.status})`;
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
          error instanceof Error ? error.message : "Search request failed.";
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
    [filterPayload, locale]
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

  return (
    <div className="space-y-5">
      <SearchInput value={query} onChange={setQuery} />

      <SearchFilters value={filters} onChange={setFilters} />

      {!hasActiveQuery ? (
        <div className="rounded-2xl border border-dashed border-black/15 bg-white/60 px-5 py-8 text-center">
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-[#777]">
            Enter keywords to start searching all published posts, moments and gallery metadata.
          </p>
        </div>
      ) : !isQueryReady ? (
        <div className="rounded-2xl border border-dashed border-black/15 bg-white/60 px-5 py-8 text-center">
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-[#777]">
            Type at least {MIN_QUERY_LENGTH} characters to start searching.
          </p>
        </div>
      ) : (
        <>
          {hasExecutedSearch && !isAnyLoading && !hasAnyResult ? (
            <div className="rounded-2xl border border-dashed border-black/15 bg-white/60 px-5 py-8 text-center">
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-[#777]">
                No results found for current query and filters.
              </p>
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <SearchSectionList<SearchPostItem>
              title="Posts"
              items={sections.post.items}
              isLoading={sections.post.isLoading}
              hasMore={sections.post.hasMore}
              error={sections.post.error}
              emptyLabel="No matching posts."
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
              title="Moments"
              items={sections.moment.items}
              isLoading={sections.moment.isLoading}
              hasMore={sections.moment.hasMore}
              error={sections.moment.error}
              emptyLabel="No matching moments."
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
              title="Gallery"
              items={sections.gallery.items}
              isLoading={sections.gallery.isLoading}
              hasMore={sections.gallery.hasMore}
              error={sections.gallery.error}
              emptyLabel="No matching gallery items."
              onLoadMore={() => loadMore("gallery")}
              renderItem={(item) => {
                const imageSrc = item.thumbUrl || item.fileUrl;
                const title = item.title?.trim() || "Untitled";
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
                      href={toLocalizedPath(item.locale, `/gallery#gallery-${item.id}`)}
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
                            : "No metadata"}
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
    </div>
  );
}
