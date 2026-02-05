import { formatRelativeTime } from "@/lib/utils";
import type { MediaItem } from "@/lib/schema";

type Locale = "en" | "zh";

interface MomentsPageProps {
  params: Promise<{ locale: Locale }>;
}

async function getMoments(locale: Locale) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  try {
    const res = await fetch(`${baseUrl}/api/moments?locale=${locale}`, {
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.moments || [];
  } catch {
    return [];
  }
}

export default async function MomentsPage({ params }: MomentsPageProps) {
  const { locale } = await params;
  const moments = await getMoments(locale);

  const t = {
    en: { title: "Moments", empty: "No moments yet." },
    zh: { title: "动态", empty: "暂无动态。" },
  }[locale];

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">{t.title}</h1>

      {moments.length === 0 ? (
        <p className="text-gray-500">{t.empty}</p>
      ) : (
        <div className="space-y-6">
          {moments.map(
            (moment: {
              id: string;
              content: string;
              media?: MediaItem[];
              createdAt: string;
              location?: { name: string } | null;
            }) => (
              <article
                key={moment.id}
                className="rounded-lg border p-4"
              >
                <p className="mb-3 whitespace-pre-wrap">{moment.content}</p>

                {moment.media && moment.media.length > 0 && (
                  <div className="mb-3 grid gap-2 grid-cols-2 md:grid-cols-3">
                    {moment.media.map((item, index) => (
                      <div key={index} className="aspect-square overflow-hidden rounded">
                        {item.type === "video" ? (
                          <video
                            src={item.url}
                            className="h-full w-full object-cover"
                            controls
                          />
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.url}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <time>{formatRelativeTime(moment.createdAt, locale)}</time>
                  {moment.location?.name && (
                    <span>📍 {moment.location.name}</span>
                  )}
                </div>
              </article>
            )
          )}
        </div>
      )}
    </div>
  );
}
