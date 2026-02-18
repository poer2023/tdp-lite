"use client";

import { cn } from "@/lib/utils";
import { FeedItem } from "./types";
import { PostCard } from "./cards/PostCard";
import { MomentCard } from "./cards/MomentCard";
import { GalleryCard } from "./cards/GalleryCard";
import { ActionCard } from "./cards/ActionCard";
import { useCallback, useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { toLocalizedPath } from "@/lib/locale-routing";
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
  const [previewingMomentId, setPreviewingMomentId] = useState<string | null>(null);

  const previewMoment = useMemo(() => {
    if (!previewingMomentId) {
      return null;
    }

    const found = items.find(
      (item) => item.type === "moment" && item.id === previewingMomentId
    );

    return found?.type === "moment" ? found : null;
  }, [items, previewingMomentId]);

  const openMomentPreview = useCallback((momentId: string, locale: string) => {
    setPreviewingMomentId(momentId);
    const detailPath = toLocalizedPath(locale, `/moments/${momentId}`);
    window.history.pushState({ previewingMomentId: momentId }, "", detailPath);
  }, []);

  const closeMomentPreview = useCallback(() => {
    if (!previewMoment) {
      return;
    }

    const homePath = toLocalizedPath(previewMoment.locale, "/");
    window.history.replaceState({}, "", homePath);
    setPreviewingMomentId(null);
  }, [previewMoment]);

  useEffect(() => {
    const onPopState = () => {
      if (!previewingMomentId) {
        return;
      }

      const currentPath = window.location.pathname;
      const isCurrentPreview = items.some(
        (item) =>
          item.type === "moment" &&
          item.id === previewingMomentId &&
          currentPath === toLocalizedPath(item.locale, `/moments/${item.id}`)
      );

      if (!isCurrentPreview) {
        setPreviewingMomentId(null);
      }
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [items, previewingMomentId]);

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
              <MomentCard
                moment={item}
                isHighlighted={isHighlighted}
                onOpenPreview={() => openMomentPreview(item.id, item.locale)}
              />
            )}
            {item.type === "gallery" && <GalleryCard item={item} />}
            {item.type === "action" && <ActionCard item={item} />}
          </div>
        );
      })}

      {previewMoment && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center px-4 py-8 md:px-8">
          <button
            type="button"
            aria-label="Close moment preview"
            className="lg-overlay-dark absolute inset-0 bg-black/30"
            onClick={closeMomentPreview}
          />

          <div className="relative z-10 w-full max-w-3xl">
            <button
              type="button"
              aria-label="Close preview"
              onClick={closeMomentPreview}
              className="lg-chip-dark absolute -top-12 right-0 inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/65 text-white transition hover:bg-black/80"
            >
              <X className="h-4 w-4" />
            </button>

            <MomentCard moment={previewMoment} preview className="min-h-[360px]" />
          </div>
        </div>
      )}
    </div>
  );
}
