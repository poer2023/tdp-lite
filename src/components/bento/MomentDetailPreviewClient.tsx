"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MomentCard } from "@/components/bento/cards/MomentCard";
import type { Moment } from "@/lib/content/types";
import { toLocalizedPath } from "@/lib/locale-routing";
import {
  DEFAULT_PREVIEW_DOCK_STATE,
  usePreviewDockContext,
} from "@/components/bento/PreviewDockContext";

interface MomentDetailPreviewClientProps {
  locale: "en" | "zh";
  moment: Moment;
}

export function MomentDetailPreviewClient({
  locale,
  moment,
}: MomentDetailPreviewClientProps) {
  const router = useRouter();
  const previewDockContext = usePreviewDockContext();
  const setPreviewDockState = previewDockContext?.setState;
  const [previewMediaIndex, setPreviewMediaIndex] = useState(0);

  const previewMediaTotal = Math.max(1, moment.media?.length ?? 0);
  const canCyclePreviewMedia = previewMediaTotal > 1;
  const normalizedPreviewMediaIndex = canCyclePreviewMedia
    ? previewMediaIndex % previewMediaTotal
    : 0;
  const previewMediaDisplayIndex = canCyclePreviewMedia
    ? normalizedPreviewMediaIndex + 1
    : 1;
  const homePath = useMemo(() => toLocalizedPath(locale, "/"), [locale]);

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

  const closeMomentPreview = useCallback(() => {
    router.replace(homePath);
  }, [homePath, router]);

  useEffect(() => {
    if (!setPreviewDockState) {
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

  return (
    <div className="flex min-h-[calc(100dvh-11rem)] items-center justify-center px-4 pb-[calc(6rem+var(--tdp-content-bottom-inset))] pt-[calc(1.25rem+var(--tdp-content-top-inset))] md:px-8 md:pb-[calc(7rem+var(--tdp-content-bottom-inset))] md:pt-[calc(2.5rem+var(--tdp-content-top-inset))]">
      <div className="w-full max-w-3xl">
        <MomentCard
          moment={moment}
          preview
          className="w-full"
          previewMediaIndex={normalizedPreviewMediaIndex}
          onPreviewMediaIndexChange={setPreviewMediaIndex}
          showPreviewMediaControls={false}
        />
      </div>
    </div>
  );
}
