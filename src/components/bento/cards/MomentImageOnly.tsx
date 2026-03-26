import Image from "next/image";
import { cn } from "@/lib/utils";
import { useEffect, useMemo, useRef, useState } from "react";
import { resolveHomeImagePhaseItem } from "@/components/home/homeMediaPhases";
import { DeferredCardMediaPlaceholder } from "./DeferredCardMediaSlot";
import { buildOptimizedImageUrl } from "./mediaSizing";
import { shouldBypassNextImageOptimization } from "@/lib/mediaOptimization";

interface MomentImageOnlyProps {
  src: string;
  alt: string;
  sizes: string;
  unoptimized?: boolean;
  priority?: boolean;
  fetchPriority?: "high" | "low" | "auto";
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
  fetchPriority,
  loading,
  className,
  preview = false,
  homeImagePhaseId,
  sourceWidth,
  previewSeedSrc,
}: MomentImageOnlyProps) {
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const shouldBypassOptimization = useMemo(
    () => unoptimized || shouldBypassNextImageOptimization(src),
    [src, unoptimized]
  );
  const optimizedLoader = useMemo(() => {
    if (shouldBypassOptimization || (!preview && typeof sourceWidth !== "number")) {
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
    }) =>
      buildOptimizedImageUrl(
        imageSrc,
        width,
        sourceWidth,
        quality,
        preview ? 640 : 384
      );
  }, [preview, shouldBypassOptimization, sourceWidth]);

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
          fetchPriority={fetchPriority}
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
        unoptimized={shouldBypassOptimization}
        loading={loading}
        priority={priority}
        fetchPriority={fetchPriority}
        loader={optimizedLoader}
        onLoad={() => {
          setIsLoaded(true);
          resolveHomeImagePhaseItem(homeImagePhaseId);
        }}
        onError={() => resolveHomeImagePhaseItem(homeImagePhaseId)}
        className={cn(
          "object-cover transition-[opacity,transform] duration-500",
          preview ? (isLoaded ? "opacity-100" : "opacity-0") : "opacity-100",
          !preview && "group-hover:scale-105"
        )}
      />
    </div>
  );
}
