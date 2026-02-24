"use client";

import { cn } from "@/lib/utils";
import { FeedItem } from "./types";
import { PostCard } from "./cards/PostCard";
import { MomentCard, type MomentCardOpenOriginRect } from "./cards/MomentCard";
import { GalleryCard } from "./cards/GalleryCard";
import { ActionCard } from "./cards/ActionCard";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
}

export function BentoGrid({ items, className }: BentoGridProps) {
  const spanByItemKey = computeBentoSpans(items);
  const highlightedId = getHighlightedItemId(items);
  const [previewingMomentId, setPreviewingMomentId] = useState<string | null>(null);
  const [previewOriginRect, setPreviewOriginRect] =
    useState<MomentCardOpenOriginRect | null>(null);
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
  }, []);

  const openMomentPreview = useCallback(
    (momentId: string, locale: string, originRect: MomentCardOpenOriginRect) => {
      setPreviewMediaIndex(0);
      setPreviewOriginRect(originRect);
      setPreviewingMomentId(momentId);
      const detailPath = toLocalizedPath(locale, `/moments/${momentId}`);
      window.history.pushState({ previewingMomentId: momentId }, "", detailPath);
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
  const previewMediaDisplayIndex = canCyclePreviewMedia
    ? (previewMediaIndex % previewMediaTotal) + 1
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
    document.body.style.overflow = "hidden";
    document.body.classList.add("moment-preview-open");
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.classList.remove("moment-preview-open");
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [closeMomentPreview, previewMoment]);

  useEffect(() => {
    if (!previewMoment || !canCyclePreviewMedia) {
      setPreviewMediaIndex(0);
      return;
    }
    setPreviewMediaIndex((previous) => previous % previewMediaTotal);
  }, [canCyclePreviewMedia, previewMediaTotal, previewMoment]);

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
      previewCard.style.removeProperty("filter");
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
    const scaleX = Math.min(1, Math.max(0.22, originRect.width / targetRect.width));
    const scaleY = Math.min(1, Math.max(0.22, originRect.height / targetRect.height));

    previewBackdrop.classList.remove("moment-preview-backdrop--animating");
    previewCard.classList.remove("moment-preview-card--animating");

    previewBackdrop.style.opacity = "0";
    previewCard.style.transform = `translate3d(${translateX}px, ${translateY}px, 0) scale(${scaleX}, ${scaleY})`;
    previewCard.style.opacity = "0.72";
    previewCard.style.filter = "blur(0.8px) saturate(0.9)";

    const frameId = window.requestAnimationFrame(() => {
      previewBackdrop.classList.add("moment-preview-backdrop--animating");
      previewCard.classList.add("moment-preview-card--animating");
      previewBackdrop.style.opacity = "1";
      previewCard.style.transform = "translate3d(0, 0, 0) scale(1, 1)";
      previewCard.style.opacity = "1";
      previewCard.style.filter = "none";
    });

    return () => {
      window.cancelAnimationFrame(frameId);
      previewBackdrop.classList.remove("moment-preview-backdrop--animating");
      previewCard.classList.remove("moment-preview-card--animating");
      previewBackdrop.style.removeProperty("opacity");
      previewCard.style.removeProperty("transform");
      previewCard.style.removeProperty("opacity");
      previewCard.style.removeProperty("filter");
    };
  }, [previewMoment, previewOriginRect]);

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
                onOpenPreview={(originRect) =>
                  openMomentPreview(item.id, item.locale, originRect)
                }
              />
            )}
            {item.type === "gallery" && <GalleryCard item={item} />}
            {item.type === "action" && <ActionCard item={item} />}
          </div>
        );
      })}

      {previewMoment && (
        <div className="moment-preview-layer fixed inset-0 z-[70] flex items-center justify-center px-4 py-8 md:px-8">
          <button
            ref={previewBackdropRef}
            type="button"
            aria-label="Close moment preview"
            className="moment-preview-backdrop absolute inset-0 bg-black/30 backdrop-blur-md"
            onClick={closeMomentPreview}
          />

          <div ref={previewCardRef} className="moment-preview-card relative z-10 w-full max-w-3xl">
            <MomentCard
              moment={previewMoment}
              preview
              className="w-full"
              previewMediaIndex={previewMediaIndex}
              onPreviewMediaIndexChange={setPreviewMediaIndex}
              showPreviewMediaControls={false}
            />
          </div>

        </div>
      )}
    </div>
  );
}
