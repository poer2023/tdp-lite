import Image from "next/image";
import { cn } from "@/lib/utils";
import { GalleryItem } from "@/lib/schema";
import { Camera, Aperture } from "lucide-react";

interface GalleryCardProps {
  item: GalleryItem;
  className?: string;
  preview?: boolean;
}

export function GalleryCard({ item, className, preview = false }: GalleryCardProps) {
  const imageSrc = item.thumbUrl || item.fileUrl;
  const skipOptimization =
    imageSrc.startsWith("blob:") || imageSrc.startsWith("data:");

  return (
    <div
      className={cn(
        "paper-card relative h-full w-full overflow-hidden",
        !preview && "group",
        className
      )}
    >
      <Image
        src={imageSrc}
        alt={item.title || "Gallery Photo"}
        fill
        sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
        unoptimized={skipOptimization}
        className={cn(
          "object-cover transition-transform duration-500",
          !preview && "group-hover:scale-105"
        )}
      />

      {/* Hover overlay with EXIF info */}
      <div
        className={cn(
          "absolute inset-0 flex flex-col justify-between bg-gradient-to-t from-black/80 via-transparent to-transparent p-4 transition-opacity duration-300",
          preview ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        )}
      >
        <div className="flex justify-end">
          {item.title && (
            <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-medium text-white backdrop-blur-md">
              {item.title}
            </span>
          )}
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
          <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-gray-800 shadow-sm backdrop-blur-sm dark:bg-black/70 dark:text-white">
            {item.title}
          </span>
        </div>
      )}
    </div>
  );
}
