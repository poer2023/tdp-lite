import Image from "next/image";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";
import { resolveHomeImagePhaseItem } from "@/components/home/homeMediaPhases";
import { DeferredCardMediaPlaceholder } from "./DeferredCardMediaSlot";

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
}: MomentImageOnlyProps) {
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

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
      {preview ? (
        <DeferredCardMediaPlaceholder
          variant="dark"
          className={cn(
            "transition-opacity duration-300",
            isLoaded ? "opacity-0" : "opacity-100"
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
