"use client";

import { startTransition, useEffect, useRef, useState } from "react";
import { BentoGrid } from "@/components/bento/BentoGrid";
import { getFeedItemLayoutKey } from "@/components/bento/layoutEngine";
import type { FeedItem } from "@/components/bento/types";
import {
  reviveSearchFeedItem,
  type SearchSerializedFeedItem,
} from "@/lib/search/feedItemSnapshot";
import {
  resetHomeImagesReady,
  sealHomeImagesReadyCollection,
} from "./homeMediaPhases";

type Locale = "en" | "zh";

interface HomeProgressiveBentoFeedProps {
  initialItems: FeedItem[];
  locale: Locale;
  initialCount: number;
  totalLimit: number;
}

interface FeedResponse {
  items: SearchSerializedFeedItem[];
}

function mergeFeedItems(current: FeedItem[], next: FeedItem[]): FeedItem[] {
  const merged = new Map<string, FeedItem>();

  current.forEach((item) => {
    merged.set(getFeedItemLayoutKey(item), item);
  });

  next.forEach((item) => {
    merged.set(getFeedItemLayoutKey(item), item);
  });

  return Array.from(merged.values());
}

export function HomeProgressiveBentoFeed({
  initialItems,
  locale,
  initialCount,
  totalLimit,
}: HomeProgressiveBentoFeedProps) {
  const [items, setItems] = useState<FeedItem[]>(() => initialItems);
  const hasStartedRef = useRef(false);

  useEffect(() => {
    resetHomeImagesReady();

    let frameA = 0;
    let frameB = 0;

    frameA = window.requestAnimationFrame(() => {
      frameB = window.requestAnimationFrame(() => {
        sealHomeImagesReadyCollection();
      });
    });

    return () => {
      window.cancelAnimationFrame(frameA);
      window.cancelAnimationFrame(frameB);
    };
  }, []);

  useEffect(() => {
    let isActive = true;
    const abortController = new AbortController();

    const startLoading = () => {
      if (!isActive || hasStartedRef.current || initialCount >= totalLimit) {
        return;
      }

      hasStartedRef.current = true;

      const searchParams = new URLSearchParams({
        locale,
        limit: String(totalLimit),
        offset: String(initialCount),
      });

      void fetch(`/api/feed?${searchParams.toString()}`, {
        cache: "force-cache",
        signal: abortController.signal,
      })
        .then(async (response) => {
          if (!response.ok) {
            throw new Error(`Feed request failed (${response.status})`);
          }

          const payload = (await response.json()) as FeedResponse;
          const nextItems = payload.items.map(reviveSearchFeedItem);

          if (!isActive) {
            return;
          }

          startTransition(() => {
            setItems((current) => mergeFeedItems(current, nextItems));
          });
        })
        .catch((error: unknown) => {
          if (!isActive) {
            return;
          }

          if (
            error instanceof DOMException &&
            error.name === "AbortError"
          ) {
            return;
          }

        });
    };

    startLoading();

    return () => {
      isActive = false;
      abortController.abort();
    };
  }, [initialCount, locale, totalLimit]);

  return (
    <BentoGrid
      items={items}
      priorityMediaCount={4}
      homeImagePhaseMediaCount={4}
      deferVisibleMediaUntilIndex={0}
      deferCardRenderingAfter={12}
    />
  );
}
