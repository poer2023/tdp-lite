"use client";

import { cn } from "@/lib/utils";
import { FeedItem } from "./types";
import { PostCard } from "./cards/PostCard";
import {
  MomentCard,
  type MomentCardOpenOriginRect,
  type MomentCardOpenPreviewPayload,
} from "./cards/MomentCard";
import { GalleryCard } from "./cards/GalleryCard";
import { ActionCard } from "./cards/ActionCard";
import {
  useCallback,
  type CSSProperties,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { toLocalizedPath } from "@/lib/locale-routing";
import {
  computeBentoSpans,
  getFeedItemLayoutKey,
  getHighlightedItemId,
} from "./layoutEngine";
import {
  DEFAULT_PREVIEW_DOCK_STATE,
  usePreviewDockContext,
} from "./PreviewDockContext";

interface BentoGridProps {
  items: FeedItem[];
  className?: string;
  highlightFeatured?: boolean;
  priorityMediaCount?: number;
  homeImagePhaseMediaCount?: number;
  deferVisibleMediaUntilIndex?: number;
  deferNonPriorityMedia?: boolean;
  deferredMediaStartDelayMs?: number;
  deferredMediaStepMs?: number;
  deferCardRenderingAfter?: number;
  deferredCardRootMargin?: string;
  suspendBackgroundLoading?: boolean;
}

interface DeferredBentoCardSlotProps {
  deferred: boolean;
  spanClass: string;
  rootMargin?: string;
  suspended?: boolean;
  children: ReactNode;
}

function getDeferredCardIntrinsicSize(spanClass: string): string {
  const rowSpanMatch = spanClass.match(/row-span-(\d+)/);
  const rowSpan = Number(rowSpanMatch?.[1] ?? 1);
  const baseRowHeight = 220;
  const rowGap = 16;
  const intrinsicHeight =
    rowSpan * baseRowHeight + Math.max(0, rowSpan - 1) * rowGap;

  return `${intrinsicHeight}px 100%`;
}

function DeferredBentoCardSlot({
  deferred,
  spanClass,
  rootMargin = "320px 0px",
  suspended = false,
  children,
}: DeferredBentoCardSlotProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [hasIntersected, setHasIntersected] = useState(() => !deferred);

  useEffect(() => {
    if (!deferred || suspended || hasIntersected) {
      return;
    }

    const node = hostRef.current;
    if (!node) {
      return;
    }

    if (typeof IntersectionObserver !== "function") {
      const fallbackTimer = window.setTimeout(() => {
        setHasIntersected(true);
      }, 0);
      return () => window.clearTimeout(fallbackTimer);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) {
          return;
        }

        setHasIntersected(true);
        observer.disconnect();
      },
      {
        rootMargin,
        threshold: 0.01,
      }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [deferred, hasIntersected, rootMargin, suspended]);

  const shouldMount = !deferred || hasIntersected;

  const deferredCardStyle: CSSProperties | undefined = deferred
    ? {
        contentVisibility: "auto",
        containIntrinsicSize: getDeferredCardIntrinsicSize(spanClass),
      }
    : undefined;

  return (
    <div ref={hostRef} className={cn("h-full w-full", spanClass)} style={deferredCardStyle}>
      {shouldMount ? children : null}
    </div>
  );
}

function itemHasCardMedia(item: FeedItem): boolean {
  if (item.type === "gallery") {
    return Boolean(item.thumbUrl || item.fileUrl);
  }

  if (item.type === "post") {
    return Boolean(item.coverUrl);
  }

  if (item.type === "moment") {
    return Boolean(item.media && item.media.length > 0);
  }

  return false;
}

export function BentoGrid({
  items,
  className,
  highlightFeatured = true,
  priorityMediaCount = 3,
  homeImagePhaseMediaCount = 10,
  deferVisibleMediaUntilIndex = 8,
  deferNonPriorityMedia = false,
  deferredMediaStartDelayMs = 1400,
  deferredMediaStepMs = 260,
  deferCardRenderingAfter = 8,
  deferredCardRootMargin = "320px 0px",
  suspendBackgroundLoading = false,
}: BentoGridProps) {
  const spanByItemKey = computeBentoSpans(items);
  const highlightedId = highlightFeatured ? getHighlightedItemId(items) : null;
  const mediaOrderByItemKey = useMemo(() => {
    const next: Record<string, number | null> = {};
    let mediaIndex = 0;

    items.forEach((item) => {
      const key = getFeedItemLayoutKey(item);
      if (!itemHasCardMedia(item)) {
        next[key] = null;
        return;
      }

      next[key] = mediaIndex;
      mediaIndex += 1;
    });

    return next;
  }, [items]);
  const [previewingMomentId, setPreviewingMomentId] = useState<string | null>(
    null
  );
  const [previewOriginRect, setPreviewOriginRect] =
    useState<MomentCardOpenOriginRect | null>(null);
  const [previewSeedSrc, setPreviewSeedSrc] = useState<string | null>(null);
  const [previewMediaIndex, setPreviewMediaIndex] = useState(0);
  const previewBackdropRef = useRef<HTMLButtonElement>(null);
  const previewCardRef = useRef<HTMLDivElement>(null);
  const previewDockContext = usePreviewDockContext();
  const setPreviewDockState = previewDockContext?.setState;

  const previewMoment = useMemo(() => {
    if (!previewingMomentId) {
      return null;
    }

    const found = items.find(
      (item) => item.type === "moment" && item.id === previewingMomentId
    );

    return found?.type === "moment" ? found : null;
  }, [items, previewingMomentId]);

  const clearPreviewState = useCallback(() => {
    setPreviewingMomentId(null);
    setPreviewMediaIndex(0);
    setPreviewOriginRect(null);
    setPreviewSeedSrc(null);
  }, []);

  const openMomentPreview = useCallback(
    (
      momentId: string,
      locale: string,
      { originRect, previewSeedSrc }: MomentCardOpenPreviewPayload
    ) => {
      setPreviewMediaIndex(0);
      setPreviewOriginRect(originRect);
      setPreviewSeedSrc(previewSeedSrc ?? null);
      setPreviewingMomentId(momentId);
      const detailPath = toLocalizedPath(locale, `/moments/${momentId}`);
      window.history.pushState(
        { previewingMomentId: momentId },
        "",
        detailPath
      );
    },
    []
  );

  const closeMomentPreview = useCallback(() => {
    if (previewMoment) {
      const homePath = toLocalizedPath(previewMoment.locale, "/");
      window.history.replaceState({}, "", homePath);
    }
    clearPreviewState();
  }, [clearPreviewState, previewMoment]);

  const previewMediaTotal = Math.max(1, previewMoment?.media?.length ?? 0);
  const canCyclePreviewMedia = previewMediaTotal > 1;
  const normalizedPreviewMediaIndex = canCyclePreviewMedia
    ? previewMediaIndex % previewMediaTotal
    : 0;
  const previewMediaDisplayIndex = canCyclePreviewMedia
    ? normalizedPreviewMediaIndex + 1
    : 1;

  const goToPreviousPreviewMedia = useCallback(() => {
    if (!canCyclePreviewMedia) {
      return;
    }
    setPreviewMediaIndex(
      (previous) => (previous - 1 + previewMediaTotal) % previewMediaTotal
    );
  }, [canCyclePreviewMedia, previewMediaTotal]);

  const goToNextPreviewMedia = useCallback(() => {
    if (!canCyclePreviewMedia) {
      return;
    }
    setPreviewMediaIndex((previous) => (previous + 1) % previewMediaTotal);
  }, [canCyclePreviewMedia, previewMediaTotal]);

  useEffect(() => {
    if (!setPreviewDockState) {
      return;
    }

    if (!previewMoment) {
      setPreviewDockState((previous) =>
        previous.isActive ? DEFAULT_PREVIEW_DOCK_STATE : previous
      );
      return;
    }

    setPreviewDockState((previous) => {
      const next = {
        isActive: true,
        currentIndex: previewMediaDisplayIndex,
        total: previewMediaTotal,
        canCycle: canCyclePreviewMedia,
        onPrev: goToPreviousPreviewMedia,
        onNext: goToNextPreviewMedia,
        onClose: closeMomentPreview,
      };

      if (
        previous.isActive === next.isActive &&
        previous.currentIndex === next.currentIndex &&
        previous.total === next.total &&
        previous.canCycle === next.canCycle &&
        previous.onPrev === next.onPrev &&
        previous.onNext === next.onNext &&
        previous.onClose === next.onClose
      ) {
        return previous;
      }

      return next;
    });
  }, [
    canCyclePreviewMedia,
    closeMomentPreview,
    goToNextPreviewMedia,
    goToPreviousPreviewMedia,
    previewMediaDisplayIndex,
    previewMediaTotal,
    previewMoment,
    setPreviewDockState,
  ]);

  useEffect(() => {
    if (!setPreviewDockState) {
      return;
    }

    return () => {
      setPreviewDockState((previous) =>
        previous.isActive ? DEFAULT_PREVIEW_DOCK_STATE : previous
      );
    };
  }, [setPreviewDockState]);

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
        clearPreviewState();
      }
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [clearPreviewState, items, previewingMomentId]);

  useEffect(() => {
    if (!previewMoment) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }
      event.preventDefault();
      closeMomentPreview();
    };

    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    const computedBodyPaddingRight =
      Number.parseFloat(window.getComputedStyle(document.body).paddingRight) ||
      0;
    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;

    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${
        computedBodyPaddingRight + scrollbarWidth
      }px`;
    }
    document.body.style.overflow = "hidden";
    document.body.classList.add("moment-preview-open");
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
      document.body.classList.remove("moment-preview-open");
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [closeMomentPreview, previewMoment]);

  useLayoutEffect(() => {
    if (!previewMoment) {
      return;
    }

    const previewBackdrop = previewBackdropRef.current;
    const previewCard = previewCardRef.current;
    if (!previewBackdrop || !previewCard) {
      return;
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      previewBackdrop.style.removeProperty("opacity");
      previewCard.style.removeProperty("transform");
      previewCard.style.removeProperty("opacity");
      previewBackdrop.classList.remove("moment-preview-backdrop--animating");
      previewCard.classList.remove("moment-preview-card--animating");
      return;
    }

    const targetRect = previewCard.getBoundingClientRect();
    if (targetRect.width <= 0 || targetRect.height <= 0) {
      return;
    }

    const fallbackOriginRect: MomentCardOpenOriginRect = {
      width: targetRect.width * 0.42,
      height: targetRect.height * 0.42,
      left: targetRect.left + targetRect.width * 0.29,
      top: targetRect.top + targetRect.height * 0.29,
    };
    const originRect = previewOriginRect ?? fallbackOriginRect;

    const originCenterX = originRect.left + originRect.width / 2;
    const originCenterY = originRect.top + originRect.height / 2;
    const targetCenterX = targetRect.left + targetRect.width / 2;
    const targetCenterY = targetRect.top + targetRect.height / 2;
    const translateX = originCenterX - targetCenterX;
    const translateY = originCenterY - targetCenterY;
    const scaleX = Math.min(
      1,
      Math.max(0.22, originRect.width / targetRect.width)
    );
    const scaleY = Math.min(
      1,
      Math.max(0.22, originRect.height / targetRect.height)
    );

    previewBackdrop.classList.remove("moment-preview-backdrop--animating");
    previewCard.classList.remove("moment-preview-card--animating");

    previewBackdrop.style.opacity = "0";
    previewCard.style.transform = `translate3d(${translateX}px, ${translateY}px, 0) scale(${scaleX}, ${scaleY})`;
    previewCard.style.opacity = "0.84";

    const frameId = window.requestAnimationFrame(() => {
      previewBackdrop.classList.add("moment-preview-backdrop--animating");
      previewCard.classList.add("moment-preview-card--animating");
      previewBackdrop.style.opacity = "1";
      previewCard.style.transform = "translate3d(0, 0, 0) scale(1, 1)";
      previewCard.style.opacity = "1";
    });

    return () => {
      window.cancelAnimationFrame(frameId);
      previewBackdrop.classList.remove("moment-preview-backdrop--animating");
      previewCard.classList.remove("moment-preview-card--animating");
      previewBackdrop.style.removeProperty("opacity");
      previewCard.style.removeProperty("transform");
      previewCard.style.removeProperty("opacity");
    };
  }, [previewMoment, previewOriginRect]);

  const previewOverlay =
    previewMoment && typeof document !== "undefined" && document.body
      ? createPortal(
          <div className="moment-preview-layer fixed inset-0 z-[70] flex items-center justify-center px-4 py-8 md:px-8">
            <button
              ref={previewBackdropRef}
              type="button"
              aria-label="Close moment preview"
              className="moment-preview-backdrop absolute inset-0"
              onClick={closeMomentPreview}
            />

            <div
              ref={previewCardRef}
              className="moment-preview-card relative z-10 w-full max-w-3xl"
            >
              <MomentCard
                moment={previewMoment}
                preview
                className="w-full"
                previewMediaIndex={normalizedPreviewMediaIndex}
                onPreviewMediaIndexChange={setPreviewMediaIndex}
                showPreviewMediaControls={false}
                previewSeedSrc={previewSeedSrc ?? undefined}
              />
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <div
        className={cn(
          "bento-grid grid grid-flow-dense auto-rows-[220px] grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-4",
          className
        )}
      >
        {items.map((item, index) => {
          const itemKey = getFeedItemLayoutKey(item);
          const spanClass = spanByItemKey[itemKey] ?? "col-span-1 row-span-1";
          const isHighlighted = item.id === highlightedId;
          const mediaOrder = mediaOrderByItemKey[itemKey];
          const priorityMedia =
            mediaOrder !== null && mediaOrder < priorityMediaCount;
          const shouldDeferVisibleMedia =
            mediaOrder !== null &&
            !priorityMedia &&
            (deferNonPriorityMedia || index < deferVisibleMediaUntilIndex);
          const deferredMediaDelayMs =
            shouldDeferVisibleMedia && mediaOrder !== null
              ? deferredMediaStartDelayMs +
                Math.max(0, mediaOrder - priorityMediaCount) *
                  deferredMediaStepMs
              : undefined;
          const homeImagePhaseId =
            mediaOrder !== null && mediaOrder < homeImagePhaseMediaCount
              ? `home:${itemKey}`
              : undefined;
          const shouldDeferCardRendering = index >= deferCardRenderingAfter;
          const card = (
            <>
              {item.type === "post" && (
                <PostCard
                  post={item}
                  isHighlighted={isHighlighted}
                  priorityMedia={priorityMedia}
                  deferMedia={shouldDeferVisibleMedia}
                  deferMediaDelayMs={deferredMediaDelayMs}
                  suspendDeferredMedia={suspendBackgroundLoading}
                  homeImagePhaseId={homeImagePhaseId}
                />
              )}
              {item.type === "moment" && (
                <MomentCard
                  moment={item}
                  isHighlighted={isHighlighted}
                  priorityMedia={priorityMedia}
                  deferMedia={shouldDeferVisibleMedia}
                  deferMediaDelayMs={deferredMediaDelayMs}
                  suspendDeferredMedia={suspendBackgroundLoading}
                  homeImagePhaseId={homeImagePhaseId}
                  onOpenPreview={(payload) =>
                    openMomentPreview(item.id, item.locale, payload)
                  }
                />
              )}
              {item.type === "gallery" && (
                <GalleryCard
                  item={item}
                  priorityMedia={priorityMedia}
                  deferMedia={shouldDeferVisibleMedia}
                  deferMediaDelayMs={deferredMediaDelayMs}
                  suspendDeferredMedia={suspendBackgroundLoading}
                  homeImagePhaseId={homeImagePhaseId}
                />
              )}
              {item.type === "action" && <ActionCard item={item} />}
            </>
          );

          return (
            <DeferredBentoCardSlot
              key={itemKey}
              deferred={shouldDeferCardRendering}
              spanClass={cn("bento-card", spanClass)}
              rootMargin={deferredCardRootMargin}
              suspended={suspendBackgroundLoading}
            >
              {card}
            </DeferredBentoCardSlot>
          );
        })}
      </div>
      {previewOverlay}
    </>
  );
}
