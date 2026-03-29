"use client";

import Image from "next/image";
import { useState } from "react";
import { ChevronLeft, ChevronRight, Music2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Moment } from "@/lib/content/types";
import { resolveMomentDisplay } from "@/lib/content/momentDisplay";
import { createOptimizedImageLoader } from "./mediaSizing";
import { shouldBypassNextImageOptimization } from "@/lib/mediaOptimization";

interface MomentDetailCardProps {
  moment: Moment;
  locale?: "en" | "zh";
  index?: number;
  className?: string;
}

export function MomentDetailCard({
  moment,
  locale = "en",
  index = 1,
  className,
}: MomentDetailCardProps) {
  const t =
    locale === "zh"
      ? {
          noMedia: "暂无媒体内容",
          reflection: "片段",
          fallbackTitle: "在喧闹中寻找片刻静止",
        }
      : {
          noMedia: "No media",
          reflection: "Reflection",
          fallbackTitle: "Finding Stillness in Chaos",
        };
  const mediaList = moment.media ?? [];
  const hasMedia = mediaList.length > 0;
  const hasMultipleMedia = mediaList.length > 1;
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);

  const primaryMedia = hasMedia
    ? (mediaList[Math.min(activeMediaIndex, mediaList.length - 1)] ??
      mediaList[0])
    : null;
  const momentDisplay = resolveMomentDisplay({
    content: moment.content,
    mediaTitle: primaryMedia?.title,
    locale,
  });
  const skipOptimization = shouldBypassNextImageOptimization(primaryMedia?.url);
  const detailImageLoader =
    primaryMedia?.type === "image" && !skipOptimization
      ? createOptimizedImageLoader(primaryMedia.width, 640)
      : undefined;

  const handlePrevMedia = () => {
    if (!hasMultipleMedia) return;
    setActiveMediaIndex(
      (prev) => (prev - 1 + mediaList.length) % mediaList.length
    );
  };

  const handleNextMedia = () => {
    if (!hasMultipleMedia) return;
    setActiveMediaIndex((prev) => (prev + 1) % mediaList.length);
  };

  return (
    <div
      className={cn(
        "lg-panel-strong relative mx-auto w-full max-w-5xl",
        "paper-texture",
        "overflow-hidden rounded-3xl",
        "shadow-deep-stack",
        "border border-black/5 dark:border-white/10",
        // Left-right layout for desktop
        "grid grid-cols-1 md:grid-cols-[3fr_2fr]",
        className
      )}
    >
      {/* Left side - Image area */}
      <div
        className="relative aspect-square bg-black/5 dark:bg-white/5 md:aspect-auto md:min-h-[500px]"
        data-lg-media-source="moment-detail-media"
      >
        {primaryMedia ? (
          <>
            {primaryMedia.type === "image" ? (
              <Image
                src={primaryMedia.url}
                alt=""
                fill
                unoptimized={Boolean(skipOptimization)}
                sizes="(max-width: 767px) calc(100vw - 3rem), (min-width: 768px) 60vw, 100vw"
                loader={detailImageLoader}
                className="object-cover"
              />
            ) : primaryMedia.type === "video" ? (
              <video
                src={primaryMedia.url}
                crossOrigin="anonymous"
                className="h-full w-full object-cover"
                muted
                loop
                playsInline
                autoPlay
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-[#111] via-[#1f2937] to-[#111827] text-white/90">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium">
                  <Music2 className="h-3.5 w-3.5" />
                  Music
                </span>
                <p className="px-8 text-center font-display text-xl font-medium">
                  {momentDisplay.text}
                </p>
                {primaryMedia.artist ? (
                  <p className="font-mono text-xs text-white/70">
                    {primaryMedia.artist}
                  </p>
                ) : null}
              </div>
            )}

            {/* Camera parameters badge - only show when EXIF data available */}
            {(primaryMedia?.focalLength || primaryMedia?.aperture) && (
              <div
                className={cn(
                  "absolute bottom-4 left-4",
                  "rounded-full px-3 py-1.5",
                  "lg-chip-dark bg-black/40",
                  "font-mono text-xs text-white",
                  "flex items-center gap-2"
                )}
              >
                <span>📷</span>
                <span>
                  {[primaryMedia.focalLength, primaryMedia.aperture]
                    .filter(Boolean)
                    .join(" • ")}
                </span>
              </div>
            )}

            {hasMultipleMedia ? (
              <>
                <button
                  type="button"
                  onClick={handlePrevMedia}
                  aria-label="Previous media"
                  className="absolute left-4 top-1/2 z-20 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/55 bg-black/55 text-white shadow-media-controls backdrop-blur-sm transition-colors hover:bg-black/70"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={handleNextMedia}
                  aria-label="Next media"
                  className="absolute right-4 top-1/2 z-20 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/55 bg-black/55 text-white shadow-media-controls backdrop-blur-sm transition-colors hover:bg-black/70"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                <div className="absolute right-4 top-4 z-20 rounded-full border border-white/55 bg-black/55 px-2.5 py-1 font-mono text-[11px] text-white shadow-media-controls backdrop-blur-sm">
                  {activeMediaIndex + 1}/{mediaList.length}
                </div>
              </>
            ) : null}
          </>
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            {t.noMedia}
          </div>
        )}
      </div>

      {/* Right side - Content */}
      <div className="flex flex-col bg-white/90 p-6 dark:bg-black/80 md:p-8">
        {/* Title row */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-sm tracking-wide text-muted-foreground">
            {t.reflection} {"//"} {String(index).padStart(3, "0")}
          </h2>
          <div
            className={cn(
              "flex items-center gap-1",
              "rounded-full px-2 py-0.5",
              "bg-amber-100 dark:bg-amber-900/30",
              "text-amber-700 dark:text-amber-400",
              "text-xs"
            )}
          >
            <Sparkles className="h-3 w-3" />
            <span>AI</span>
          </div>
        </div>

        {/* Main title */}
        <div className="mb-6 space-y-3">
          <h1 className="font-display text-2xl font-semibold leading-tight md:text-3xl">
            {t.fallbackTitle}
          </h1>
          <div className="h-0.5 w-16 bg-black/10 dark:bg-white/10" />
        </div>

        {/* Content body */}
        <p className="text-sm leading-relaxed text-muted-foreground md:text-base">
          {momentDisplay.text}
        </p>
      </div>
    </div>
  );
}
