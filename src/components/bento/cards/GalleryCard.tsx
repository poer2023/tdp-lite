import Image from "next/image";
import { cn } from "@/lib/utils";
import type { GalleryItem } from "@/lib/content/types";
import { Camera, Aperture } from "lucide-react";
import { LgChipDark } from "@/components/ui/LgChipDark";
import {
  DeferredCardMediaPlaceholder,
  DeferredCardMediaSlot,
} from "./DeferredCardMediaSlot";
import { BENTO_CARD_MEDIA_SIZES, buildOptimizedImageUrl } from "./mediaSizing";
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
          loader={
            skipOptimization
              ? undefined
              : ({ src, width, quality }) =>
                  buildOptimizedImageUrl(
                    src,
                    width,
                    item.width ?? undefined,
                    quality
                  )
          }
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
          "absolute inset-0 flex flex-col justify-between bg-gradient-to-t from-black/80 via-transparent to-transparent p-4 transition-opacity duration-300",
          preview ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        )}
      >
        <div className="flex justify-end">
          {item.title && <LgChipDark>{item.title}</LgChipDark>}
        </div>

        <div className="space-y-2">
          {item.camera && (
            <div className="flex items-center gap-2 text-xs text-white/90">
              <Camera className="h-3.5 w-3.5" />
              <span className="font-medium">{item.camera}</span>
            </div>
          )}
          {(item.focalLength || item.aperture || item.iso) && (
            <div className="flex items-center gap-3 font-mono text-xs text-white/70">
              {item.focalLength && <span>{item.focalLength}</span>}
              {item.aperture && (
                <span className="flex items-center gap-1">
                  <Aperture className="h-3 w-3" />
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
          <LgChipDark className="bg-white/90 text-white shadow-sm dark:bg-black/70">
            {item.title}
          </LgChipDark>
        </div>
      )}
    </div>
  );
}
