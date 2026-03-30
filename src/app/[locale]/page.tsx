import { Suspense } from "react";
import { getPublicFeed, getPublicPresence } from "@/lib/content/read";
import Image from "next/image";
import { toLocalizedPath } from "@/lib/locale-routing";
import { HomeProgressiveBentoFeed } from "@/components/home/HomeProgressiveBentoFeed";
import { PageTransitionLink } from "@/components/route-transition/PageTransitionLink";
import { RouteTransitionMarker } from "@/components/route-transition/RouteTransitionMarker";

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
  const homeInitialFeedLimit = HOME_INITIAL_FEED_LIMIT;
  const initialItems = await getPublicFeed(locale, homeInitialFeedLimit);
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
  const initialFeedKey = `${locale}:${initialItems.map((item) => item.id).join(":")}`;

  return (
    <div
      className="tdp-safe-surface text-ink bg-page-surface relative min-h-dvh overflow-x-hidden pb-[calc(7rem+var(--tdp-content-bottom-inset))] font-display selection:bg-black/10 selection:text-black md:pb-[calc(8rem+var(--tdp-content-bottom-inset))]"
      data-lg-bg-layer="home-root"
      data-route-surface="home"
    >
      <RouteTransitionMarker kind="content" surface="home" />
      <div
        className="tdp-safe-noise bg-noise pointer-events-none fixed inset-0 z-0 opacity-40 mix-blend-multiply"
        data-lg-bg-layer="home-noise"
      />
      <div className="relative z-10 mx-auto max-w-[1400px] px-5 pb-10 pt-[calc(1rem+var(--tdp-content-top-inset))] md:px-12 md:pb-12 md:pt-[calc(3rem+var(--tdp-content-top-inset))]">
        <div className="mb-10 flex items-start justify-between gap-4 md:mb-14 md:gap-8">
          {/* Hero Title Section */}
          <section className="relative min-w-0 flex-1">
            <div className="absolute -left-4 top-0 hidden h-full w-1 rounded-full bg-black/5 md:block" />
            <h2 className="text-ink mb-4 text-[3.25rem] font-medium leading-none tracking-[-0.035em] md:mb-6 md:text-8xl md:tracking-[-0.03em]">
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
            <p className="text-ink-light max-w-xl pl-0.5 font-mono text-base font-normal leading-[1.55] md:max-w-2xl md:pl-1 md:text-xl md:leading-relaxed">
              {t.heroDescription}
            </p>
          </section>

          {/* Right: Status + Avatar */}
          <div className="shrink-0">
            <div className="flex items-center gap-3 md:gap-6">
              <Suspense
                fallback={
                  <HomePresenceFallback
                    fallbackLocation={t.fallbackLocation}
                    statusLabel={t.statusLabel}
                  />
                }
              >
                <HomePresenceStatus
                  fallbackLocation={t.fallbackLocation}
                  locale={locale}
                  statusLabel={t.statusLabel}
                  statusOfflinePrefix={t.statusOfflinePrefix}
                  statusOnlinePrefix={t.statusOnlinePrefix}
                  statusUnknown={t.statusUnknown}
                />
              </Suspense>
              {/* Avatar - links to about page */}
              <PageTransitionLink
                href={toLocalizedPath(locale, "/about")}
                transitionAware
              >
                <Image
                  src={SITE_AVATAR_SRC}
                  alt={t.profileAlt}
                  width={48}
                  height={48}
                  sizes="48px"
                  className="size-11 rounded-full border border-white object-cover shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05),0_2px_4px_-1px_rgba(0,0,0,0.03),inset_0_0_0_1px_rgba(255,255,255,0.5)] ring-1 ring-black/5 sepia-[0.1] transition-transform hover:scale-105 md:size-12"
                />
              </PageTransitionLink>
            </div>
          </div>
        </div>

        {/* Main content */}
        <main>
          <HomeProgressiveBentoFeed
            key={initialFeedKey}
            initialItems={initialItems}
            locale={locale}
            initialCount={homeInitialFeedLimit}
            totalLimit={HOME_TOTAL_FEED_LIMIT}
          />
        </main>
      </div>
    </div>
  );
}

function HomePresenceFallback({
  fallbackLocation,
  statusLabel,
}: {
  fallbackLocation: string;
  statusLabel: string;
}) {
  return (
    <div className="hidden min-w-[120px] text-right font-mono sm:block">
      <p className="text-ink-light text-[10px] uppercase tracking-widest">
        {statusLabel}
      </p>
      <p className="text-xs font-medium opacity-70">··· • {fallbackLocation}</p>
    </div>
  );
}

async function HomePresenceStatus({
  fallbackLocation,
  locale,
  statusLabel,
  statusOfflinePrefix,
  statusOnlinePrefix,
  statusUnknown,
}: {
  fallbackLocation: string;
  locale: Locale;
  statusLabel: string;
  statusOfflinePrefix: string;
  statusOnlinePrefix: string;
  statusUnknown: string;
}) {
  const presence = await getPublicPresence();
  const locationLabel = (presence?.locationLabel || fallbackLocation).trim();
  const onlinePrefix =
    presence?.status === "online"
      ? statusOnlinePrefix
      : presence?.status === "offline"
        ? statusOfflinePrefix
        : statusUnknown;
  const statusValue = `${onlinePrefix} • ${locationLabel}`;

  return (
    <div className="hidden min-w-[120px] text-right font-mono sm:block">
      <p className="text-ink-light text-[10px] uppercase tracking-widest">
        {statusLabel}
      </p>
      <p className="text-xs font-medium" lang={locale === "zh" ? "zh" : "en"}>
        {statusValue}
      </p>
    </div>
  );
}
