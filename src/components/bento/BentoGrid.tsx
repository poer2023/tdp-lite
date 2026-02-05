import { cn } from "@/lib/utils";
import { FeedItem } from "./types";
import { PostCard } from "./cards/PostCard";
import { MomentCard } from "./cards/MomentCard";
import { GalleryCard } from "./cards/GalleryCard";

interface BentoGridProps {
  items: FeedItem[];
  className?: string;
}

export function BentoGrid({ items, className }: BentoGridProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-4 auto-rows-[220px] grid-flow-dense",
        className
      )}
    >
      {items.map((item, index) => {
        const spanClass = getItemSpan(item, index);
        return (
          <div key={item.id} className={cn("bento-card", spanClass)}>
            {item.type === "post" && <PostCard post={item} isHero={index === 0} />}
            {item.type === "moment" && <MomentCard moment={item} />}
            {item.type === "gallery" && <GalleryCard item={item} />}
          </div>
        );
      })}
    </div>
  );
}

function getItemSpan(item: FeedItem, index: number): string {
  // First item is always Hero (2x2)
  if (index === 0) {
    return "col-span-1 md:col-span-2 row-span-2";
  }

  if (item.type === "post" && item.coverUrl) {
    // Posts with cover: Wide (2x1)
    return "col-span-1 md:col-span-2 row-span-1";
  }

  if (item.type === "moment") {
    if (item.media && item.media.length > 0) {
      // Image moments: Tall (1x2)
      return "col-span-1 row-span-2";
    }
    // Text moments: Standard (1x1)
    return "col-span-1 row-span-1";
  }

  if (item.type === "gallery") {
    // Gallery: Standard (1x1)
    return "col-span-1 row-span-1";
  }

  return "col-span-1 row-span-1";
}
