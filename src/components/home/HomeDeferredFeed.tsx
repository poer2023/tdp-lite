"use client";

import { useEffect, useRef, useState } from "react";
import { BentoGrid } from "@/components/bento/BentoGrid";
import type { FeedItem } from "@/components/bento/types";
import {
  reviveSearchFeedItem,
  type SearchSerializedFeedItem,
} from "@/lib/search/feedItemSnapshot";

type Locale = "en" | "zh";

interface HomeDeferredFeedProps {
  locale: Locale;
  initialCount: number;
  totalLimit: number;
}

interface FeedResponse {
  items: SearchSerializedFeedItem[];
}

const PREFETCH_DELAY_MS = 2400;
type WindowWithIdleCallback = Window & {
  requestIdleCallback?: (
    callback: IdleRequestCallback,
    options?: IdleRequestOptions
  ) => number;
  cancelIdleCallback?: (handle: number) => void;
};

export function HomeDeferredFeed({
  locale,
  initialCount,
  totalLimit,
}: HomeDeferredFeedProps) {
  const [items, setItems] = useState<FeedItem[]>([]);
  const hasStartedRef = useRef(false);

  useEffect(() => {
    const startLoading = () => {
      if (hasStartedRef.current) {
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
          setItems(nextItems);
        })
        .catch(() => {});
    };

    const idleWindow = window as WindowWithIdleCallback;
    let idleTimer: number | null = null;
    let idleCallbackId: number | null = null;

    idleTimer = window.setTimeout(() => {
      if (typeof idleWindow.requestIdleCallback === "function") {
        idleCallbackId = idleWindow.requestIdleCallback(startLoading, {
          timeout: 1200,
        });
        return;
      }

      startLoading();
    }, PREFETCH_DELAY_MS);

    return () => {
      if (idleTimer !== null) {
        window.clearTimeout(idleTimer);
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
    <>
      {items.length > 0 ? (
        <BentoGrid
          items={items}
          className="mt-4"
          highlightFeatured={false}
          priorityMediaCount={0}
          deferVisibleMediaUntilIndex={0}
          deferCardRenderingAfter={6}
        />
      ) : null}
    </>
  );
}
