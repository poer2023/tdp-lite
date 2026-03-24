import Image from "next/image";
import { cn } from "@/lib/utils";
import { useEffect, useMemo, useRef, useState } from "react";
import { resolveHomeImagePhaseItem } from "@/components/home/homeMediaPhases";
import { DeferredCardMediaPlaceholder } from "./DeferredCardMediaSlot";

const NEXT_IMAGE_WIDTH_BUCKETS = [
  16, 32, 48, 64, 96, 128, 256, 384, 640, 750, 828, 1080, 1200, 1920, 2048,
  3840,
] as const;

function getOptimizedPreviewWidth(requestedWidth: number, sourceWidth?: number) {
  const safeRequestedWidth = Math.max(1, Math.round(requestedWidth));
  const clampedWidth = sourceWidth
    ? Math.min(safeRequestedWidth, Math.max(sourceWidth, 640))
    : safeRequestedWidth;

  const bucket =
    NEXT_IMAGE_WIDTH_BUCKETS.find((width) => width >= clampedWidth) ??
    NEXT_IMAGE_WIDTH_BUCKETS[NEXT_IMAGE_WIDTH_BUCKETS.length - 1];

  return bucket;
}

export function buildOptimizedPreviewImageUrl(
  src: string,
  requestedWidth: number,
  sourceWidth?: number,
  quality = 75
) {
  const width = getOptimizedPreviewWidth(requestedWidth, sourceWidth);
  return `/_next/image?url=${encodeURIComponent(src)}&w=${width}&q=${quality}`;
}

interface MomentImageOnlyProps {
  src: string;
  alt: string;
  sizes: string;
  unoptimized?: boolean;
  priority?: boolean;
  loading?: "eager" | "lazy";
  className?: string;
  preview?: boolean;
  homeImagePhaseId?: string;
  sourceWidth?: number;
  previewSeedSrc?: string;
}

export function MomentImageOnly({
  src,
  alt,
  sizes,
  unoptimized = false,
  priority = false,
  loading,
  className,
  preview = false,
  homeImagePhaseId,
  sourceWidth,
  previewSeedSrc,
}: MomentImageOnlyProps) {
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const previewLoader = useMemo(() => {
    if (!preview) {
      return undefined;
    }

    return ({
      src: imageSrc,
      width,
      quality,
    }: {
      src: string;
      width: number;
      quality?: number;
    }) => buildOptimizedPreviewImageUrl(imageSrc, width, sourceWidth, quality);
  }, [preview, sourceWidth]);

  useEffect(() => {
    setIsLoaded(false);
  }, [src]);

  useEffect(() => {
    if (!homeImagePhaseId) {
      return;
    }

    const node = imageRef.current;
    if (node?.complete && node.naturalWidth > 0) {
      setIsLoaded(true);
      resolveHomeImagePhaseItem(homeImagePhaseId);
    }
  }, [homeImagePhaseId, src]);

  return (
    <div className={cn("relative h-full w-full overflow-hidden", className)}>
      {preview && previewSeedSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previewSeedSrc}
          alt=""
          aria-hidden="true"
          className={cn(
            "absolute inset-0 h-full w-full object-cover transition-opacity duration-300",
            isLoaded ? "opacity-0" : "opacity-100"
          )}
        />
      ) : null}
      {preview ? (
        <DeferredCardMediaPlaceholder
          variant="dark"
          className={cn(
            "transition-opacity duration-300",
            isLoaded || Boolean(previewSeedSrc) ? "opacity-0" : "opacity-100"
          )}
        />
      ) : null}
      <Image
        ref={imageRef}
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        unoptimized={unoptimized}
        loading={loading}
        priority={priority}
        loader={previewLoader}
        onLoad={() => {
          setIsLoaded(true);
          resolveHomeImagePhaseItem(homeImagePhaseId);
        }}
        onError={() => resolveHomeImagePhaseItem(homeImagePhaseId)}
        className={cn(
          "object-cover transition-[opacity,transform] duration-500",
          preview
            ? isLoaded
              ? "opacity-100"
              : "opacity-0"
            : "opacity-100",
          !preview && "group-hover:scale-105"
        )}
      />
    </div>
  );
}
