import type { GalleryItem } from "@/lib/schema";

type Locale = "en" | "zh";

interface GalleryPageProps {
  params: Promise<{ locale: Locale }>;
}

async function getGalleryItems() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  try {
    const res = await fetch(`${baseUrl}/api/gallery`, { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    return data.items || [];
  } catch {
    return [];
  }
}

export default async function GalleryPage({ params }: GalleryPageProps) {
  const { locale } = await params;
  const items = await getGalleryItems();

  const t = {
    en: { title: "Gallery", empty: "No photos yet." },
    zh: { title: "相册", empty: "暂无照片。" },
  }[locale];

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">{t.title}</h1>

      {items.length === 0 ? (
        <p className="text-gray-500">{t.empty}</p>
      ) : (
        <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {items.map((item: GalleryItem) => (
            <div
              key={item.id}
              className="group relative aspect-square overflow-hidden rounded-lg"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.thumbUrl || item.fileUrl}
                alt={item.title || ""}
                className="h-full w-full object-cover transition-transform group-hover:scale-105"
              />

              {item.isLivePhoto && (
                <span className="absolute left-2 top-2 rounded bg-black/50 px-2 py-0.5 text-xs text-white">
                  LIVE
                </span>
              )}

              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-3 opacity-0 transition-opacity group-hover:opacity-100">
                {item.title && (
                  <p className="text-sm font-medium text-white">{item.title}</p>
                )}
                {item.camera && (
                  <p className="text-xs text-white/80">{item.camera}</p>
                )}
                {(item.aperture || item.focalLength || item.iso) && (
                  <p className="text-xs text-white/60">
                    {[item.focalLength, item.aperture, item.iso ? `ISO ${item.iso}` : null]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
