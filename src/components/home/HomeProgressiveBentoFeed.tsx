"use client";

import {
  startTransition,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { BentoGrid } from "@/components/bento/BentoGrid";
import { getFeedItemLayoutKey } from "@/components/bento/layoutEngine";
import type { FeedItem } from "@/components/bento/types";
import {
  reviveSearchFeedItem,
  type SearchSerializedFeedItem,
} from "@/lib/search/feedItemSnapshot";
import {
  areHomeImagesReady,
  HOME_IMAGES_READY_EVENT,
  resetHomeImagesReady,
  sealHomeImagesReadyCollection,
} from "./homeMediaPhases";
import { usePreviewDockContext } from "@/components/bento/PreviewDockContext";

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
  const previewDockContext = usePreviewDockContext();
  const isPreviewActive = Boolean(previewDockContext?.state.isActive);
  const [isCompactViewport, setIsCompactViewport] = useState(
    () => initialCount <= 4
  );
  const [hasScrolledPastLead, setHasScrolledPastLead] = useState(false);
  const [hasPrimedSecondBatch, setHasPrimedSecondBatch] = useState(
    () => initialItems.length < initialCount || initialItems.length >= totalLimit
  );
  const [hasMore, setHasMore] = useState(
    () => initialItems.length >= initialCount && initialItems.length < totalLimit
  );
  const loadStateRef = useRef<"idle" | "loading" | "done">("idle");
  const nextOffsetRef = useRef(initialItems.length);
  const abortControllerRef = useRef<AbortController | null>(null);
  const loadMoreSentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      typeof window.matchMedia !== "function"
    ) {
      return;
    }

    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const updateViewportState = () => {
      setIsCompactViewport(mediaQuery.matches);
    };

    updateViewportState();

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", updateViewportState);
      return () =>
        mediaQuery.removeEventListener("change", updateViewportState);
    }

    mediaQuery.addListener(updateViewportState);
    return () => mediaQuery.removeListener(updateViewportState);
  }, []);

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
    if (typeof window === "undefined") {
      return;
    }

    const scrollThreshold = isCompactViewport ? 220 : 320;
    const updateScrollLeadState = () => {
      if (window.scrollY >= scrollThreshold) {
        setHasScrolledPastLead(true);
      }
    };

    updateScrollLeadState();
    window.addEventListener("scroll", updateScrollLeadState, { passive: true });
    return () => window.removeEventListener("scroll", updateScrollLeadState);
  }, [isCompactViewport]);

  const requestNextBatch = useCallback(
    async (mode: "auto" | "scroll") => {
      if (
        isPreviewActive ||
        loadStateRef.current === "loading" ||
        !hasMore ||
        nextOffsetRef.current >= totalLimit
      ) {
        return;
      }

      loadStateRef.current = "loading";
      abortControllerRef.current?.abort();
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      const currentOffset = nextOffsetRef.current;
      const searchParams = new URLSearchParams({
        locale,
        limit: String(initialCount),
        offset: String(currentOffset),
      });

      try {
        const response = await fetch(`/api/feed?${searchParams.toString()}`, {
          cache: "force-cache",
          signal: abortController.signal,
        });

        if (!response.ok) {
          throw new Error(`Feed request failed (${response.status})`);
        }

        const payload = (await response.json()) as FeedResponse;
        const nextItems = payload.items.map(reviveSearchFeedItem);
        const receivedCount = nextItems.length;
        const nextOffset = currentOffset + receivedCount;

        abortControllerRef.current = null;
        nextOffsetRef.current = nextOffset;
        loadStateRef.current = "done";
        setHasMore(receivedCount >= initialCount && nextOffset < totalLimit);

        if (mode === "auto") {
          setHasPrimedSecondBatch(true);
        }

        if (receivedCount === 0) {
          setHasMore(false);
          return;
        }

        startTransition(() => {
          setItems((current) => mergeFeedItems(current, nextItems));
        });
      } catch (error: unknown) {
        abortControllerRef.current = null;
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        loadStateRef.current = "idle";
      }
    },
    [hasMore, initialCount, isPreviewActive, locale, totalLimit]
  );

  useEffect(() => {
    if (!isPreviewActive) {
      return;
    }

    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    if (loadStateRef.current === "loading") {
      loadStateRef.current = "idle";
    }
  }, [isPreviewActive]);

  useEffect(() => {
    let isActive = true;

    const maybeStartLoading = () => {
      if (!isActive || hasPrimedSecondBatch || isPreviewActive) {
        return;
      }

      if (areHomeImagesReady()) {
        void requestNextBatch("auto");
      }
    };

    if (!hasPrimedSecondBatch && !isPreviewActive) {
      if (areHomeImagesReady()) {
        void requestNextBatch("auto");
      } else {
        window.addEventListener(HOME_IMAGES_READY_EVENT, maybeStartLoading, {
          once: true,
        });
      }
    }

    return () => {
      isActive = false;
      window.removeEventListener(HOME_IMAGES_READY_EVENT, maybeStartLoading);
    };
  }, [hasPrimedSecondBatch, isPreviewActive, requestNextBatch]);

  useEffect(() => {
    if (
      isPreviewActive ||
      !hasPrimedSecondBatch ||
      !hasScrolledPastLead ||
      !hasMore ||
      typeof IntersectionObserver !== "function"
    ) {
      return;
    }

    const node = loadMoreSentinelRef.current;
    if (!node) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) {
          return;
        }

        void requestNextBatch("scroll");
      },
      {
        rootMargin: isCompactViewport ? "420px 0px" : "720px 0px",
        threshold: 0.01,
      }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [
    hasMore,
    hasPrimedSecondBatch,
    hasScrolledPastLead,
    isCompactViewport,
    isPreviewActive,
    requestNextBatch,
  ]);

  const deferredCardRootMargin = isCompactViewport ? "180px 0px" : "320px 0px";
  const priorityMediaCount = initialCount <= 4 ? 2 : 4;
  const homeImagePhaseMediaCount = priorityMediaCount;

  return (
    <>
      <BentoGrid
        items={items}
        priorityMediaCount={priorityMediaCount}
        homeImagePhaseMediaCount={homeImagePhaseMediaCount}
        deferVisibleMediaUntilIndex={0}
        deferCardRenderingAfter={initialCount}
        deferredCardRootMargin={deferredCardRootMargin}
        suspendBackgroundLoading={isPreviewActive}
      />
      {hasMore ? (
        <div
          ref={loadMoreSentinelRef}
          aria-hidden="true"
          className="pointer-events-none h-px w-full"
        />
      ) : null}
    </>
  );
}
