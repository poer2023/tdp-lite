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

const LAYOUT_PREFETCH_DELAY_MS = 320;
const LAYOUT_IDLE_TIMEOUT_MS = 900;

type WindowWithIdleCallback = Window & {
  requestIdleCallback?: (
    callback: IdleRequestCallback,
    options?: IdleRequestOptions
  ) => number;
  cancelIdleCallback?: (handle: number) => void;
};

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
  const [hasDeferredFeedFailed, setHasDeferredFeedFailed] =
    useState(() => initialCount >= totalLimit);
  const hasStartedRef = useRef(false);

  useEffect(() => {
    resetHomeImagesReady();
  }, []);

  useEffect(() => {
    const hasSettledInitialMediaWindow =
      initialCount >= totalLimit ||
      items.length > initialCount ||
      hasDeferredFeedFailed;

    if (!hasSettledInitialMediaWindow) {
      return;
    }

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
  }, [hasDeferredFeedFailed, initialCount, items.length, totalLimit]);

  useEffect(() => {
    const idleWindow = window as WindowWithIdleCallback;
    let timeoutId: number | null = null;
    let idleCallbackId: number | null = null;
    let isActive = true;

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
        .catch(() => {
          if (!isActive) {
            return;
          }

          setHasDeferredFeedFailed(true);
        });
    };

    timeoutId = window.setTimeout(() => {
      if (typeof idleWindow.requestIdleCallback === "function") {
        idleCallbackId = idleWindow.requestIdleCallback(startLoading, {
          timeout: LAYOUT_IDLE_TIMEOUT_MS,
        });
        return;
      }

      startLoading();
    }, LAYOUT_PREFETCH_DELAY_MS);

    return () => {
      isActive = false;

      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }

      if (
        idleCallbackId !== null &&
        typeof idleWindow.cancelIdleCallback === "function"
      ) {
        idleWindow.cancelIdleCallback(idleCallbackId);
      }
    };
  }, [initialCount, locale, totalLimit]);

  return (
    <BentoGrid
      items={items}
      deferVisibleMediaUntilIndex={items.length}
      deferNonPriorityMedia
      deferCardRenderingAfter={8}
    />
  );
}
