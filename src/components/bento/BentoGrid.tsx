import { cn } from "@/lib/utils";
import { FeedItem } from "./types";
import { PostCard } from "./cards/PostCard";
import { MomentCard } from "./cards/MomentCard";
import { GalleryCard } from "./cards/GalleryCard";
import { ActionCard } from "./cards/ActionCard";
import {
  computeBentoSpans,
  getFeedItemLayoutKey,
  getHighlightedItemId,
} from "./layoutEngine";

interface BentoGridProps {
  items: FeedItem[];
  className?: string;
}

export function BentoGrid({ items, className }: BentoGridProps) {
  const spanByItemKey = computeBentoSpans(items);
  const highlightedId = getHighlightedItemId(items);

  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-4 auto-rows-[220px] grid-flow-dense",
        className
      )}
    >
      {items.map((item) => {
        const itemKey = getFeedItemLayoutKey(item);
        const spanClass = spanByItemKey[itemKey] ?? "col-span-1 row-span-1";
        const isHighlighted = item.id === highlightedId;

        return (
          <div key={itemKey} className={cn("bento-card", spanClass)}>
            {item.type === "post" && (
              <PostCard post={item} isHighlighted={isHighlighted} />
            )}
            {item.type === "moment" && (
              <MomentCard moment={item} isHighlighted={isHighlighted} />
            )}
            {item.type === "gallery" && <GalleryCard item={item} />}
            {item.type === "action" && <ActionCard item={item} />}
          </div>
        );
      })}
    </div>
  );
}
