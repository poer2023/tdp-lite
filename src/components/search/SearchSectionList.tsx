"use client";

import { useEffect, useRef } from "react";

interface SearchSectionListProps<T extends { id: string }> {
  title: string;
  items: T[];
  isLoading: boolean;
  hasMore: boolean;
  error: string | null;
  emptyLabel: string;
  onLoadMore: () => void;
  renderItem: (item: T) => React.ReactNode;
}

export function SearchSectionList<T extends { id: string }>({
  title,
  items,
  isLoading,
  hasMore,
  error,
  emptyLabel,
  onLoadMore,
  renderItem,
}: SearchSectionListProps<T>) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || isLoading || !hasMore) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const firstEntry = entries[0];
        if (firstEntry?.isIntersecting) {
          onLoadMore();
        }
      },
      { rootMargin: "180px 0px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, isLoading, onLoadMore, items.length]);

  return (
    <section className="rounded-2xl border border-black/10 bg-white/85 p-4 shadow-sm backdrop-blur-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="font-display text-xl font-semibold text-[#111]">{title}</h3>
        <span className="rounded-full bg-black/5 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-[#666]">
          {items.length}
        </span>
      </div>

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {items.length === 0 && !isLoading && !error ? (
        <p className="rounded-xl border border-dashed border-black/10 bg-black/[0.015] px-3 py-4 text-sm text-[#666]">
          {emptyLabel}
        </p>
      ) : (
        <div className="space-y-3">{items.map((item) => renderItem(item))}</div>
      )}

      {isLoading ? (
        <p className="mt-3 font-mono text-[11px] uppercase tracking-wider text-[#777]">
          Loading...
        </p>
      ) : null}

      {hasMore ? <div ref={sentinelRef} className="mt-2 h-2 w-full" /> : null}
    </section>
  );
}
