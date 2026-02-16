import { db } from "@/lib/db";
import { gallery } from "@/lib/schema";
import { desc } from "drizzle-orm";
import { Camera, Aperture } from "lucide-react";
import Image from "next/image";
import { BottomNav } from "@/components/BottomNav";
import { unstable_cache } from "next/cache";

export const dynamic = "force-dynamic";

type Locale = "en" | "zh";

interface GalleryPageProps {
  params: Promise<{ locale: Locale }>;
}

const getGalleryItems = unstable_cache(
  async () => db.select().from(gallery).orderBy(desc(gallery.createdAt)),
  ["gallery-items-v1"],
  { revalidate: 120 }
);

export default async function GalleryPage({ params }: GalleryPageProps) {
  const { locale } = await params;
  const items = await getGalleryItems();

  return (
    <div className="text-ink relative min-h-screen overflow-x-hidden bg-[#e9e9e7] pb-32 font-display selection:bg-black/10 selection:text-black">
      <div className="bg-noise pointer-events-none fixed inset-0 z-0 opacity-40 mix-blend-multiply" />

      <div className="relative z-10 mx-auto max-w-[1400px] px-6 py-12 md:px-12">
        {/* Header */}
        <header className="mb-12">
          <div className="mb-4 inline-flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[#111]" />
            <span className="font-mono text-xs uppercase tracking-widest text-[#999]">
              Photography
            </span>
            <span className="h-1.5 w-1.5 rounded-full bg-[#111]" />
          </div>
          <h1 className="mb-4 font-serif text-6xl font-medium tracking-[-0.03em] text-[#111] md:text-8xl">
            Gallery
          </h1>
          <p className="max-w-xl font-mono text-sm leading-relaxed text-[#999]">
            A curated collection of analog moments. Each frame tells a story
            through light, shadow, and the quiet poetry of everyday scenes.
          </p>
        </header>

        {/* Photo Grid - Masonry-like */}
        {items.length === 0 ? (
          <p className="py-20 text-center font-mono text-sm text-[#999]">
            No photos yet.
          </p>
        ) : (
          <div className="columns-1 gap-4 sm:columns-2 lg:columns-3">
            {items.map((item) => {
              const imageSrc = item.thumbUrl || item.fileUrl;
              const skipOptimization =
                imageSrc.startsWith("blob:") || imageSrc.startsWith("data:");

              return (
                <div
                  key={item.id}
                  className="group relative mb-4 break-inside-avoid overflow-hidden rounded-2xl border border-black/5 bg-white shadow-[0_4px_20px_rgba(0,0,0,0.03)]"
                >
                  {/* Image */}
                  <Image
                    src={imageSrc}
                    alt={item.title || "Gallery Photo"}
                    width={item.width || 1200}
                    height={item.height || 900}
                    unoptimized={skipOptimization}
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    className="h-auto w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                  />

                  {/* Hover overlay with EXIF */}
                  <div className="absolute inset-0 flex flex-col justify-between bg-gradient-to-t from-black/70 via-transparent to-transparent p-5 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
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
                    <div className="absolute bottom-3 left-3 opacity-100 transition-opacity group-hover:opacity-0">
                      <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-[#333] shadow-sm backdrop-blur-sm">
                        {item.title}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <BottomNav locale={locale} activeTab="gallery" />
    </div>
  );
}
