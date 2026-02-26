import Image from "next/image";
import {
  Aperture,
  ArrowUpRight,
  AudioLines,
  Brush,
  Circle,
  Code2,
  Contrast,
  Palette,
  Play,
  Sparkles,
  Terminal,
  Camera,
} from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { getPublicProfileSnapshot } from "@/lib/content/read";
import { type AppLocale } from "@/lib/locale";

export const dynamic = "force-dynamic";

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
        latestShip: "最新发布",
        projectLabel: "项目 01",
        projectName: "流体模拟",
        quote: "“没有美感的功能只是工具；没有功能的美感只是装饰。”",
        quoteBody:
          "我追求两者的交汇点：让干净的代码承载流动的体验，让审慎的设计引导复杂交互。",
        currentPalette: "当前配色",
        palettePrefix: "项目：",
        paletteProjectName: "新瑞士海报系列",
        glass: "镜头",
        lensAType: "街拍",
        lensBType: "人像",
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
        latestShip: "Latest Ship",
        projectLabel: "Project 01",
        projectName: "Fluid Simulations",
        quote:
          '"Function without beauty is utilitarian. Beauty without function is decoration."',
        quoteBody:
          "I strive for the intersection. Where clean code enables fluid motion, and thoughtful design guides complex interactions.",
        currentPalette: "Current Palette",
        palettePrefix: "Project:",
        paletteProjectName: "Neo-Swiss Poster Series",
        glass: "Glass",
        lensAType: "Street",
        lensBType: "Portrait",
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

  const palette = [
    { code: "#2C3E50", bg: "bg-[#2C3E50]", textClass: "text-white" },
    { code: "#E74C3C", bg: "bg-[#E74C3C]", textClass: "text-white" },
    { code: "#ECF0F1", bg: "bg-[#ECF0F1]", textClass: "text-ink" },
    { code: "#3498DB", bg: "bg-[#3498DB]", textClass: "text-white" },
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
          return normalized.map((level) => heatmapPalette[level] ?? heatmapPalette[0]);
        })();
  const yearLabel =
    profileSnapshot?.syncedAt instanceof Date
      ? String(profileSnapshot.syncedAt.getUTCFullYear())
      : t.year;
  const latestTrack = profileSnapshot?.music?.recentTracks?.[0] ?? null;
  const musicName = latestTrack?.name || t.musicName;
  const musicArtist = latestTrack?.artist || t.musicArtist;

  return (
    <>
      <div
        className="bg-noise pointer-events-none fixed inset-0 z-0 mix-blend-multiply"
        data-lg-bg-layer="about-noise"
      />
      <div
        className="about-soft-bg text-ink min-h-screen overflow-x-hidden pb-40 font-display selection:bg-black/10 selection:text-black"
        data-lg-bg-layer="about-root"
      >
        <div className="relative z-10 mx-auto max-w-[1400px] px-6 pb-8 pt-12 md:px-12 md:pt-20">
          <header className="mb-16 flex flex-col items-end justify-between gap-8 lg:flex-row">
            <div className="invisible" aria-hidden="true">
              <div className="mb-4 flex items-center gap-4">
                <span className="inline-flex size-8 items-center justify-center rounded-full bg-ink text-white">
                  <Code2 className="h-4 w-4" />
                </span>
                <span className="h-px w-12 bg-ink/20" />
                <span className="inline-flex size-8 items-center justify-center rounded-full border border-ink/10 bg-white text-ink">
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
                      ? "pl-10 text-[0.82em] font-medium text-ink-light md:pl-16"
                      : "pl-16 font-light italic text-ink-light"
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
                    ? "mb-6 text-base font-normal leading-relaxed text-ink-light md:text-lg"
                    : "mb-6 text-lg font-light leading-relaxed text-ink-light md:text-xl"
                }
              >
                {t.intro}
              </p>
              <div className="flex justify-end gap-3">
                <span
                  className={
                    isZh
                      ? "rounded-full border border-black/5 bg-white px-4 py-2 text-xs font-display tracking-[0.12em] shadow-sm"
                      : "rounded-full border border-black/5 bg-white px-4 py-2 text-xs font-mono uppercase tracking-widest shadow-sm"
                  }
                >
                  {t.chipA}
                </span>
                <span
                  className={
                    isZh
                      ? "rounded-full border border-black/5 bg-white px-4 py-2 text-xs font-display tracking-[0.12em] shadow-sm"
                      : "rounded-full border border-black/5 bg-white px-4 py-2 text-xs font-mono uppercase tracking-widest shadow-sm"
                  }
                >
                  {t.chipB}
                </span>
              </div>
            </div>
          </header>

          <div className="grid auto-rows-min grid-cols-1 gap-6 md:grid-cols-12">
            <div className="col-span-1 flex flex-col gap-6 md:col-span-4">
              <div className="invisible mb-2 flex items-center justify-between px-2" aria-hidden="true">
                <h2
                  className={
                    isZh
                      ? "text-xs font-semibold tracking-[0.18em] text-ink-light"
                      : "font-mono text-xs font-bold uppercase tracking-[0.2em] text-ink-light"
                  }
                >
                  {t.sectionLab}
                </h2>
                <span className="mx-4 h-px flex-1 bg-ink/10" />
                <Terminal className="h-[18px] w-[18px] text-ink/40" />
              </div>

              <div className="about-bento-card min-h-[200px] bg-white">
                <div className="mb-6 flex items-start justify-between">
                  <h3 className="font-serif text-xl font-bold">{t.commitFrequency}</h3>
                  <span className="rounded bg-paper-grey px-2 py-1 font-mono text-xs text-ink-light">
                    {yearLabel}
                  </span>
                </div>
                <div className="flex h-full flex-wrap content-center justify-center gap-1">
                  <div className="grid w-full grid-cols-12 gap-1">
                    {heatmapCells.map((cellColor, index) => (
                      <div
                        key={`${cellColor}-${index}`}
                        className={`about-heatmap-cell aspect-square ${cellColor}`}
                      />
                    ))}
                  </div>
                </div>
                <div
                  className={
                    isZh
                      ? "mt-4 flex justify-between text-[10px] text-ink-light"
                      : "mt-4 flex justify-between font-mono text-[10px] uppercase text-ink-light"
                  }
                >
                  <span>{t.less}</span>
                  <span>{t.more}</span>
                </div>
              </div>

              <div className="about-bento-card bg-white">
                <h3 className="mb-4 font-serif text-xl font-bold">{t.techStack}</h3>
                <div className="flex flex-wrap gap-2">
                  {techPills.map((pill) => (
                    <div key={pill} className="about-code-pill">
                      {pill}
                    </div>
                  ))}
                </div>
              </div>

              <div className="about-bento-card group cursor-pointer bg-ink text-white">
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
                    {t.latestShip}
                  </span>
                </div>
                <div className="mt-auto">
                  <h4
                    className={
                      isZh ? "mb-1 text-xs text-white/60" : "mb-1 font-mono text-xs text-white/60"
                    }
                  >
                    {t.projectLabel}
                  </h4>
                  <h3
                    className={
                      isZh
                        ? "font-display text-[1.65rem] font-semibold tracking-wide underline-offset-4 group-hover:underline"
                        : "font-serif text-2xl font-bold underline-offset-4 group-hover:underline"
                    }
                  >
                    {t.projectName}
                  </h3>
                </div>
              </div>
            </div>

            <div className="col-span-1 flex flex-col gap-6 md:col-span-4">
              <div className="mb-2 hidden h-7 items-center justify-center md:flex" />

              <div className="about-bento-card min-h-[500px] items-center justify-center bg-paper-off-white py-16 text-center md:row-span-3 md:min-h-0 md:py-0">
                <Sparkles className="mb-8 h-10 w-10 text-ink-light" />
                <div className="mx-auto max-w-xs space-y-8 md:max-w-sm">
                  <p
                    className={
                      isZh
                        ? "font-display text-[2rem] font-semibold leading-[1.35] text-ink md:text-[2.15rem]"
                        : "font-serif text-3xl font-bold leading-tight text-ink md:text-4xl"
                    }
                  >
                    {t.quote}
                  </p>
                  <div className="mx-auto h-px w-12 bg-ink" />
                  <p
                    className={
                      isZh
                        ? "text-sm leading-relaxed tracking-[0.02em] text-ink-light"
                        : "font-mono text-sm leading-relaxed text-ink-light"
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
              <div className="invisible mb-2 flex items-center justify-between px-2" aria-hidden="true">
                <Brush className="h-[18px] w-[18px] text-ink/40" />
                <span className="mx-4 h-px flex-1 bg-ink/10" />
                <h2
                  className={
                    isZh
                      ? "text-xs font-semibold tracking-[0.18em] text-ink-light"
                      : "font-mono text-xs font-bold uppercase tracking-[0.2em] text-ink-light"
                  }
                >
                  {t.sectionAtelier}
                </h2>
              </div>

              <div className="about-bento-card bg-white">
                <div className="mb-6 flex items-center justify-between">
                  <h3 className="font-serif text-xl font-bold">{t.currentPalette}</h3>
                  <Contrast className="h-[18px] w-[18px] text-ink-light" />
                </div>
                <div className="grid h-24 grid-cols-4 gap-2">
                  {palette.map((swatch, index) => (
                    <div
                      key={swatch.code}
                      className={`group relative h-full ${swatch.bg} ${index === 0 ? "rounded-l-xl" : ""} ${index === palette.length - 1 ? "rounded-r-xl" : ""}`}
                    >
                      <span
                        className={`absolute bottom-2 left-1 text-[8px] font-mono opacity-0 transition-opacity group-hover:opacity-100 ${swatch.textClass}`}
                      >
                        {swatch.code}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-xs font-mono text-ink-light">
                  {t.palettePrefix} <span className="text-ink">{t.paletteProjectName}</span>
                </p>
              </div>

              <div className="about-bento-card bg-[#111] text-white">
                <div className="mb-6 flex items-start justify-between">
                  <h3 className="font-serif text-xl font-bold">{t.glass}</h3>
                  <Camera className="h-[18px] w-[18px] text-white/50" />
                </div>
                <div className="space-y-4">
                  <div className="group flex cursor-pointer items-center gap-4">
                    <div className="flex size-10 items-center justify-center rounded-full bg-white/10 transition-colors group-hover:bg-white group-hover:text-black">
                      <Circle className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-mono text-sm font-bold">35mm f/1.4</p>
                      <p className="text-[10px] uppercase tracking-wider text-white/50">
                        {t.lensAType}
                      </p>
                    </div>
                  </div>
                  <div className="group flex cursor-pointer items-center gap-4">
                    <div className="flex size-10 items-center justify-center rounded-full bg-white/10 transition-colors group-hover:bg-white group-hover:text-black">
                      <Aperture className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-mono text-sm font-bold">85mm f/1.8</p>
                      <p className="text-[10px] uppercase tracking-wider text-white/50">
                        {t.lensBType}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="about-bento-card bg-gradient-to-br from-[#f8f8f8] to-[#eee]">
                <div className="flex items-start gap-4">
                  <div className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-ink shadow-lg">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <AudioLines className="h-7 w-7 animate-pulse text-white" />
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="truncate text-sm font-bold">{musicName}</h4>
                    <p className="mt-1 font-mono text-xs text-ink-light">{musicArtist}</p>
                    <div className="mt-3 flex items-center gap-2">
                      <button
                        type="button"
                        className="flex size-6 items-center justify-center rounded-full bg-ink text-white transition-transform hover:scale-110"
                        aria-label="Play"
                      >
                        <Play className="h-[14px] w-[14px] fill-white text-white" />
                      </button>
                      <div className="h-1 flex-1 overflow-hidden rounded-full bg-black/10">
                        <div className="h-full w-1/3 rounded-full bg-ink" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
        <BottomNav locale={locale} activeTab="about" />
      </div>
    </>
  );
}
