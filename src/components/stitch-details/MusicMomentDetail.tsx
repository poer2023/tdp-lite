"use client";

import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Bookmark,
  Heart,
  Pause,
  Play,
  Share2,
  SkipBack,
  SkipForward,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FloatingDock } from "./FloatingDock";
import type { FloatingDockItem } from "./types";

export interface MusicMomentDetailProps {
  title: string;
  artist: string;
  album?: string;
  sourceId?: string;
  coverImage: string;
  annotation?: string;
  fileMeta?: string[];
  geoMeta?: string[];
  progress?: number;
  currentTime?: string;
  duration?: string;
  className?: string;
  showDock?: boolean;
  dockItems?: FloatingDockItem[];
  waveform?: number[];
}

const defaultDock: FloatingDockItem[] = [
  { id: "home", icon: "home" },
  { id: "audio", icon: "headphones", active: true },
  { id: "saved", icon: "bookmark", dividerAfter: true },
  { id: "settings", icon: "settings" },
];

export function MusicMomentDetail({
  title,
  artist,
  album = "Unknown album",
  sourceId = "AUDIO_MOMENT_001",
  coverImage,
  annotation,
  fileMeta,
  geoMeta,
  progress = 0.7,
  currentTime = "2:58",
  duration = "4:03",
  className,
  showDock = true,
  dockItems,
  waveform,
}: MusicMomentDetailProps) {
  const [isPlaying, setIsPlaying] = useState(true);
  const bars = useMemo(
    () =>
      waveform || [
        16, 24, 40, 32, 48, 28, 40, 36, 44, 30, 24, 38, 20, 34, 28, 16,
      ],
    [waveform]
  );
  const activeBars = Math.max(1, Math.floor(bars.length * progress));
  const safeProgress = Math.max(0, Math.min(progress, 1));

  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-[2rem] bg-[#e8e8e6] px-6 py-8 md:px-10 md:py-10",
        className
      )}
    >
      <div className="relative z-10 mx-auto flex min-h-[760px] max-w-[1200px] flex-col">
        <header className="mb-12 flex items-center justify-between">
          <button
            type="button"
            className="text-ink-light hover:text-ink group inline-flex items-center gap-2 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="font-mono text-xs uppercase tracking-widest">
              Back to Feed
            </span>
          </button>
          <div className="flex items-center gap-6">
            <div className="hidden text-right font-mono md:block">
              <p className="text-ink-light text-[10px] uppercase tracking-widest">
                Source
              </p>
              <p className="text-xs font-medium">{sourceId}</p>
            </div>
            <div className="size-10 rotate-3 overflow-hidden rounded-lg border border-white shadow-sm">
              <img
                src={coverImage}
                alt="Profile"
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        </header>

        <main className="flex flex-1 items-center justify-center py-6">
          <div className="relative w-full max-w-4xl overflow-hidden rounded-3xl border border-black/5 bg-paper-white p-8 shadow-paper-stack md:p-12 lg:flex lg:gap-12">
            <div className="flex flex-1 flex-col items-center justify-center">
              <div className="relative h-64 w-64 [perspective:1000px] md:h-80 md:w-80">
                <div
                  className={cn(
                    "absolute inset-0 rounded-full border-4 border-black/10",
                    "flex items-center justify-center",
                    isPlaying ? "animate-[spin_12s_linear_infinite]" : ""
                  )}
                  style={{
                    background:
                      "repeating-radial-gradient(circle at center, #121212 0, #121212 2px, #1a1a1a 4px, #121212 5px)",
                    boxShadow: "0 20px 50px rgba(0,0,0,0.3)",
                  }}
                >
                  <div className="relative size-24 overflow-hidden rounded-full border-2 border-black/20 md:size-32">
                    <img
                      src={coverImage}
                      alt="Album Art"
                      className="h-full w-full object-cover grayscale-[0.3]"
                    />
                    <div className="absolute inset-0 bg-black/10" />
                    <div className="absolute left-1/2 top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border border-black/10 bg-paper-white shadow-inner" />
                  </div>
                </div>

                {fileMeta && fileMeta.length > 0 ? (
                  <div className="text-ink-light absolute -right-4 -top-4 z-20 rounded border border-black/5 bg-white/80 px-3 py-2 font-mono text-[10px] shadow-sm backdrop-blur">
                    {fileMeta.map((line) => (
                      <p key={line}>{line}</p>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="mt-12 flex h-12 w-full items-end justify-center gap-1">
                {bars.map((bar, index) => (
                  <div
                    key={`bar-${index}`}
                    className={cn(
                      "w-1 rounded-full transition-all duration-300",
                      index < activeBars ? "bg-black/60" : "bg-black/10"
                    )}
                    style={{ height: `${bar}px` }}
                  />
                ))}
              </div>
            </div>

            <div className="mt-10 flex flex-1 flex-col justify-center lg:mt-0">
              <div className="mb-10">
                <div className="mb-4 flex items-center gap-2">
                  <span className="rounded bg-black px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-white">
                    Now Playing
                  </span>
                  <span className="text-ink-light font-mono text-[10px] uppercase tracking-widest">
                    {duration}
                  </span>
                </div>
                <h2 className="text-ink mb-2 text-5xl font-bold tracking-tight md:text-6xl">
                  {title}
                </h2>
                <p className="text-ink-light mb-6 text-2xl font-light">
                  {artist}
                </p>
                <div className="flex items-center gap-4 border-y border-black/5 py-4">
                  <span className="text-ink-light font-mono text-xs uppercase tracking-wide">
                    {album}
                  </span>
                </div>
              </div>

              <div className="space-y-8">
                <div className="pt-1">
                  <div className="h-1 overflow-hidden rounded bg-black/5">
                    <div
                      className="bg-ink h-full"
                      style={{ width: `${safeProgress * 100}%` }}
                    />
                  </div>
                  <div className="text-ink-light mt-2 flex justify-between font-mono text-[10px]">
                    <span>{currentTime}</span>
                    <span>{duration}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-8">
                    <button
                      type="button"
                      className="text-ink-light hover:text-ink transition-colors"
                    >
                      <SkipBack className="h-7 w-7" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsPlaying((value) => !value)}
                      className="bg-ink flex size-16 items-center justify-center rounded-full text-white shadow-lg transition-transform hover:scale-105"
                    >
                      {isPlaying ? (
                        <Pause className="h-8 w-8" />
                      ) : (
                        <Play className="h-8 w-8" />
                      )}
                    </button>
                    <button
                      type="button"
                      className="text-ink-light hover:text-ink transition-colors"
                    >
                      <SkipForward className="h-7 w-7" />
                    </button>
                  </div>
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      className="text-ink-light hover:text-ink transition-colors"
                    >
                      <Share2 className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      className="text-ink-light hover:text-ink transition-colors"
                    >
                      <Heart className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>

        <footer className="mt-12 flex flex-wrap items-end justify-between gap-6 pb-8">
          <div className="max-w-md">
            <p className="text-ink-light mb-2 font-mono text-[10px] uppercase tracking-widest">
              Annotation
            </p>
            <p className="text-ink-light text-sm leading-relaxed">
              {annotation ||
                "Captured during a late-night walk through Shinjuku. The neon lights reflected against the damp pavement perfectly matched the synth-wave progression of this track."}
            </p>
          </div>
          {geoMeta && geoMeta.length > 0 ? (
            <div className="text-ink-light/60 space-y-1 text-right font-mono text-[10px]">
              {geoMeta.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
          ) : null}
        </footer>

        {showDock ? <FloatingDock items={dockItems || defaultDock} /> : null}
      </div>
    </section>
  );
}
