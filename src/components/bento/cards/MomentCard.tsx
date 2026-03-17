"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import { cn, formatRelativeTime } from "@/lib/utils";
import type { Moment } from "@/lib/content/types";
import { isVideoUrl } from "@/lib/media";
import { ChevronLeft, ChevronRight, MapPin, Music2, Quote } from "lucide-react";
import { AutoplayCoverVideo } from "./AutoplayCoverVideo";
import { MomentImageOnly } from "./MomentImageOnly";
import { toLocalizedPath } from "@/lib/locale-routing";
import { LgChipDark } from "@/components/ui/LgChipDark";
import { resolveMomentDisplayFromMoment } from "@/lib/content/momentDisplay";

type MomentMedia = NonNullable<Moment["media"]>[number];

export interface MomentCardOpenOriginRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface MomentCardProps {
  moment: Moment;
  isHighlighted?: boolean;
  className?: string;
  preview?: boolean;
  onOpenPreview?: (originRect: MomentCardOpenOriginRect) => void;
  previewMediaIndex?: number;
  onPreviewMediaIndexChange?: (nextIndex: number) => void;
  showPreviewMediaControls?: boolean;
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
}: MomentCardProps) {
  const mediaList = moment.media ?? [];
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
  const previousResolvedMediaIndexRef = useRef(0);

  const getMediaPresentation = (media: MomentMedia | null) => {
    const isAudio = Boolean(media?.type === "audio");
    const isVideo = Boolean(
      media && !isAudio && (media.type === "video" || isVideoUrl(media.url))
    );
    const shouldSkipOptimization = Boolean(
      media &&
      !isVideo &&
      (media.url.startsWith("blob:") || media.url.startsWith("data:"))
    );
    return { isAudio, isVideo, shouldSkipOptimization };
  };

  useEffect(() => {
    setInternalPreviewMediaIndex(0);
    setOutgoingPreviewMediaIndex(null);
    previousResolvedMediaIndexRef.current = 0;
    if (mediaTransitionTimerRef.current !== null) {
      window.clearTimeout(mediaTransitionTimerRef.current);
      mediaTransitionTimerRef.current = null;
    }
  }, [moment.id]);

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
  const mainMedia = hasMedia ? mediaList[resolvedMediaIndex] ?? mediaList[0] : null;
  const {
    isAudio: isAudioMedia,
    isVideo: hasVideoMedia,
    shouldSkipOptimization: skipOptimization,
  } = getMediaPresentation(mainMedia);
  const momentDisplay = resolveMomentDisplayFromMoment(moment, mainMedia?.title);
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
  const previewMediaWidth =
    isPortraitMedia
      ? `min(74%, calc(56vh * ${previewMediaRatio}))`
      : "100%";
  const isDetachedPreview = preview && hasMedia && !isAudioMedia;
  const canSwitchPreviewMedia = preview && hasMultipleMedia && showPreviewMediaControls;
  const outgoingPreviewMedia =
    outgoingPreviewMediaIndex !== null
      ? (mediaList[outgoingPreviewMediaIndex] ?? null)
      : null;
  const shouldAnimatePreviewMedia = Boolean(
    isDetachedPreview && hasMultipleMedia && outgoingPreviewMedia
  );
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

  useEffect(() => {
    if (!preview || !hasMultipleMedia) {
      setOutgoingPreviewMediaIndex(null);
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
      (resolvedMediaIndex - previousIndex + mediaList.length) % mediaList.length;
    const backwardDistance =
      (previousIndex - resolvedMediaIndex + mediaList.length) % mediaList.length;
    const nextDirection = forwardDistance <= backwardDistance ? "forward" : "backward";

    if (mediaTransitionTimerRef.current !== null) {
      window.clearTimeout(mediaTransitionTimerRef.current);
      mediaTransitionTimerRef.current = null;
    }

    setMediaTransitionDirection(nextDirection);
    setOutgoingPreviewMediaIndex(previousIndex);
    previousResolvedMediaIndexRef.current = resolvedMediaIndex;

    mediaTransitionTimerRef.current = window.setTimeout(() => {
      setOutgoingPreviewMediaIndex(null);
      mediaTransitionTimerRef.current = null;
    }, 320);
  }, [hasMultipleMedia, mediaList.length, preview, resolvedMediaIndex]);

  useEffect(() => {
    return () => {
      if (mediaTransitionTimerRef.current !== null) {
        window.clearTimeout(mediaTransitionTimerRef.current);
        mediaTransitionTimerRef.current = null;
      }
    };
  }, []);

  const renderMediaLayer = (media: MomentMedia) => {
    const {
      isAudio: layerIsAudioMedia,
      isVideo: layerHasVideoMedia,
      shouldSkipOptimization: layerSkipOptimization,
    } = getMediaPresentation(media);

    if (layerIsAudioMedia) {
      return (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#111] via-[#1f2937] to-[#111827]">
          <div className="flex flex-col items-center gap-3 text-white/90">
            <span className="lg-chip-dark inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium">
              <Music2 className="h-3.5 w-3.5" />
              Music
            </span>
            <p className="font-display text-lg font-medium text-white">
              {media.title || moment.content}
            </p>
            {media.artist ? (
              <p className="font-mono text-xs text-white/70">{media.artist}</p>
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
          eager
        />
      );
    }

    return (
      <MomentImageOnly
        src={media.url}
        alt="Moment"
        sizes="(min-width: 1024px) 66vw, 90vw"
        unoptimized={layerSkipOptimization}
        preview
      />
    );
  };

  const handleOpenPreview = (event: ReactMouseEvent<HTMLButtonElement>) => {
    if (!onOpenPreview) {
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    onOpenPreview({
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
    });
  };

  const content = hasMedia ? (
    isDetachedPreview ? (
      <>
        <div
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
                {renderMediaLayer(outgoingPreviewMedia)}
              </div>
            ) : null}
            <div
              key={`incoming-${moment.id}-${resolvedMediaIndex}`}
              className={cn("moment-preview-media-layer", incomingLayerAnimationClass)}
            >
              {renderMediaLayer(mainMedia!)}
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

        <div className="mx-3 mt-3 rounded-[20px] border border-white/75 bg-white/80 p-3.5 shadow-preview-info backdrop-blur-md">
          <div className="mb-2.5 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white/80 px-2.5 py-0.5 text-[11px] font-medium text-[#333]">
              {isHighlighted ? "Spotlight" : "Insight"}
            </span>
            {moment.location ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-black/10 bg-white/80 px-2.5 py-0.5 text-[11px] text-[#555]">
                <MapPin className="h-3 w-3 shrink-0" />
                {moment.location.name}
              </span>
            ) : null}
          </div>

          <p className="line-clamp-3 whitespace-pre-wrap font-display text-[1rem] font-medium leading-[1.42] tracking-[-0.004em] text-[#111]">
            {shouldQuoteMomentText ? <>&ldquo;{momentText}&rdquo;</> : momentText}
          </p>

          <div className="mt-2.5 font-mono text-[10px] uppercase tracking-wider text-[#666]">
            {formatRelativeTime(moment.createdAt, moment.locale)}
          </div>
        </div>
      </>
    ) : (
      <>
        <div className="absolute inset-0 z-0" data-lg-media-source="moment-card-media">
          {isAudioMedia ? (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#111] via-[#1f2937] to-[#111827]">
              <div className="flex flex-col items-center gap-3 text-white/90">
                <span className="lg-chip-dark inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium">
                  <Music2 className="h-3.5 w-3.5" />
                  Music
                </span>
                <p className="font-display text-lg font-medium text-white">
                  {momentText}
                </p>
                {mainMedia?.artist ? (
                  <p className="font-mono text-xs text-white/70">{mainMedia.artist}</p>
                ) : null}
              </div>
            </div>
          ) : hasVideoMedia ? (
            <AutoplayCoverVideo
              src={mainMedia!.url}
              poster={mainMedia?.thumbnailUrl}
              className={cn(
                "transition-transform duration-500",
                !preview && "group-hover:scale-105"
              )}
            />
          ) : (
            <MomentImageOnly
              src={mainMedia!.url}
              alt="Moment"
              sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
              unoptimized={Boolean(skipOptimization)}
              preview={preview}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        </div>

        <div className="relative z-10 flex h-full flex-col justify-between p-6">
          <div className="flex items-start justify-between">
            <LgChipDark className="inline-flex items-center gap-1.5">
              {isHighlighted ? "Spotlight" : "Insight"}
            </LgChipDark>
            {moment.location && (
              <LgChipDark className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {moment.location.name}
              </LgChipDark>
            )}
          </div>

          <div className="space-y-2">
            {preview ? (
              <p className="font-display text-lg font-medium leading-relaxed text-white">
                {shouldQuoteMomentText ? (
                  <>&ldquo;{momentText}&rdquo;</>
                ) : (
                  momentText
                )}
              </p>
            ) : (
              <div className="relative">
                <p className="line-clamp-2 font-display text-lg font-medium leading-relaxed text-white transition-[transform,opacity] duration-300 ease-out will-change-transform group-hover:-translate-y-2 group-hover:opacity-0">
                  {shouldQuoteMomentText ? (
                    <>&ldquo;{momentText}&rdquo;</>
                  ) : (
                    momentText
                  )}
                </p>
                <p className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-3 font-display text-lg font-medium leading-relaxed text-white opacity-0 transition-[transform,opacity] duration-300 ease-out will-change-transform group-hover:translate-y-0 group-hover:opacity-100">
                  {shouldQuoteMomentText ? (
                    <>&ldquo;{momentText}&rdquo;</>
                  ) : (
                    momentText
                  )}
                </p>
              </div>
            )}
            {isAudioMedia && mainMedia?.artist ? (
              <div className="font-mono text-xs text-white/70">{mainMedia.artist}</div>
            ) : null}
            <div className="font-mono text-xs text-white/60">
              {formatRelativeTime(moment.createdAt, moment.locale)}
            </div>
          </div>
        </div>
      </>
    )
  ) : (
    <div className="flex h-full flex-col justify-between p-6">
      <div className="flex items-start justify-between">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
          <Quote className="h-4 w-4" />
        </div>
        {isHighlighted && (
          <span className="rounded-full bg-black px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-white">
            Spotlight
          </span>
        )}
        {moment.location && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            {moment.location.name}
          </span>
        )}
      </div>

      <div className="flex-1 flex items-center">
        <p className="font-display text-lg font-medium leading-relaxed text-foreground">
          {shouldQuoteMomentText ? <>&ldquo;{momentText}&rdquo;</> : momentText}
        </p>
      </div>

      <div className="font-mono text-xs text-muted-foreground">
        {formatRelativeTime(moment.createdAt, moment.locale)}
      </div>
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
    <Link href={toLocalizedPath(moment.locale, `/moments/${moment.id}`)} className={wrapperClass}>
      {content}
    </Link>
  );
}
