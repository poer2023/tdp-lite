"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { toLocalizedPath } from "@/lib/locale-routing";
import type { FeedItem } from "@/components/bento/types";
import { PostCard } from "@/components/bento/cards/PostCard";
import { MomentCard } from "@/components/bento/cards/MomentCard";
import { GalleryCard } from "@/components/bento/cards/GalleryCard";
import {
  computeBentoSpans,
  getFeedItemLayoutKey,
  getHighlightedItemId,
} from "@/components/bento/layoutEngine";

interface SearchFeedGridProps {
  items: FeedItem[];
  className?: string;
  maxDesktopCells?: number;
}

function getDesktopCellCost(spanClass: string): number {
  const isWide = spanClass.includes("md:col-span-2");
  const isTall = spanClass.includes("row-span-2");
  if (isWide && isTall) return 4;
  if (isWide || isTall) return 2;
  return 1;
}

export function SearchFeedGrid({
  items,
  className,
  maxDesktopCells,
}: SearchFeedGridProps) {
  const spanByItemKey = computeBentoSpans(items);
  const visibleItems =
    typeof maxDesktopCells === "number" && maxDesktopCells > 0
      ? (() => {
          const selected: FeedItem[] = [];
          let used = 0;
          for (const item of items) {
            const itemKey = getFeedItemLayoutKey(item);
            const spanClass = spanByItemKey[itemKey] ?? "col-span-1 row-span-1";
            const cost = getDesktopCellCost(spanClass);
            if (used + cost > maxDesktopCells) {
              break;
            }
            selected.push(item);
            used += cost;
          }
          return selected;
        })()
      : items;
  const highlightedId = getHighlightedItemId(visibleItems);

  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-4 auto-rows-[220px] grid-flow-dense",
        className
      )}
    >
      {visibleItems.map((item) => {
        const itemKey = getFeedItemLayoutKey(item);
        const spanClass = spanByItemKey[itemKey] ?? "col-span-1 row-span-1";
        const isHighlighted = item.type !== "action" && item.id === highlightedId;

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
