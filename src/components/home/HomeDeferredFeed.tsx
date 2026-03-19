"use client";

import { useEffect, useRef, useState } from "react";
import { BentoGrid } from "@/components/bento/BentoGrid";
import type { FeedItem } from "@/components/bento/types";
import {
  reviveSearchFeedItem,
  type SearchSerializedFeedItem,
} from "@/lib/search/feedItemSnapshot";

type Locale = "en" | "zh";
type DeferredFeedStatus = "idle" | "loading" | "ready" | "error";

interface HomeDeferredFeedProps {
  locale: Locale;
  initialCount: number;
  totalLimit: number;
}

interface FeedResponse {
  items: SearchSerializedFeedItem[];
}

const PREFETCH_DELAY_MS = 1200;

export function HomeDeferredFeed({
  locale,
  initialCount,
  totalLimit,
}: HomeDeferredFeedProps) {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [status, setStatus] = useState<DeferredFeedStatus>("idle");
  const sentinelRef = useRef<HTMLDivElement>(null);
  const hasStartedRef = useRef(false);

  useEffect(() => {
    const startLoading = () => {
      if (hasStartedRef.current) {
        return;
      }

      hasStartedRef.current = true;
      setStatus("loading");

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
          setStatus("ready");
        })
        .catch(() => {
          setStatus("error");
        });
    };

    const idleTimer = window.setTimeout(startLoading, PREFETCH_DELAY_MS);

    const sentinel = sentinelRef.current;
    if (!sentinel) {
      return () => window.clearTimeout(idleTimer);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          startLoading();
        }
      },
      {
        rootMargin: "960px 0px",
        threshold: 0.01,
      }
    );

    observer.observe(sentinel);

    return () => {
      window.clearTimeout(idleTimer);
      observer.disconnect();
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
          deferCardRenderingAfter={6}
        />
      ) : null}
      {status !== "ready" ? (
        <div
          ref={sentinelRef}
          aria-hidden="true"
          className="mt-4 h-px w-full"
        />
      ) : null}
    </>
  );
}
