import Image from "next/image";
import {
  ArrowUpRight,
  AudioLines,
  Brush,
  Code2,
  Palette,
  Play,
  Sparkles,
  Terminal,
} from "lucide-react";
import { getPublicProfileSnapshot } from "@/lib/content/read";
import { type AppLocale } from "@/lib/locale";
import { cn, formatRelativeTime } from "@/lib/utils";
import styles from "./about.module.css";

type Locale = AppLocale;

interface AboutPageProps {
  params: Promise<{ locale: Locale }>;
}

export default async function AboutPage({ params }: AboutPageProps) {
  const { locale } = await params;
  const isZh = locale === "zh";
  const t = isZh
    ? {
        title: "工作室",
        subtitle: "与实验室",
        intro:
          "一个让理性与感性并行的混合空间。以严谨的代码与克制的美学，持续制作可被使用的数字作品。",
        chipA: "前端架构",
        chipB: "视觉设计",
        sectionLab: "实验室",
        sectionAtelier: "工作室",
        commitFrequency: "提交频率",
        year: "2024",
        less: "少",
        more: "多",
        techStack: "技术栈",
        latestPush: "最近推送",
        latestPushLabel: "仓库",
        latestPushFallback: "暂无近期代码动态",
        quote: "“没有美感的功能只是工具；没有功能的美感只是装饰。”",
        quoteBody:
          "我追求两者的交汇点：让干净的代码承载流动的体验，让审慎的设计引导复杂交互。",
        focusMix: "当前配比",
        focusMixHint: "根据最近同步的代码、聆听与探索行为生成",
        githubPulse: "GitHub 脉冲",
        recentActivity: "最近活动",
        totalCommits: "提交",
        totalPushes: "推送",
        activeWindow: "窗口",
        noActivity: "暂无近期活动",
        musicSummary: "聆听摘要",
        topArtists: "常听艺人",
        ratioCode: "代码",
        ratioListen: "聆听",
        ratioExplore: "探索",
        syncFallback: "使用最近一次成功同步",
        musicName: "Deep Focus 24'",
        musicArtist: "Ambient Works",
      }
    : {
        title: "Atelier",
        subtitle: "& Lab",
        intro:
          "A hybrid space where logic meets emotion. Creating digital artifacts through rigourous code and curated aesthetics.",
        chipA: "Frontend Arch.",
        chipB: "Visual Design",
        sectionLab: "The Lab",
        sectionAtelier: "The Atelier",
        commitFrequency: "Commit Frequency",
        year: "2024",
        less: "Less",
        more: "More",
        techStack: "Tech Stack",
        latestPush: "Latest Push",
        latestPushLabel: "Repo",
        latestPushFallback: "No recent code activity",
        quote:
          '"Function without beauty is utilitarian. Beauty without function is decoration."',
        quoteBody:
          "I strive for the intersection. Where clean code enables fluid motion, and thoughtful design guides complex interactions.",
        focusMix: "Current Mix",
        focusMixHint: "Derived from recent code, listening, and exploration",
        githubPulse: "GitHub Pulse",
        recentActivity: "Recent Activity",
        totalCommits: "Commits",
        totalPushes: "Pushes",
        activeWindow: "Window",
        noActivity: "No recent activity",
        musicSummary: "Listening Summary",
        topArtists: "Top Artists",
        ratioCode: "Code",
        ratioListen: "Listen",
        ratioExplore: "Explore",
        syncFallback: "Using the latest successful sync",
        musicName: "Deep Focus 24'",
        musicArtist: "Ambient Works",
      };

  const defaultHeatmapCells = [
    "bg-paper-grey",
    "bg-ink/20",
    "bg-ink/40",
    "bg-ink/80",
    "bg-ink",
    "bg-paper-grey",
    "bg-ink/60",
    "bg-ink/20",
    "bg-ink/90",
    "bg-paper-grey",
    "bg-ink/10",
    "bg-ink/50",
    "bg-ink/30",
    "bg-ink/70",
    "bg-paper-grey",
    "bg-ink",
    "bg-ink/40",
    "bg-ink/20",
    "bg-paper-grey",
    "bg-ink/80",
    "bg-ink/60",
    "bg-ink/10",
    "bg-paper-grey",
    "bg-ink/90",
    "bg-ink",
    "bg-ink/20",
    "bg-paper-grey",
    "bg-ink/50",
    "bg-ink/80",
    "bg-ink/30",
    "bg-paper-grey",
    "bg-ink/60",
    "bg-ink/90",
    "bg-ink/10",
    "bg-paper-grey",
    "bg-ink",
  ];

  const techPills = [
    "TypeScript",
    "React Three Fiber",
    "Next.js 14",
    "Tailwind",
    "WebGL",
    "Node.js",
    "Rust",
    "GraphQL",
  ];

  const profileSnapshot = await getPublicProfileSnapshot();
  const heatmapPalette = [
    "bg-paper-grey",
    "bg-ink/20",
    "bg-ink/40",
    "bg-ink/70",
    "bg-ink",
  ];
  const snapshotLevels = profileSnapshot?.github?.heatmapLevels ?? [];
  const heatmapCells =
    snapshotLevels.length === 0
      ? defaultHeatmapCells
      : (() => {
          const normalized = snapshotLevels
            .map((level) => {
              const safe = Number.isFinite(level) ? Math.trunc(level) : 0;
              if (safe < 0) return 0;
              if (safe > 4) return 4;
              return safe;
            })
            .slice(-36);
          while (normalized.length < 36) {
            normalized.unshift(0);
          }
          return normalized.map(
            (level) => heatmapPalette[level] ?? heatmapPalette[0]
          );
        })();
  const yearLabel =
    profileSnapshot?.syncedAt instanceof Date
      ? String(profileSnapshot.syncedAt.getUTCFullYear())
      : t.year;
  const ratioLabelMap: Record<string, string> = {
    code: t.ratioCode,
    listen: t.ratioListen,
    explore: t.ratioExplore,
  };
  const focusRatios = profileSnapshot?.derived?.ratios
    ?.filter((ratio) => ratio.value > 0)
    .map((ratio) => ({
      ...ratio,
      label: ratioLabelMap[ratio.key] ?? ratio.label,
    })) ?? [
    { key: "code", label: t.ratioCode, value: 34 },
    { key: "listen", label: t.ratioListen, value: 33 },
    { key: "explore", label: t.ratioExplore, value: 33 },
  ];
  const latestPush = profileSnapshot?.github?.recentPushes?.[0] ?? null;
  const recentPushes = profileSnapshot?.github?.recentPushes?.slice(0, 3) ?? [];
  const topArtists = profileSnapshot?.music?.topArtists?.slice(0, 3) ?? [];
  const latestTrack = profileSnapshot?.music?.recentTracks?.[0] ?? null;
  const musicName = latestTrack?.name || t.musicName;
  const musicArtist = latestTrack?.artist || t.musicArtist;
  const latestRepoName =
    latestPush?.repo.split("/").pop() ?? t.latestPushFallback;
  const latestPushMeta = latestPush
    ? `${latestPush.commitCount} ${t.totalCommits} · ${formatRelativeTime(latestPush.createdAt ?? new Date(), locale)}`
    : t.syncFallback;
  const githubUsername = profileSnapshot?.github?.username
    ? `@${profileSnapshot.github.username}`
    : t.githubPulse;
  const githubStats = [
    {
      label: t.totalCommits,
      value: profileSnapshot?.github?.totalCommits ?? 0,
    },
    {
      label: t.totalPushes,
      value: profileSnapshot?.github?.totalPushEvents ?? 0,
    },
    {
      label: t.activeWindow,
      value: profileSnapshot?.github?.windowDays ?? 0,
    },
  ];
  const musicProgressWidth = latestTrack?.durationMs
    ? `${Math.max(18, Math.min(88, Math.round((latestTrack.durationMs / 240000) * 100)))}%`
    : "34%";

  return (
    <>
      <div
        className="bg-noise pointer-events-none fixed inset-0 z-0 mix-blend-multiply"
        data-lg-bg-layer="about-noise"
      />
      <div
        className={cn(
          styles.root,
          "text-ink min-h-screen overflow-x-hidden pb-40 font-display selection:bg-black/10 selection:text-black"
        )}
        data-lg-bg-layer="about-root"
      >
        <div className="relative z-10 mx-auto max-w-[1400px] px-6 pb-8 pt-12 md:px-12 md:pt-20">
          <header className="mb-16 flex flex-col items-end justify-between gap-8 lg:flex-row">
            <div className="invisible" aria-hidden="true">
              <div className="mb-4 flex items-center gap-4">
                <span className="bg-ink inline-flex size-8 items-center justify-center rounded-full text-white">
                  <Code2 className="h-4 w-4" />
                </span>
                <span className="bg-ink/20 h-px w-12" />
                <span className="border-ink/10 text-ink inline-flex size-8 items-center justify-center rounded-full border bg-white">
                  <Palette className="h-4 w-4" />
                </span>
              </div>
              <h1
                className={
                  isZh
                    ? "font-display text-6xl font-semibold leading-[0.95] tracking-tight md:text-8xl"
                    : "font-serif text-6xl font-bold leading-[0.9] tracking-tight md:text-8xl"
                }
              >
                {t.title}
                <br />
                <span
                  className={
                    isZh
                      ? "text-ink-light pl-10 text-[0.82em] font-medium md:pl-16"
                      : "text-ink-light pl-16 font-light italic"
                  }
                >
                  {t.subtitle}
                </span>
              </h1>
            </div>

            <div className="max-w-md text-right">
              <p
                className={
                  isZh
                    ? "text-ink-light mb-6 text-base font-normal leading-relaxed md:text-lg"
                    : "text-ink-light mb-6 text-lg font-light leading-relaxed md:text-xl"
                }
              >
                {t.intro}
              </p>
              <div className="flex justify-end gap-3">
                <span
                  className={
                    isZh
                      ? "rounded-full border border-black/5 bg-white px-4 py-2 font-display text-xs tracking-[0.12em] shadow-sm"
                      : "rounded-full border border-black/5 bg-white px-4 py-2 font-mono text-xs uppercase tracking-widest shadow-sm"
                  }
                >
                  {t.chipA}
                </span>
                <span
                  className={
                    isZh
                      ? "rounded-full border border-black/5 bg-white px-4 py-2 font-display text-xs tracking-[0.12em] shadow-sm"
                      : "rounded-full border border-black/5 bg-white px-4 py-2 font-mono text-xs uppercase tracking-widest shadow-sm"
                  }
                >
                  {t.chipB}
                </span>
              </div>
            </div>
          </header>

          <div className="grid auto-rows-min grid-cols-1 gap-6 md:grid-cols-12">
            <div className="col-span-1 flex flex-col gap-6 md:col-span-4">
              <div
                className="invisible mb-2 flex items-center justify-between px-2"
                aria-hidden="true"
              >
                <h2
                  className={
                    isZh
                      ? "text-ink-light text-xs font-semibold tracking-[0.18em]"
                      : "text-ink-light font-mono text-xs font-bold uppercase tracking-[0.2em]"
                  }
                >
                  {t.sectionLab}
                </h2>
                <span className="bg-ink/10 mx-4 h-px flex-1" />
                <Terminal className="text-ink/40 h-[18px] w-[18px]" />
              </div>

              <div className={cn(styles.card, "min-h-[200px] bg-white")}>
                <div className="mb-6 flex items-start justify-between">
                  <h3 className="font-serif text-xl font-bold">
                    {t.commitFrequency}
                  </h3>
                  <span className="bg-paper-grey text-ink-light rounded px-2 py-1 font-mono text-xs">
                    {yearLabel}
                  </span>
                </div>
                <div className="flex h-full flex-wrap content-center justify-center gap-1">
                  <div className="grid w-full grid-cols-12 gap-1">
                    {heatmapCells.map((cellColor, index) => (
                      <div
                        key={`${cellColor}-${index}`}
                        className={cn(
                          styles.heatmapCell,
                          "aspect-square",
                          cellColor
                        )}
                      />
                    ))}
                  </div>
                </div>
                <div
                  className={
                    isZh
                      ? "text-ink-light mt-4 flex justify-between text-[10px]"
                      : "text-ink-light mt-4 flex justify-between font-mono text-[10px] uppercase"
                  }
                >
                  <span>{t.less}</span>
                  <span>{t.more}</span>
                </div>
              </div>

              <div className={cn(styles.card, "bg-white")}>
                <h3 className="mb-4 font-serif text-xl font-bold">
                  {t.techStack}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {techPills.map((pill) => (
                    <div key={pill} className={styles.codePill}>
                      {pill}
                    </div>
                  ))}
                </div>
              </div>

              <div
                className={cn(
                  styles.card,
                  "bg-ink group cursor-pointer text-white"
                )}
              >
                <div className="mb-8 flex items-start justify-between">
                  <div className="flex size-8 items-center justify-center rounded-full border border-white/20">
                    <ArrowUpRight className="h-4 w-4" />
                  </div>
                  <span
                    className={
                      isZh
                        ? "rounded-full border border-white/20 px-2 py-0.5 text-[10px]"
                        : "rounded-full border border-white/20 px-2 py-0.5 font-mono text-[10px] uppercase"
                    }
                  >
                    {t.latestPush}
                  </span>
                </div>
                <div className="mt-auto">
                  <h4
                    className={
                      isZh
                        ? "mb-1 text-xs text-white/60"
                        : "mb-1 font-mono text-xs text-white/60"
                    }
                  >
                    {t.latestPushLabel}
                  </h4>
                  <h3
                    className={
                      isZh
                        ? "font-display text-[1.65rem] font-semibold tracking-wide underline-offset-4 group-hover:underline"
                        : "font-serif text-2xl font-bold underline-offset-4 group-hover:underline"
                    }
                  >
                    {latestRepoName}
                  </h3>
                  <p
                    className={
                      isZh
                        ? "mt-2 text-xs text-white/65"
                        : "mt-2 font-mono text-xs text-white/65"
                    }
                  >
                    {latestPushMeta}
                  </p>
                </div>
              </div>
            </div>

            <div className="col-span-1 flex flex-col gap-6 md:col-span-4">
              <div className="mb-2 hidden h-7 items-center justify-center md:flex" />

              <div
                className={cn(
                  styles.card,
                  "bg-paper-off-white min-h-[500px] items-center justify-center py-16 text-center md:row-span-3 md:min-h-0 md:py-0"
                )}
              >
                <Sparkles className="text-ink-light mb-8 h-10 w-10" />
                <div className="mx-auto max-w-xs space-y-8 md:max-w-sm">
                  <p
                    className={
                      isZh
                        ? "text-ink font-display text-[2rem] font-semibold leading-[1.35] md:text-[2.15rem]"
                        : "text-ink font-serif text-3xl font-bold leading-tight md:text-4xl"
                    }
                  >
                    {t.quote}
                  </p>
                  <div className="bg-ink mx-auto h-px w-12" />
                  <p
                    className={
                      isZh
                        ? "text-ink-light text-sm leading-relaxed tracking-[0.02em]"
                        : "text-ink-light font-mono text-sm leading-relaxed"
                    }
                  >
                    {t.quoteBody}
                  </p>
                </div>
                <div className="mt-12">
                  <Image
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuCRiOBGnDPua7ZxTcz9X6XGT5-nFqYq77OpHNohFukSRhcj4sr9S9eBcxe7Bu3xbucEsedOX5rs3v21s3qFYCx471U_94jIg5RWYIPnt0duD9u1vgWTQV4xMwnVHvNfaAdOm2rdGtZSM7CJE68S1HM9QPSrU51dCy8rSW4IcOrY5q28cf8sdGfbdfKgYoqP7GUKW1XXThQAOhPEqy6lNWMUg8jcXjZxZei5NS01MxSsly_wSznzz-5BDiFgC1MYYjh79iVSjTuWZGID"
                    alt="Signature"
                    width={168}
                    height={48}
                    unoptimized
                    className="h-12 w-auto opacity-60 mix-blend-multiply"
                  />
                </div>
              </div>
            </div>

            <div className="col-span-1 flex flex-col gap-6 md:col-span-4">
              <div
                className="invisible mb-2 flex items-center justify-between px-2"
                aria-hidden="true"
              >
                <Brush className="text-ink/40 h-[18px] w-[18px]" />
                <span className="bg-ink/10 mx-4 h-px flex-1" />
                <h2
                  className={
                    isZh
                      ? "text-ink-light text-xs font-semibold tracking-[0.18em]"
                      : "text-ink-light font-mono text-xs font-bold uppercase tracking-[0.2em]"
                  }
                >
                  {t.sectionAtelier}
                </h2>
              </div>

              <div className={cn(styles.card, "bg-white")}>
                <div className="mb-6 flex items-center justify-between">
                  <h3 className="font-serif text-xl font-bold">{t.focusMix}</h3>
                  <span className="text-ink-light font-mono text-[10px] uppercase tracking-[0.22em]">
                    {githubUsername}
                  </span>
                </div>
                <div className="space-y-4">
                  {focusRatios.map((ratio, index) => (
                    <div key={`${ratio.key}-${index}`} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span
                          className={
                            isZh
                              ? "text-ink text-sm font-medium"
                              : "text-ink font-mono text-xs uppercase tracking-[0.18em]"
                          }
                        >
                          {ratio.label}
                        </span>
                        <span className="text-ink-light font-mono text-xs">
                          {ratio.value}%
                        </span>
                      </div>
                      <div className="bg-paper-grey h-3 overflow-hidden rounded-full">
                        <div
                          className="bg-ink h-full rounded-full transition-[width] duration-500"
                          style={{
                            width: `${Math.max(8, Math.min(100, ratio.value))}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <p
                  className={
                    isZh
                      ? "text-ink-light mt-4 text-xs"
                      : "text-ink-light mt-4 font-mono text-xs"
                  }
                >
                  {t.focusMixHint}
                </p>
              </div>

              <div className={cn(styles.card, "bg-[#111] text-white")}>
                <div className="mb-6 flex items-start justify-between">
                  <h3 className="font-serif text-xl font-bold">
                    {t.githubPulse}
                  </h3>
                  <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/45">
                    {githubUsername}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {githubStats.map((stat) => (
                    <div
                      key={stat.label}
                      className="bg-white/6 rounded-2xl px-3 py-3"
                    >
                      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/45">
                        {stat.label}
                      </p>
                      <p className="mt-2 font-serif text-2xl font-bold text-white">
                        {stat.value}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="mt-6">
                  <p
                    className={
                      isZh
                        ? "mb-3 text-xs text-white/45"
                        : "mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-white/45"
                    }
                  >
                    {t.recentActivity}
                  </p>
                  <div className="space-y-3">
                    {recentPushes.length > 0 ? (
                      recentPushes.map((push) => (
                        <div
                          key={`${push.repo}-${push.createdAt?.toISOString() ?? "unknown"}`}
                          className="flex items-center justify-between gap-4 rounded-2xl bg-white/5 px-3 py-3"
                        >
                          <div className="min-w-0">
                            <p className="truncate font-mono text-sm text-white">
                              {push.repo}
                            </p>
                            <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-white/45">
                              {push.createdAt
                                ? formatRelativeTime(push.createdAt, locale)
                                : t.syncFallback}
                            </p>
                          </div>
                          <div className="border-white/12 shrink-0 rounded-full border px-2 py-1 font-mono text-[10px] text-white/70">
                            {push.commitCount} {t.totalCommits}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-2xl bg-white/5 px-3 py-4 text-sm text-white/65">
                        {t.noActivity}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div
                className={cn(
                  styles.card,
                  "bg-gradient-to-br from-[#f8f8f8] to-[#eee]"
                )}
              >
                <div className="flex items-start gap-4">
                  <div className="bg-ink relative size-16 shrink-0 overflow-hidden rounded-lg shadow-lg">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <AudioLines className="h-7 w-7 animate-pulse text-white" />
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-4">
                      <h4 className="truncate text-sm font-bold">
                        {musicName}
                      </h4>
                      <span className="text-ink-light font-mono text-[10px] uppercase tracking-[0.2em]">
                        {t.musicSummary}
                      </span>
                    </div>
                    <p className="text-ink-light mt-1 font-mono text-xs">
                      {musicArtist}
                    </p>
                    <div className="mt-3 flex items-center gap-2">
                      <button
                        type="button"
                        className="bg-ink flex size-6 items-center justify-center rounded-full text-white transition-transform hover:scale-110"
                        aria-label="Play"
                      >
                        <Play className="h-[14px] w-[14px] fill-white text-white" />
                      </button>
                      <div className="h-1 flex-1 overflow-hidden rounded-full bg-black/10">
                        <div
                          className="bg-ink h-full rounded-full"
                          style={{ width: musicProgressWidth }}
                        />
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {topArtists.length > 0 ? (
                        topArtists.map((artist) => (
                          <span
                            key={artist.name}
                            className="border-black/8 text-ink-light rounded-full border bg-white/70 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.15em]"
                          >
                            {artist.name}
                          </span>
                        ))
                      ) : (
                        <span
                          className={
                            isZh
                              ? "text-ink-light text-xs"
                              : "text-ink-light font-mono text-[10px] uppercase tracking-[0.15em]"
                          }
                        >
                          {t.topArtists}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
