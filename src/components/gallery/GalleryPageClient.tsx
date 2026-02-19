"use client";

import { useMemo } from "react";
import Link from "next/link";
import { MomentImageOnly } from "@/components/bento/cards/MomentImageOnly";
import {
  computeBentoSpans,
  getFeedItemLayoutKey,
} from "@/components/bento/layoutEngine";
import type { FeedItem } from "@/components/bento/types";
import { cn } from "@/lib/utils";
import { toLocalizedPath } from "@/lib/locale-routing";
import type { GalleryImageAggregateDTO } from "@/lib/gallery";

interface GalleryPageClientProps {
  locale: "en" | "zh";
  items: GalleryImageAggregateDTO[];
}

function shouldSkipOptimization(src: string): boolean {
  return src.startsWith("blob:") || src.startsWith("data:");
}

function toLayoutItem(item: GalleryImageAggregateDTO): Extract<FeedItem, { type: "gallery" }> {
  const latestAt = new Date(item.latestAt);

  return {
    type: "gallery",
    id: item.imageId,
    translationKey: item.imageId,
    locale: item.locale,
    fileUrl: item.imageUrl,
    thumbUrl: item.thumbUrl,
    title: item.title,
    width: item.width,
    height: item.height,
    capturedAt: item.capturedAt ? new Date(item.capturedAt) : null,
    camera: item.camera,
    lens: item.lens,
    focalLength: item.focalLength,
    aperture: item.aperture,
    iso: item.iso,
    latitude: item.latitude,
    longitude: item.longitude,
    isLivePhoto: false,
    videoUrl: null,
    status: "published",
    publishedAt: latestAt,
    createdAt: latestAt,
    updatedAt: latestAt,
    deletedAt: null,
  };
}

export function GalleryPageClient({ locale, items }: GalleryPageClientProps) {
  const t =
    locale === "zh"
      ? {
          empty: "还没有图片。",
          imageAlt: "画廊图片",
        }
      : {
          empty: "No images yet.",
          imageAlt: "Gallery image",
        };

  const cards = useMemo(() => {
    return items.map((item) => {
      const layoutItem = toLayoutItem(item);
      return {
        item,
        layoutKey: getFeedItemLayoutKey(layoutItem),
        layoutItem,
      };
    });
  }, [items]);

  const spanByItemKey = useMemo(() => {
    return computeBentoSpans(cards.map((card) => card.layoutItem));
  }, [cards]);

  return items.length === 0 ? (
    <div className="rounded-2xl border border-dashed border-black/15 bg-white/60 px-5 py-16 text-center">
      <p className="font-mono text-xs uppercase tracking-[0.22em] text-[#777]">
        {t.empty}
      </p>
    </div>
  ) : (
    <div className="grid auto-rows-[220px] grid-flow-dense grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-4">
      {cards.map(({ item, layoutKey }) => {
        const imageSrc = item.thumbUrl || item.imageUrl;
        const spanClass = spanByItemKey[layoutKey] ?? "col-span-1 row-span-1";

        return (
          <div key={item.imageId} className={cn("bento-card", spanClass)}>
            <Link
              href={toLocalizedPath(locale, `/gallery/${item.imageId}`)}
              className="group block h-full w-full"
            >
              <MomentImageOnly
                src={imageSrc}
                alt={item.title || t.imageAlt}
                sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                unoptimized={shouldSkipOptimization(imageSrc)}
                className="paper-card"
              />
            </Link>
          </div>
        );
      })}
    </div>
  );
}
