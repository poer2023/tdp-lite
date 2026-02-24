"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Music2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Moment } from "@/lib/schema";

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

  useEffect(() => {
    setActiveMediaIndex(0);
  }, [moment.id]);

  const primaryMedia = hasMedia
    ? mediaList[Math.min(activeMediaIndex, mediaList.length - 1)] ?? mediaList[0]
    : null;
  const skipOptimization =
    primaryMedia?.url.startsWith("blob:") || primaryMedia?.url.startsWith("data:");

  const handlePrevMedia = () => {
    if (!hasMultipleMedia) return;
    setActiveMediaIndex((prev) => (prev - 1 + mediaList.length) % mediaList.length);
  };

  const handleNextMedia = () => {
    if (!hasMultipleMedia) return;
    setActiveMediaIndex((prev) => (prev + 1) % mediaList.length);
  };

  return (
    <div
      className={cn(
        "lg-panel-strong relative w-full max-w-5xl mx-auto",
        "paper-texture",
        "rounded-3xl overflow-hidden",
        "shadow-deep-stack",
        "border border-black/5 dark:border-white/10",
        // Left-right layout for desktop
        "grid grid-cols-1 md:grid-cols-[3fr_2fr]",
        className
      )}
    >
      {/* Left side - Image area */}
      <div
        className="relative aspect-square md:aspect-auto md:min-h-[500px] bg-black/5 dark:bg-white/5"
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
                sizes="(min-width: 768px) 60vw, 100vw"
                className="object-cover"
              />
            ) : primaryMedia.type === "video" ? (
              <video
                src={primaryMedia.url}
                crossOrigin="anonymous"
                className="w-full h-full object-cover"
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
                  {primaryMedia.title || moment.content}
                </p>
                {primaryMedia.artist ? (
                  <p className="font-mono text-xs text-white/70">{primaryMedia.artist}</p>
                ) : null}
              </div>
            )}

            {/* Camera parameters badge */}
            <div
              className={cn(
                "absolute bottom-4 left-4",
                "px-3 py-1.5 rounded-full",
                "lg-chip-dark bg-black/40",
                "text-white text-xs font-mono",
                "flex items-center gap-2"
              )}
            >
              <span>📷</span>
              <span>35MM • F/2.8</span>
            </div>

            {hasMultipleMedia ? (
              <>
                <button
                  type="button"
                  onClick={handlePrevMedia}
                  aria-label="Previous media"
                  className="absolute left-4 top-1/2 z-20 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/55 bg-black/55 text-white shadow-[0_10px_24px_-14px_rgba(0,0,0,0.65)] backdrop-blur-sm transition-colors hover:bg-black/70"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={handleNextMedia}
                  aria-label="Next media"
                  className="absolute right-4 top-1/2 z-20 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/55 bg-black/55 text-white shadow-[0_10px_24px_-14px_rgba(0,0,0,0.65)] backdrop-blur-sm transition-colors hover:bg-black/70"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                <div className="absolute right-4 top-4 z-20 rounded-full border border-white/55 bg-black/55 px-2.5 py-1 font-mono text-[11px] text-white shadow-[0_10px_24px_-14px_rgba(0,0,0,0.65)] backdrop-blur-sm">
                  {activeMediaIndex + 1}/{mediaList.length}
                </div>
              </>
            ) : null}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            {t.noMedia}
          </div>
        )}
      </div>

      {/* Right side - Content */}
      <div className="flex flex-col p-6 md:p-8 bg-white/90 dark:bg-black/80">
        {/* Title row */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-sm tracking-wide text-muted-foreground">
            {t.reflection} // {String(index).padStart(3, "0")}
          </h2>
          <div
            className={cn(
              "flex items-center gap-1",
              "px-2 py-0.5 rounded-full",
              "bg-amber-100 dark:bg-amber-900/30",
              "text-amber-700 dark:text-amber-400",
              "text-xs"
            )}
          >
            <Sparkles className="w-3 h-3" />
            <span>AI</span>
          </div>
        </div>

        {/* Main title */}
        <div className="space-y-3 mb-6">
          <h1 className="font-display text-2xl md:text-3xl font-semibold leading-tight">
            {t.fallbackTitle}
          </h1>
          <div className="w-16 h-0.5 bg-black/10 dark:bg-white/10" />
        </div>

        {/* Content body */}
        <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
          {moment.content}
        </p>
      </div>
    </div>
  );
}
