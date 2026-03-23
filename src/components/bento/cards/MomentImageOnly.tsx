import Image from "next/image";
import { cn } from "@/lib/utils";
import { useEffect, useRef } from "react";
import { resolveHomeImagePhaseItem } from "@/components/home/homeMediaPhases";

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

  useEffect(() => {
    if (!homeImagePhaseId) {
      return;
    }

    const node = imageRef.current;
    if (node?.complete && node.naturalWidth > 0) {
      resolveHomeImagePhaseItem(homeImagePhaseId);
    }
  }, [homeImagePhaseId, src]);

  return (
    <div className={cn("relative h-full w-full overflow-hidden", className)}>
      <Image
        ref={imageRef}
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        unoptimized={unoptimized}
        loading={loading}
        priority={priority}
        onLoad={() => resolveHomeImagePhaseItem(homeImagePhaseId)}
        onError={() => resolveHomeImagePhaseItem(homeImagePhaseId)}
        className={cn(
          "object-cover transition-transform duration-500",
          !preview && "group-hover:scale-105"
        )}
      />
    </div>
  );
}
