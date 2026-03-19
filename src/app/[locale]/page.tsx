import { BentoGrid } from "@/components/bento/BentoGrid";
import { getPublicFeed, getPublicPresence } from "@/lib/content/read";
import Link from "next/link";
import Image from "next/image";
import { toLocalizedPath } from "@/lib/locale-routing";
import { HomeDeferredFeed } from "@/components/home/HomeDeferredFeed";

import { type AppLocale } from "@/lib/locale";
import { SITE_AVATAR_SRC } from "@/lib/branding";

type Locale = AppLocale;

interface HomePageProps {
  params: Promise<{ locale: Locale }>;
}

const HOME_INITIAL_FEED_LIMIT = 8;
const HOME_TOTAL_FEED_LIMIT = 72;

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;
  const [initialItems, presence] = await Promise.all([
    getPublicFeed(locale, HOME_INITIAL_FEED_LIMIT),
    getPublicPresence(),
  ]);
  const t =
    locale === "zh"
      ? {
          statusLabel: "状态",
          statusOnlinePrefix: "在线",
          statusOfflinePrefix: "离线",
          statusUnknown: "未知",
          fallbackLocation: "东京",
          profileAlt: "个人头像",
          heroMonth: "间隙",
          heroAccent: "",
          heroDescription:
            "[001] 通过分层的棱镜，记录日常生活里稍纵即逝的片段。",
        }
      : {
          statusLabel: "Status",
          statusOnlinePrefix: "ONLINE",
          statusOfflinePrefix: "OFFLINE",
          statusUnknown: "UNKNOWN",
          fallbackLocation: "TOKYO",
          profileAlt: "Profile portrait",
          heroMonth: "Interlude",
          heroAccent: "",
          heroDescription:
            "[001] Capturing the ephemeral fragments of daily life through a layered prism.",
        };

  const locationLabel = (presence?.locationLabel || t.fallbackLocation).trim();
  const onlinePrefix =
    presence?.status === "online"
      ? t.statusOnlinePrefix
      : presence?.status === "offline"
        ? t.statusOfflinePrefix
        : t.statusUnknown;
  const statusValue = `${onlinePrefix} • ${locationLabel}`;

  return (
    <div
      className="text-ink bg-page-surface relative min-h-screen overflow-x-hidden pb-32 font-display selection:bg-black/10 selection:text-black"
      data-lg-bg-layer="home-root"
    >
      <div
        className="bg-noise pointer-events-none fixed inset-0 z-0 opacity-40 mix-blend-multiply"
        data-lg-bg-layer="home-noise"
      />
      <div className="relative z-10 mx-auto max-w-[1400px] px-6 py-12 md:px-12">
        <div className="mb-14 flex items-start justify-between gap-8">
          {/* Hero Title Section */}
          <section className="relative min-w-0 flex-1 px-2">
            <div className="absolute -left-4 top-0 hidden h-full w-1 rounded-full bg-black/5 md:block" />
            <h2 className="text-ink mb-6 text-6xl font-medium tracking-[-0.03em] md:text-8xl">
              {t.heroMonth}
              {t.heroAccent ? (
                <>
                  {" "}
                  <span className="text-ink-light font-serif italic">
                    {t.heroAccent}
                  </span>
                </>
              ) : null}
            </h2>
            <p className="text-ink-light max-w-2xl pl-1 font-mono text-lg font-normal leading-relaxed md:text-xl">
              {t.heroDescription}
            </p>
          </section>

          {/* Right: Status + Avatar */}
          <div className="shrink-0">
            <div className="flex items-center gap-6">
              <div className="hidden text-right font-mono sm:block">
                <p className="text-ink-light text-[10px] uppercase tracking-widest">
                  {t.statusLabel}
                </p>
                <p className="text-xs font-medium">{statusValue}</p>
              </div>
              {/* Avatar - links to about page */}
              <Link href={toLocalizedPath(locale, "/about")} prefetch={false}>
                <Image
                  src={SITE_AVATAR_SRC}
                  alt={t.profileAlt}
                  width={48}
                  height={48}
                  sizes="48px"
                  className="size-12 rounded-full border border-white object-cover shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05),0_2px_4px_-1px_rgba(0,0,0,0.03),inset_0_0_0_1px_rgba(255,255,255,0.5)] ring-1 ring-black/5 sepia-[0.1] transition-transform hover:scale-105"
                />
              </Link>
            </div>
          </div>
        </div>

        {/* Main content */}
        <main>
          <BentoGrid items={initialItems} deferVisibleMediaUntilIndex={8} />
          <HomeDeferredFeed
            locale={locale}
            initialCount={HOME_INITIAL_FEED_LIMIT}
            totalLimit={HOME_TOTAL_FEED_LIMIT}
          />
        </main>
      </div>
    </div>
  );
}
