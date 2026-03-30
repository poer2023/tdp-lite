"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { toLocalizedPath } from "@/lib/locale-routing";
import type { FeedItem } from "@/components/bento/types";
import { PostCard } from "@/components/bento/cards/PostCard";
import { MomentCard } from "@/components/bento/cards/MomentCard";
import { GalleryCard } from "@/components/bento/cards/GalleryCard";
import {
  computeBentoSpanKeys,
  getFeedItemLayoutKey,
  getHighlightedItemId,
  type BentoSpanKey,
  TWO_COLUMN_MOBILE_BENTO_SPAN_CLASS,
} from "@/components/bento/layoutEngine";
import { getSearchSparseMobileSpan } from "@/components/search/mobileLayout";

interface SearchFeedGridProps {
  items: FeedItem[];
  className?: string;
  maxDesktopCells?: number;
  maxMobileCells?: number;
  isCompactViewport?: boolean;
  mobileRowHeight?: number;
  mobileViewportHeight?: number;
  stretchSparseItems?: boolean;
}

function getSpanCellCost(span: BentoSpanKey): number {
  if (span === "2x2") return 4;
  if (span === "2x1" || span === "1x2") return 2;
  return 1;
}

export function SearchFeedGrid({
  items,
  className,
  maxDesktopCells,
  maxMobileCells,
  isCompactViewport = false,
  mobileRowHeight = 124,
  mobileViewportHeight = 0,
  stretchSparseItems = false,
}: SearchFeedGridProps) {
  const spanKeyByItemKey = computeBentoSpanKeys(items);
  const maxVisibleCells = isCompactViewport ? maxMobileCells : maxDesktopCells;
  const visibleItems =
    typeof maxVisibleCells === "number" && maxVisibleCells > 0
      ? (() => {
          const selected: FeedItem[] = [];
          let used = 0;
          for (const item of items) {
            const itemKey = getFeedItemLayoutKey(item);
            const spanKey = spanKeyByItemKey[itemKey] ?? "1x1";
            const cost = getSpanCellCost(spanKey);
            if (used + cost > maxVisibleCells) {
              break;
            }
            selected.push(item);
            used += cost;
          }
          return selected;
        })()
      : items;
  const highlightedId = getHighlightedItemId(visibleItems);
  const gridStyle = {
    "--search-feed-row-height": `${mobileRowHeight}px`,
  } as CSSProperties;

  return (
    <div
      style={gridStyle}
      className={cn(
        "grid grid-flow-dense auto-rows-[var(--search-feed-row-height)] grid-cols-2 gap-2.5 md:auto-rows-[220px] md:grid-cols-3 md:gap-4 lg:grid-cols-4",
        className
      )}
    >
      {visibleItems.map((item, index) => {
        const itemKey = getFeedItemLayoutKey(item);
        const baseSpanKey = spanKeyByItemKey[itemKey] ?? "1x1";
        const effectiveSpanKey =
          isCompactViewport && stretchSparseItems
            ? getSearchSparseMobileSpan(baseSpanKey, {
                itemCount: visibleItems.length,
                itemIndex: index,
                viewportHeight: mobileViewportHeight,
              })
            : baseSpanKey;
        const spanClass =
          TWO_COLUMN_MOBILE_BENTO_SPAN_CLASS[effectiveSpanKey] ??
          "col-span-1 row-span-1";
        const isHighlighted =
          item.type !== "action" && item.id === highlightedId;

        if (item.type === "post") {
          return (
            <div key={itemKey} className={cn("bento-card", spanClass)}>
              <PostCard post={item} isHighlighted={isHighlighted} />
            </div>
          );
        }

        if (item.type === "moment") {
          return (
            <div key={itemKey} className={cn("bento-card", spanClass)}>
              {/* Keep Home card visuals but disable preview mode on search page: click jumps to detail route. */}
              <MomentCard moment={item} isHighlighted={isHighlighted} />
            </div>
          );
        }

        if (item.type === "gallery") {
          return (
            <Link
              key={itemKey}
              href={toLocalizedPath(item.locale, `/gallery/${item.id}`)}
              className={cn("bento-card", spanClass)}
            >
              <GalleryCard item={item} />
            </Link>
          );
        }

        return null;
      })}
    </div>
  );
}
