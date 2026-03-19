import Image from "next/image";
import { cn } from "@/lib/utils";

interface MomentImageOnlyProps {
  src: string;
  alt: string;
  sizes: string;
  unoptimized?: boolean;
  priority?: boolean;
  loading?: "eager" | "lazy";
  className?: string;
  preview?: boolean;
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
}: MomentImageOnlyProps) {
  return (
    <div className={cn("relative h-full w-full overflow-hidden", className)}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        unoptimized={unoptimized}
        loading={loading}
        priority={priority}
        className={cn(
          "object-cover transition-transform duration-500",
          !preview && "group-hover:scale-105"
        )}
      />
    </div>
  );
}
