"use client";

import Image from "next/image";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Moment } from "@/lib/schema";

interface MomentDetailCardProps {
  moment: Moment;
  index?: number;
  className?: string;
}

export function MomentDetailCard({
  moment,
  index = 1,
  className,
}: MomentDetailCardProps) {
  const hasMedia = moment.media && moment.media.length > 0;
  const primaryMedia = hasMedia ? moment.media![0] : null;
  const skipOptimization =
    primaryMedia?.url.startsWith("blob:") || primaryMedia?.url.startsWith("data:");

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
            ) : (
              <video
                src={primaryMedia.url}
                crossOrigin="anonymous"
                className="w-full h-full object-cover"
                muted
                loop
                playsInline
              />
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
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            No media
          </div>
        )}
      </div>

      {/* Right side - Content */}
      <div className="flex flex-col p-6 md:p-8 bg-white/90 dark:bg-black/80">
        {/* Title row */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-sm tracking-wide text-muted-foreground">
            Reflection // {String(index).padStart(3, "0")}
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
            Finding Stillness in Chaos
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
