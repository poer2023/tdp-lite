"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { formatDate } from "@/lib/utils";
import { GalleryFilters } from "@/components/gallery/GalleryFilters";
import type {
  GalleryImageAggregateDTO,
  GallerySourceType,
  GalleryTimePreset,
} from "@/lib/gallery";

interface GalleryPageClientProps {
  locale: "en" | "zh";
  items: GalleryImageAggregateDTO[];
}

function shouldSkipOptimization(src: string): boolean {
  return src.startsWith("blob:") || src.startsWith("data:");
}

function passesTimePreset(latestAt: string, timePreset: GalleryTimePreset, now: Date): boolean {
  if (timePreset === "all") {
    return true;
  }

  const latest = new Date(latestAt);
  if (Number.isNaN(latest.getTime())) {
    return false;
  }

  if (timePreset === "today") {
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return latest.getTime() >= startOfToday.getTime();
  }

  const days = timePreset === "7d" ? 7 : 30;
  const threshold = now.getTime() - days * 24 * 60 * 60 * 1000;
  return latest.getTime() >= threshold;
}

export function GalleryPageClient({ locale, items }: GalleryPageClientProps) {
  const [sourceTypes, setSourceTypes] = useState<GallerySourceType[]>([
    "post",
    "moment",
  ]);
  const [timePreset, setTimePreset] = useState<GalleryTimePreset>("all");

  const filtered = useMemo(() => {
    const selectedSources = new Set(sourceTypes);
    const now = new Date();

    return items.filter((item) => {
      const sourceMatched = item.sourceTypes.some((type) => selectedSources.has(type));
      if (!sourceMatched) {
        return false;
      }

      return passesTimePreset(item.latestAt, timePreset, now);
    });
  }, [items, sourceTypes, timePreset]);

  return (
    <div className="space-y-5">
      <GalleryFilters
        sourceTypes={sourceTypes}
        timePreset={timePreset}
        onSourceTypesChange={setSourceTypes}
        onTimePresetChange={setTimePreset}
      />

      <div className="flex items-center justify-between px-1">
        <p className="font-mono text-xs uppercase tracking-widest text-[#777]">
          {filtered.length} image{filtered.length === 1 ? "" : "s"}
        </p>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-black/15 bg-white/60 px-5 py-16 text-center">
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-[#777]">
            No images match current filters.
          </p>
        </div>
      ) : (
        <div className="columns-1 gap-4 sm:columns-2 lg:columns-3">
          {filtered.map((item) => {
            const imageSrc = item.thumbUrl || item.imageUrl;
            const sourceLabel = item.sourceTypes
              .map((type) => (type === "post" ? "Post" : "Moment"))
              .join(" + ");

            return (
              <Link
                key={item.imageId}
                href={`/${locale}/gallery/${item.imageId}`}
                className="group mb-4 block break-inside-avoid overflow-hidden rounded-2xl border border-black/5 bg-white shadow-[0_4px_20px_rgba(0,0,0,0.03)] transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(0,0,0,0.08)]"
              >
                <div className="relative overflow-hidden">
                  <Image
                    src={imageSrc}
                    alt={item.title || "Gallery image"}
                    width={item.width || 1200}
                    height={item.height || 900}
                    unoptimized={shouldSkipOptimization(imageSrc)}
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    className="h-auto w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                  />
                </div>

                <div className="space-y-2 p-3.5">
                  <h3 className="line-clamp-1 font-serif text-lg text-[#111]">
                    {item.title || "Untitled image"}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-[#666]">
                    <span className="rounded-full bg-black/5 px-2 py-0.5">{sourceLabel}</span>
                    <span className="rounded-full bg-black/5 px-2 py-0.5">
                      {item.sourceCount} source{item.sourceCount === 1 ? "" : "s"}
                    </span>
                    <span>{formatDate(item.latestAt, locale)}</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
