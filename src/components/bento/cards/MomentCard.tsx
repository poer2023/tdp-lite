"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { cn } from "@/lib/utils";
import type { Moment } from "@/lib/content/types";
import { isVideoUrl } from "@/lib/media";
import { ChevronLeft, ChevronRight, MapPin, Music2, Quote } from "lucide-react";
import { AutoplayCoverVideo } from "./AutoplayCoverVideo";
import {
  DeferredCardMediaPlaceholder,
  DeferredCardMediaSlot,
} from "./DeferredCardMediaSlot";
import { MomentImageOnly } from "./MomentImageOnly";
import {
  BENTO_CARD_MEDIA_SIZES,
  BENTO_PREVIEW_VIDEO_POSTER_SIZES,
  buildOptimizedPreviewImageUrl,
  getDetachedPreviewImageSizes,
} from "./mediaSizing";
import { toLocalizedPath } from "@/lib/locale-routing";
import { LgChipDark } from "@/components/ui/LgChipDark";
import { resolveMomentDisplayFromMoment } from "@/lib/content/momentDisplay";
import { RelativeTimeLabel } from "@/components/ui/RelativeTimeLabel";
import { shouldBypassNextImageOptimization } from "@/lib/mediaOptimization";

type MomentMedia = NonNullable<Moment["media"]>[number];
const EMPTY_MOMENT_MEDIA: MomentMedia[] = [];

function getMomentMediaPresentation(media: MomentMedia | null) {
  const isAudio = Boolean(media?.type === "audio");
  const isVideo = Boolean(
    media && !isAudio && (media.type === "video" || isVideoUrl(media.url))
  );
  const shouldSkipOptimization = Boolean(
    media && !isVideo && shouldBypassNextImageOptimization(media.url)
  );
  return { isAudio, isVideo, shouldSkipOptimization };
}

export interface MomentCardOpenOriginRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface MomentCardOpenPreviewPayload {
  originRect: MomentCardOpenOriginRect;
  previewSeedSrc?: string;
}

interface MomentCardProps {
  moment: Moment;
  isHighlighted?: boolean;
  className?: string;
  preview?: boolean;
  onOpenPreview?: (payload: MomentCardOpenPreviewPayload) => void;
  previewMediaIndex?: number;
  onPreviewMediaIndexChange?: (nextIndex: number) => void;
  showPreviewMediaControls?: boolean;
  priorityMedia?: boolean;
  deferMedia?: boolean;
  deferMediaDelayMs?: number;
  suspendDeferredMedia?: boolean;
  homeImagePhaseId?: string;
  previewSeedSrc?: string;
}

export function MomentCard({
  moment,
  isHighlighted = false,
  className,
  preview = false,
  onOpenPreview,
  previewMediaIndex,
  onPreviewMediaIndexChange,
  showPreviewMediaControls = true,
  priorityMedia = false,
  deferMedia = false,
  deferMediaDelayMs,
  suspendDeferredMedia = false,
  homeImagePhaseId,
  previewSeedSrc,
}: MomentCardProps) {
  const mediaList = moment.media ?? EMPTY_MOMENT_MEDIA;
  const hasMedia = mediaList.length > 0;
  const hasMultipleMedia = mediaList.length > 1;
  const [internalPreviewMediaIndex, setInternalPreviewMediaIndex] = useState(0);
  const [outgoingPreviewMediaIndex, setOutgoingPreviewMediaIndex] = useState<
    number | null
  >(null);
  const [mediaTransitionDirection, setMediaTransitionDirection] = useState<
    "forward" | "backward"
  >("forward");
  const mediaTransitionTimerRef = useRef<number | null>(null);
  const mediaTransitionFrameRef = useRef<number | null>(null);
  const previousResolvedMediaIndexRef = useRef(0);
  const previewMediaFrameRef = useRef<HTMLDivElement | null>(null);
  const [previewMeasuredWidth, setPreviewMeasuredWidth] = useState<
    number | null
  >(null);

  const rawPreviewMediaIndex = previewMediaIndex ?? internalPreviewMediaIndex;
  const setPreviewMediaIndex = (nextIndex: number) => {
    if (!hasMultipleMedia) {
      return;
    }
    const wrappedIndex = (nextIndex + mediaList.length) % mediaList.length;
    if (previewMediaIndex === undefined) {
      setInternalPreviewMediaIndex(wrappedIndex);
    }
    onPreviewMediaIndexChange?.(wrappedIndex);
  };

  const resolvedMediaIndex =
    preview && hasMultipleMedia
      ? Math.min(rawPreviewMediaIndex, mediaList.length - 1)
      : 0;
  const mainMedia = hasMedia
    ? (mediaList[resolvedMediaIndex] ?? mediaList[0])
    : null;
  const {
    isAudio: isAudioMedia,
    isVideo: hasVideoMedia,
    shouldSkipOptimization: skipOptimization,
  } = getMomentMediaPresentation(mainMedia);
  const momentDisplay = resolveMomentDisplayFromMoment(
    moment,
    mainMedia?.title
  );
  const momentText = momentDisplay.text;
  const shouldQuoteMomentText = !momentDisplay.usesFallback;
  const hasMediaDimensions =
    typeof mainMedia?.width === "number" &&
    typeof mainMedia?.height === "number" &&
    mainMedia.width > 0 &&
    mainMedia.height > 0;
  const mediaWidth = hasMediaDimensions ? mainMedia.width : undefined;
  const mediaHeight = hasMediaDimensions ? mainMedia.height : undefined;
  const previewMediaRatio = hasMediaDimensions
    ? mediaWidth! / mediaHeight!
    : hasVideoMedia
      ? 16 / 9
      : 4 / 3;
  const isPortraitMedia = previewMediaRatio < 1;
  const previewMediaWidth = isPortraitMedia
    ? `min(74%, calc(56vh * ${previewMediaRatio}))`
    : "100%";
  const isDetachedPreview = preview && hasMedia && !isAudioMedia;
  const effectivePreviewMeasuredWidth = isDetachedPreview
    ? previewMeasuredWidth
    : null;
  const previewImageSizes = getDetachedPreviewImageSizes(
    effectivePreviewMeasuredWidth,
    isPortraitMedia
  );
  const canSwitchPreviewMedia =
    preview && hasMultipleMedia && showPreviewMediaControls;
  const activePreviewSeedSrc =
    preview && resolvedMediaIndex === 0 ? previewSeedSrc : undefined;
  const outgoingPreviewMedia =
    outgoingPreviewMediaIndex !== null
      ? (mediaList[outgoingPreviewMediaIndex] ?? null)
      : null;
  const shouldAnimatePreviewMedia = Boolean(
    isDetachedPreview && hasMultipleMedia && outgoingPreviewMedia
  );
  const shouldDeferMediaMount =
    deferMedia && !preview && hasMedia && !isAudioMedia;
  const incomingLayerAnimationClass = shouldAnimatePreviewMedia
    ? mediaTransitionDirection === "backward"
      ? "moment-preview-media-layer-enter-backward"
      : "moment-preview-media-layer-enter-forward"
    : "moment-preview-media-layer--active";
  const outgoingLayerAnimationClass =
    mediaTransitionDirection === "backward"
      ? "moment-preview-media-layer-exit-backward"
      : "moment-preview-media-layer-exit-forward";
  const wrapperClass = cn(
    "group relative flex h-full w-full flex-col",
    isDetachedPreview ? "overflow-visible" : "paper-card overflow-hidden",
    !isDetachedPreview &&
      isHighlighted &&
      "ring-1 ring-black/15 shadow-highlight",
    preview ? "cursor-default" : "cursor-pointer",
    className
  );

  const schedulePreviewTransitionState = useCallback(
    (nextDirection: "forward" | "backward", previousIndex: number) => {
      if (typeof window === "undefined") {
        return;
      }

      if (mediaTransitionFrameRef.current !== null) {
        window.cancelAnimationFrame(mediaTransitionFrameRef.current);
      }

      mediaTransitionFrameRef.current = window.requestAnimationFrame(() => {
        mediaTransitionFrameRef.current = null;
        setMediaTransitionDirection(nextDirection);
        setOutgoingPreviewMediaIndex(previousIndex);
      });
    },
    []
  );

  useEffect(() => {
    if (!preview || !hasMultipleMedia) {
      if (mediaTransitionFrameRef.current !== null) {
        window.cancelAnimationFrame(mediaTransitionFrameRef.current);
        mediaTransitionFrameRef.current = null;
      }
      previousResolvedMediaIndexRef.current = resolvedMediaIndex;
      if (mediaTransitionTimerRef.current !== null) {
        window.clearTimeout(mediaTransitionTimerRef.current);
        mediaTransitionTimerRef.current = null;
      }
      return;
    }

    const previousIndex = previousResolvedMediaIndexRef.current;
    if (previousIndex === resolvedMediaIndex) {
      return;
    }

    const forwardDistance =
      (resolvedMediaIndex - previousIndex + mediaList.length) %
      mediaList.length;
    const backwardDistance =
      (previousIndex - resolvedMediaIndex + mediaList.length) %
      mediaList.length;
    const nextDirection =
      forwardDistance <= backwardDistance ? "forward" : "backward";

    if (mediaTransitionTimerRef.current !== null) {
      window.clearTimeout(mediaTransitionTimerRef.current);
      mediaTransitionTimerRef.current = null;
    }

    schedulePreviewTransitionState(nextDirection, previousIndex);
    previousResolvedMediaIndexRef.current = resolvedMediaIndex;

    mediaTransitionTimerRef.current = window.setTimeout(() => {
      setOutgoingPreviewMediaIndex(null);
      mediaTransitionTimerRef.current = null;
    }, 320);
  }, [
    hasMultipleMedia,
    mediaList.length,
    preview,
    resolvedMediaIndex,
    schedulePreviewTransitionState,
  ]);

  useEffect(() => {
    return () => {
      if (mediaTransitionFrameRef.current !== null) {
        window.cancelAnimationFrame(mediaTransitionFrameRef.current);
        mediaTransitionFrameRef.current = null;
      }
      if (mediaTransitionTimerRef.current !== null) {
        window.clearTimeout(mediaTransitionTimerRef.current);
        mediaTransitionTimerRef.current = null;
      }
    };
  }, []);

  useLayoutEffect(() => {
    if (!preview || !isDetachedPreview) {
      return;
    }

    const node = previewMediaFrameRef.current;
    if (!node) {
      return;
    }

    const updateWidth = () => {
      const nextWidth = Math.round(node.getBoundingClientRect().width);
      setPreviewMeasuredWidth((previous) =>
        previous === nextWidth ? previous : nextWidth
      );
    };

    updateWidth();

    if (typeof ResizeObserver !== "function") {
      return;
    }

    const observer = new ResizeObserver(() => updateWidth());
    observer.observe(node);
    return () => observer.disconnect();
  }, [isDetachedPreview, preview, previewMediaRatio, resolvedMediaIndex]);

  useEffect(() => {
    if (!preview || !hasMultipleMedia || typeof window === "undefined") {
      return;
    }

    const measuredWidth = effectivePreviewMeasuredWidth ?? 420;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const requestedWidth = Math.max(320, Math.round(measuredWidth * dpr));
    const preloadIndices = [
      (resolvedMediaIndex + 1) % mediaList.length,
      (resolvedMediaIndex - 1 + mediaList.length) % mediaList.length,
    ];
    const seen = new Set<string>();

    preloadIndices.forEach((mediaIndex) => {
      const media = mediaList[mediaIndex];
      if (!media) {
        return;
      }

      const { isAudio, isVideo, shouldSkipOptimization } =
        getMomentMediaPresentation(media);
      if (isAudio || isVideo || shouldSkipOptimization) {
        return;
      }

      const preloadUrl = buildOptimizedPreviewImageUrl(
        media.url,
        requestedWidth,
        typeof media.width === "number" ? media.width : undefined
      );

      if (seen.has(preloadUrl)) {
        return;
      }

      seen.add(preloadUrl);
      const image = new window.Image();
      image.decoding = "async";
      image.fetchPriority = "low";
      image.src = preloadUrl;
    });
  }, [
    effectivePreviewMeasuredWidth,
    hasMultipleMedia,
    mediaList,
    preview,
    resolvedMediaIndex,
  ]);

  const renderMediaLayer = (media: MomentMedia, eager = false) => {
    const {
      isAudio: layerIsAudioMedia,
      isVideo: layerHasVideoMedia,
      shouldSkipOptimization: layerSkipOptimization,
    } = getMomentMediaPresentation(media);

    if (layerIsAudioMedia) {
      return (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#111] via-[#1f2937] to-[#111827]">
          <div className="flex flex-col items-center gap-2.5 text-white/90 md:gap-3">
            <span className="lg-chip-dark inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-2.5 py-0.5 text-[10px] font-medium md:gap-2 md:px-3 md:py-1 md:text-xs">
              <Music2 className="h-3 w-3 md:h-3.5 md:w-3.5" />
              Music
            </span>
            <p className="line-clamp-2 font-display text-[0.95rem] font-medium leading-[1.28] text-white md:text-lg">
              {media.title || moment.content}
            </p>
            {media.artist ? (
              <p className="font-mono text-[10px] text-white/70 md:text-xs">
                {media.artist}
              </p>
            ) : null}
          </div>
        </div>
      );
    }

    if (layerHasVideoMedia) {
      return (
        <AutoplayCoverVideo
          src={media.url}
          poster={media.thumbnailUrl}
          eager={eager}
          homeImagePhaseId={homeImagePhaseId}
          posterSizes={BENTO_PREVIEW_VIDEO_POSTER_SIZES}
        />
      );
    }

    return (
      <MomentImageOnly
        src={media.url}
        alt="Moment"
        sizes={previewImageSizes}
        unoptimized={layerSkipOptimization}
        loading={eager ? "eager" : "lazy"}
        fetchPriority={eager ? "high" : "low"}
        preview
        homeImagePhaseId={homeImagePhaseId}
        sourceWidth={typeof media.width === "number" ? media.width : undefined}
        previewSeedSrc={eager ? activePreviewSeedSrc : undefined}
      />
    );
  };

  const handleOpenPreview = (event: ReactMouseEvent<HTMLButtonElement>) => {
    if (!onOpenPreview) {
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const currentPreviewImage = event.currentTarget.querySelector(
      "[data-lg-media-source] img"
    );
    const previewSeedSrc =
      currentPreviewImage instanceof HTMLImageElement
        ? currentPreviewImage.currentSrc ||
          currentPreviewImage.getAttribute("src") ||
          undefined
        : undefined;

    onOpenPreview({
      originRect: {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      },
      previewSeedSrc,
    });
  };

  const content = hasMedia ? (
    isDetachedPreview ? (
      <>
        <div
          ref={previewMediaFrameRef}
          className="relative mx-auto overflow-hidden rounded-[28px] border border-white/70 shadow-preview-frame"
          style={{
            aspectRatio: String(previewMediaRatio),
            width: previewMediaWidth,
            maxHeight: "56vh",
          }}
        >
          <div
            className="relative h-full w-full overflow-hidden bg-black"
            data-lg-media-source="moment-card-media"
          >
            {outgoingPreviewMedia && shouldAnimatePreviewMedia ? (
              <div
                key={`outgoing-${moment.id}-${outgoingPreviewMediaIndex}`}
                className={cn(
                  "moment-preview-media-layer moment-preview-media-layer--outgoing",
                  outgoingLayerAnimationClass
                )}
                aria-hidden
              >
                {renderMediaLayer(outgoingPreviewMedia, false)}
              </div>
            ) : null}
            <div
              key={`incoming-${moment.id}-${resolvedMediaIndex}`}
              className={cn(
                "moment-preview-media-layer",
                incomingLayerAnimationClass
              )}
            >
              {renderMediaLayer(mainMedia!, true)}
            </div>
            <div className="absolute inset-0 z-10 bg-gradient-to-t from-black/45 via-black/10 to-transparent" />

            {canSwitchPreviewMedia ? (
              <>
                <button
                  type="button"
                  onClick={() => setPreviewMediaIndex(resolvedMediaIndex - 1)}
                  aria-label="Previous media"
                  className="absolute left-4 top-1/2 z-20 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/55 bg-black/55 text-white shadow-media-controls backdrop-blur-sm transition-colors hover:bg-black/70"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMediaIndex(resolvedMediaIndex + 1)}
                  aria-label="Next media"
                  className="absolute right-4 top-1/2 z-20 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/55 bg-black/55 text-white shadow-media-controls backdrop-blur-sm transition-colors hover:bg-black/70"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                <div className="absolute right-4 top-4 z-20 rounded-full border border-white/55 bg-black/55 px-2.5 py-1 font-mono text-[11px] text-white shadow-media-controls backdrop-blur-sm">
                  {resolvedMediaIndex + 1}/{mediaList.length}
                </div>
              </>
            ) : null}
          </div>
        </div>

        <div className="mx-3 mt-3 rounded-[20px] border border-white/75 bg-white/90 p-3 shadow-preview-info md:p-3.5">
          <div className="mb-2 flex flex-wrap items-center gap-1.5 md:mb-2.5 md:gap-2">
            <span className="inline-flex items-center gap-1 rounded-full border border-black/10 bg-white/80 px-2 py-0.5 text-[10px] font-medium text-[#333] md:gap-1.5 md:px-2.5 md:text-[11px]">
              {isHighlighted ? "Spotlight" : "Insight"}
            </span>
            {moment.location ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-black/10 bg-white/80 px-2 py-0.5 text-[10px] text-[#555] md:px-2.5 md:text-[11px]">
                <MapPin className="h-2.5 w-2.5 shrink-0 md:h-3 md:w-3" />
                {moment.location.name}
              </span>
            ) : null}
          </div>

          <p className="line-clamp-3 whitespace-pre-wrap font-display text-[0.93rem] font-medium leading-[1.3] tracking-[-0.01em] text-[#111] md:text-[1rem] md:leading-[1.42] md:tracking-[-0.004em]">
            {shouldQuoteMomentText ? (
              <>&ldquo;{momentText}&rdquo;</>
            ) : (
              momentText
            )}
          </p>

          <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[#666] md:mt-2.5 md:tracking-wider">
            <RelativeTimeLabel date={moment.createdAt} locale={moment.locale} />
          </div>
        </div>
      </>
    ) : (
      <>
        <div
          className="absolute inset-0 z-0"
          data-lg-media-source="moment-card-media"
        >
          {isAudioMedia ? (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#111] via-[#1f2937] to-[#111827]">
              <div className="flex flex-col items-center gap-2.5 text-white/90 md:gap-3">
                <span className="lg-chip-dark inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-2.5 py-0.5 text-[10px] font-medium md:gap-2 md:px-3 md:py-1 md:text-xs">
                  <Music2 className="h-3 w-3 md:h-3.5 md:w-3.5" />
                  Music
                </span>
                <p className="line-clamp-2 font-display text-[0.95rem] font-medium leading-[1.28] text-white md:text-lg">
                  {momentText}
                </p>
                {mainMedia?.artist ? (
                  <p className="font-mono text-[10px] text-white/70 md:text-xs">
                    {mainMedia.artist}
                  </p>
                ) : null}
              </div>
            </div>
          ) : (
            <DeferredCardMediaSlot
              deferred={shouldDeferMediaMount}
              delayMs={deferMediaDelayMs}
              suspended={suspendDeferredMedia}
              placeholder={<DeferredCardMediaPlaceholder variant="dark" />}
              homeImagePhaseId={homeImagePhaseId}
            >
              {hasVideoMedia ? (
                <AutoplayCoverVideo
                  src={mainMedia!.url}
                  poster={mainMedia?.thumbnailUrl}
                  eager={priorityMedia}
                  suspended={suspendDeferredMedia}
                  waitForHomeImagesReady={Boolean(homeImagePhaseId)}
                  homeImagePhaseId={homeImagePhaseId}
                  posterSizes={BENTO_CARD_MEDIA_SIZES}
                  className={cn(
                    "transition-transform duration-500",
                    !preview && "group-hover:scale-105"
                  )}
                />
              ) : (
                <MomentImageOnly
                  src={mainMedia!.url}
                  alt="Moment"
                  sizes={BENTO_CARD_MEDIA_SIZES}
                  unoptimized={Boolean(skipOptimization)}
                  loading={priorityMedia ? undefined : "lazy"}
                  priority={priorityMedia}
                  preview={preview}
                  homeImagePhaseId={homeImagePhaseId}
                  sourceWidth={
                    typeof mainMedia?.width === "number"
                      ? mainMedia.width
                      : undefined
                  }
                />
              )}
            </DeferredCardMediaSlot>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        </div>

        <div className="relative z-10 flex h-full flex-col justify-between p-3.5 md:p-6">
          <div className="flex items-start justify-between">
            <LgChipDark className="inline-flex items-center gap-1 md:gap-1.5">
              {isHighlighted ? "Spotlight" : "Insight"}
            </LgChipDark>
            {moment.location && (
              <LgChipDark className="flex max-w-[8.5rem] items-center gap-1 truncate">
                <MapPin className="h-2.5 w-2.5 md:h-3 md:w-3" />
                <span className="truncate">{moment.location.name}</span>
              </LgChipDark>
            )}
          </div>

          <div className="space-y-1 md:space-y-2">
            {preview ? (
              <p className="line-clamp-2 font-display text-[0.95rem] font-medium leading-[1.3] text-white md:line-clamp-3 md:text-lg md:leading-relaxed">
                {shouldQuoteMomentText ? (
                  <>&ldquo;{momentText}&rdquo;</>
                ) : (
                  momentText
                )}
              </p>
            ) : (
              <div className="relative">
                <p className="line-clamp-2 font-display text-[0.95rem] font-medium leading-[1.3] tracking-[-0.01em] text-white transition-[transform,opacity] duration-300 ease-out will-change-transform group-hover:-translate-y-2 group-hover:opacity-0 md:line-clamp-2 md:text-lg md:leading-relaxed md:tracking-normal">
                  {shouldQuoteMomentText ? (
                    <>&ldquo;{momentText}&rdquo;</>
                  ) : (
                    momentText
                  )}
                </p>
                <p className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-3 font-display text-[0.95rem] font-medium leading-[1.3] tracking-[-0.01em] text-white opacity-0 transition-[transform,opacity] duration-300 ease-out will-change-transform group-hover:translate-y-0 group-hover:opacity-100 md:text-lg md:leading-relaxed md:tracking-normal">
                  {shouldQuoteMomentText ? (
                    <>&ldquo;{momentText}&rdquo;</>
                  ) : (
                    momentText
                  )}
                </p>
              </div>
            )}
            {isAudioMedia && mainMedia?.artist ? (
              <div className="font-mono text-[10px] text-white/70 md:text-xs">
                {mainMedia.artist}
              </div>
            ) : null}
            <RelativeTimeLabel
              date={moment.createdAt}
              locale={moment.locale}
              className="font-mono text-[10px] text-white/60 md:text-xs"
            />
          </div>
        </div>
      </>
    )
  ) : (
    <div className="flex h-full flex-col justify-between p-3.5 md:p-6">
      <div className="flex items-start justify-between">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 md:h-8 md:w-8">
          <Quote className="h-3.5 w-3.5 md:h-4 md:w-4" />
        </div>
        {isHighlighted && (
          <span className="rounded-full bg-black px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-white md:py-1 md:tracking-wider">
            Spotlight
          </span>
        )}
        {moment.location && (
          <span className="flex max-w-[8.5rem] items-center gap-1 truncate text-[10px] text-muted-foreground md:text-xs">
            <MapPin className="h-2.5 w-2.5 md:h-3 md:w-3" />
            <span className="truncate">{moment.location.name}</span>
          </span>
        )}
      </div>

      <div className="flex flex-1 items-center">
        <p className="line-clamp-3 font-display text-[0.97rem] font-medium leading-[1.3] tracking-[-0.01em] text-foreground md:line-clamp-4 md:text-lg md:leading-relaxed md:tracking-normal">
          {shouldQuoteMomentText ? <>&ldquo;{momentText}&rdquo;</> : momentText}
        </p>
      </div>

      <RelativeTimeLabel
        date={moment.createdAt}
        locale={moment.locale}
        className="font-mono text-[10px] text-muted-foreground md:text-xs"
      />
    </div>
  );

  if (preview) {
    return <div className={wrapperClass}>{content}</div>;
  }

  if (onOpenPreview) {
    return (
      <button
        type="button"
        className={cn(wrapperClass, "text-left")}
        onClick={handleOpenPreview}
      >
        {content}
      </button>
    );
  }

  return (
    <Link
      href={toLocalizedPath(moment.locale, `/moments/${moment.id}`)}
      prefetch={false}
      className={wrapperClass}
    >
      {content}
    </Link>
  );
}
