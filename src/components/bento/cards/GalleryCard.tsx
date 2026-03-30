import Image from "next/image";
import { cn } from "@/lib/utils";
import type { GalleryItem } from "@/lib/content/types";
import { Camera, Aperture } from "lucide-react";
import { LgChipDark } from "@/components/ui/LgChipDark";
import {
  DeferredCardMediaPlaceholder,
  DeferredCardMediaSlot,
} from "./DeferredCardMediaSlot";
import {
  BENTO_CARD_MEDIA_SIZES,
  createOptimizedImageLoader,
} from "./mediaSizing";
import { resolveHomeImagePhaseItem } from "@/components/home/homeMediaPhases";
import { shouldBypassNextImageOptimization } from "@/lib/mediaOptimization";

interface GalleryCardProps {
  item: GalleryItem;
  className?: string;
  preview?: boolean;
  priorityMedia?: boolean;
  deferMedia?: boolean;
  deferMediaDelayMs?: number;
  suspendDeferredMedia?: boolean;
  homeImagePhaseId?: string;
}

export function GalleryCard({
  item,
  className,
  preview = false,
  priorityMedia = false,
  deferMedia = false,
  deferMediaDelayMs,
  suspendDeferredMedia = false,
  homeImagePhaseId,
}: GalleryCardProps) {
  const imageSrc = item.thumbUrl || item.fileUrl;
  const skipOptimization = shouldBypassNextImageOptimization(imageSrc);
  const imageLoader = !skipOptimization
    ? createOptimizedImageLoader(item.width ?? undefined, 384)
    : undefined;

  return (
    <div
      className={cn(
        "paper-card relative h-full w-full overflow-hidden",
        !preview && "group",
        className
      )}
      data-lg-media-source="gallery-card-media"
    >
      <DeferredCardMediaSlot
        deferred={deferMedia}
        delayMs={deferMediaDelayMs}
        suspended={suspendDeferredMedia}
        placeholder={<DeferredCardMediaPlaceholder variant="light" />}
        homeImagePhaseId={homeImagePhaseId}
      >
        <Image
          src={imageSrc}
          alt={item.title || "Gallery Photo"}
          fill
          sizes={BENTO_CARD_MEDIA_SIZES}
          unoptimized={skipOptimization}
          loading={priorityMedia ? undefined : "lazy"}
          priority={priorityMedia}
          loader={imageLoader}
          onLoad={() => resolveHomeImagePhaseItem(homeImagePhaseId)}
          onError={() => resolveHomeImagePhaseItem(homeImagePhaseId)}
          className={cn(
            "object-cover transition-transform duration-500",
            !preview && "group-hover:scale-105"
          )}
        />
      </DeferredCardMediaSlot>

      {/* Hover overlay with EXIF info */}
      <div
        className={cn(
          "absolute inset-0 flex flex-col justify-between bg-gradient-to-t from-black/80 via-transparent to-transparent p-2.5 transition-opacity duration-300 md:p-4",
          preview ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        )}
      >
        <div className="flex justify-end">
          {item.title && (
            <LgChipDark className="max-w-[72%] truncate">
              {item.title}
            </LgChipDark>
          )}
        </div>

        <div className="space-y-1 md:space-y-2">
          {item.camera && (
            <div className="flex items-center gap-1.5 text-[10px] text-white/90 md:gap-2 md:text-xs">
              <Camera className="h-3 w-3 md:h-3.5 md:w-3.5" />
              <span className="truncate font-medium">{item.camera}</span>
            </div>
          )}
          {(item.focalLength || item.aperture || item.iso) && (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[9px] text-white/70 md:gap-3 md:text-xs">
              {item.focalLength && <span>{item.focalLength}</span>}
              {item.aperture && (
                <span className="flex items-center gap-1">
                  <Aperture className="h-2.5 w-2.5 md:h-3 md:w-3" />
                  {item.aperture}
                </span>
              )}
              {item.iso && <span>ISO {item.iso}</span>}
            </div>
          )}
        </div>
      </div>

      {/* Always visible title badge */}
      {item.title && (
        <div
          className={cn(
            "absolute bottom-3 left-3 transition-opacity",
            preview ? "opacity-0" : "opacity-100 group-hover:opacity-0"
          )}
        >
          <LgChipDark className="max-w-[9.5rem] truncate bg-white/90 text-white shadow-sm dark:bg-black/70">
            {item.title}
          </LgChipDark>
        </div>
      )}
    </div>
  );
}
