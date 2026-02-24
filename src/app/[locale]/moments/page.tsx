import Link from "next/link";
import Image from "next/image";
import { formatRelativeTime } from "@/lib/utils";
import { getPublicMoments } from "@/lib/content/read";
import { MapPin } from "lucide-react";
import { isAppLocale, type AppLocale } from "@/lib/locale";

export const dynamic = "force-dynamic";

type Locale = AppLocale;

interface MomentsPageProps {
  params: Promise<{ locale: Locale }>;
}

export default async function MomentsPage({ params }: MomentsPageProps) {
  const { locale } = await params;
  const validLocale = isAppLocale(locale) ? locale : "en";

  const momentsData = await getPublicMoments(validLocale);

  const t = {
    en: { title: "Moments", empty: "No moments yet." },
    zh: { title: "动态", empty: "暂无动态。" },
  }[validLocale];

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">{t.title}</h1>

      {momentsData.length === 0 ? (
        <p className="text-gray-500">{t.empty}</p>
      ) : (
        <div className="space-y-6">
          {momentsData.map((moment) => (
            <Link
              key={moment.id}
              href={`/${validLocale}/moments/${moment.id}`}
              className="block rounded-lg border p-4 transition-colors hover:bg-gray-50"
            >
              <p className="mb-3 whitespace-pre-wrap">{moment.content}</p>

              {moment.media && moment.media.length > 0 && (
                <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-3">
                  {moment.media.map((item, index) => (
                    <div
                      key={index}
                      className="relative aspect-square overflow-hidden rounded"
                    >
                      {item.type === "video" ? (
                        <video
                          src={item.url}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Image
                          src={item.url}
                          alt=""
                          fill
                          unoptimized
                          sizes="(min-width: 768px) 33vw, 50vw"
                          className="object-cover"
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-4 text-sm text-gray-500">
                <time>
                  {formatRelativeTime(moment.createdAt, validLocale)}
                </time>
                {moment.location?.name && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {moment.location.name}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
