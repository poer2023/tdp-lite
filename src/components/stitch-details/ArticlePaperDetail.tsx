import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Bookmark, MapPin, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { FloatingDock } from "./FloatingDock";
import type { FloatingDockItem } from "./types";

export interface ArticlePaperDetailProps {
  title: string;
  accentTitle?: string;
  excerpt?: string;
  kicker?: string;
  publishedDate?: string;
  readingTime?: string;
  category?: string;
  location?: string;
  author?: string;
  backHref?: string;
  statusLabel?: string;
  statusValue?: string;
  avatarSrc?: string;
  content: ReactNode;
  className?: string;
  showDock?: boolean;
  dockItems?: FloatingDockItem[];
  backTitle?: string;
  backSubtitle?: string;
  publishedLabel?: string;
  readingTimeLabel?: string;
  categoryLabel?: string;
  locationLabel?: string;
  dateLabel?: string;
  readLabel?: string;
  authorLabel?: string;
}

const defaultDock: FloatingDockItem[] = [
  { id: "back", icon: "arrow-left", label: "Go Back", dividerAfter: true },
  { id: "home", icon: "home" },
  { id: "share", icon: "share" },
];

export function ArticlePaperDetail({
  title,
  accentTitle,
  excerpt,
  kicker = "Reflections",
  publishedDate = "Oct 24, 2023",
  readingTime = "5 min read",
  category = "Journal",
  location = "Shinjuku",
  author = "Alex M.",
  backHref,
  statusLabel = "Status",
  statusValue = "READING • TOKYO",
  avatarSrc,
  content,
  className,
  showDock = true,
  dockItems,
  backTitle = "Moments",
  backSubtitle = "Back to Feed",
  publishedLabel = "Published",
  readingTimeLabel = "Reading Time",
  categoryLabel = "Category",
  locationLabel = "Location",
  dateLabel = "Date",
  readLabel = "Read",
  authorLabel = "Author",
}: ArticlePaperDetailProps) {
  const titleParts = accentTitle ? [title, accentTitle] : [title];
  const skipAvatarOptimization =
    avatarSrc?.startsWith("blob:") || avatarSrc?.startsWith("data:");

  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-[2rem] bg-[#e8e8e6] px-6 py-10 md:px-12 md:py-12",
        className
      )}
    >
      <div className="relative z-10 mx-auto max-w-[1400px]">
        <header className="mb-16 flex items-center justify-between">
          <div className="group flex cursor-pointer items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg border border-black/5 bg-white shadow-paper-sm transition-colors duration-300 group-hover:border-black/20">
              {backHref ? (
                <Link href={backHref} className="inline-flex">
                  <ArrowLeft className="text-ink h-5 w-5" />
                </Link>
              ) : (
                <ArrowLeft className="text-ink h-5 w-5" />
              )}
            </div>
            <div className="flex flex-col">
              <h3 className="text-ink text-sm font-bold uppercase tracking-tight">
                {backTitle}
              </h3>
              <span className="text-ink-light font-mono text-[10px]">
                {backSubtitle}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="hidden text-right font-mono sm:block">
              <p className="text-ink-light text-[10px] uppercase tracking-widest">
                {statusLabel}
              </p>
              <p className="text-xs font-medium">{statusValue}</p>
            </div>
            {avatarSrc ? (
              <div className="size-12 overflow-hidden rounded-full border border-white shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05),0_2px_4px_-1px_rgba(0,0,0,0.03),inset_0_0_0_1px_rgba(255,255,255,0.5)] ring-1 ring-black/5">
                <Image
                  src={avatarSrc}
                  alt="Avatar"
                  width={48}
                  height={48}
                  unoptimized={Boolean(skipAvatarOptimization)}
                  className="h-full w-full object-cover sepia-[0.1]"
                />
              </div>
            ) : null}
          </div>
        </header>

        <div className="relative flex flex-col items-start justify-center gap-12 lg:flex-row">
          <aside className="hidden w-48 space-y-8 pt-8 text-right lg:sticky lg:top-32 lg:block">
            <div>
              <p className="text-ink-light mb-1 font-mono text-[10px] font-bold uppercase tracking-widest">
                {publishedLabel}
              </p>
              <p className="text-ink font-mono text-sm">{publishedDate}</p>
            </div>
            <div>
              <p className="text-ink-light mb-1 font-mono text-[10px] font-bold uppercase tracking-widest">
                {readingTimeLabel}
              </p>
              <p className="text-ink font-mono text-sm">{readingTime}</p>
            </div>
            <div>
              <p className="text-ink-light mb-1 font-mono text-[10px] font-bold uppercase tracking-widest">
                {categoryLabel}
              </p>
              <span className="text-ink inline-block rounded border border-black/5 bg-white px-2 py-1 font-mono text-xs shadow-sm">
                {category}
              </span>
            </div>
            <div>
              <p className="text-ink-light mb-1 font-mono text-[10px] font-bold uppercase tracking-widest">
                {locationLabel}
              </p>
              <div className="text-ink flex items-center justify-end gap-1 opacity-80">
                <MapPin className="h-3.5 w-3.5" />
                <p className="font-mono text-xs">{location}</p>
              </div>
            </div>
          </aside>

          <main className="relative w-full max-w-3xl">
            <div className="absolute left-2 top-2 z-0 h-full w-full rotate-1 rounded-xl border border-black/5 bg-[#fcfcfb] shadow-paper-sm" />
            <div className="absolute -left-1 top-4 z-0 h-full w-full -rotate-1 rounded-xl border border-black/5 bg-[#f8f8f6] shadow-paper-sm" />

            <article className="relative z-10 overflow-hidden rounded-xl border border-black/5 bg-paper-white shadow-[0_10px_15px_-3px_rgba(0,0,0,0.05),0_4px_6px_-2px_rgba(0,0,0,0.025),inset_0_0_0_1px_rgba(255,255,255,0.8)]">
              <div className="bg-paper-off-white relative border-b border-black/5 px-8 pb-12 pt-20 md:px-16">
                <div
                  className="absolute inset-0 opacity-[0.03]"
                  style={{
                    backgroundImage:
                      "radial-gradient(#000 0.5px, transparent 0.5px)",
                    backgroundSize: "12px 12px",
                  }}
                />
                <div className="relative z-10 text-center">
                  <div className="mb-6 inline-flex items-center gap-2">
                    <span className="bg-ink size-1.5 rounded-full" />
                    <span className="text-ink-light font-mono text-xs uppercase tracking-widest">
                      {kicker}
                    </span>
                    <span className="bg-ink size-1.5 rounded-full" />
                  </div>

                  <h1 className="text-ink mb-6 font-serif text-5xl font-medium leading-[1.1] tracking-tight md:text-7xl">
                    {titleParts[0]}
                    {titleParts[1] ? (
                      <>
                        <br />
                        <span className="text-ink-light italic">
                          {titleParts[1]}
                        </span>
                      </>
                    ) : null}
                  </h1>

                  {excerpt ? (
                    <p className="text-ink-light mx-auto max-w-lg text-lg font-light leading-relaxed">
                      {excerpt}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="px-8 py-12 md:px-16 md:py-16">
                <div className="mb-10 flex flex-wrap gap-4 border-b border-black/5 pb-8 lg:hidden">
                  <div className="flex items-center gap-2">
                    <span className="text-ink-light font-mono text-[10px] uppercase">
                      {dateLabel}
                    </span>
                    <span className="text-ink font-mono text-xs">
                      {publishedDate}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-ink-light font-mono text-[10px] uppercase">
                      {readLabel}
                    </span>
                    <span className="text-ink font-mono text-xs">
                      {readingTime}
                    </span>
                  </div>
                </div>

                <div className="prose prose-lg prose-p:font-display prose-p:text-ink/80 prose-headings:font-serif max-w-none">
                  {content}
                </div>

                <div className="mt-16 flex items-end justify-between border-t border-dashed border-black/10 pt-8">
                  <div>
                    <div className="text-ink-light mb-1 font-mono text-xs">
                      {authorLabel}
                    </div>
                    <div className="text-ink font-serif text-lg italic">
                      {author}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="text-ink-light flex size-8 items-center justify-center rounded border border-black/10 transition-colors hover:bg-black hover:text-white"
                    >
                      <Bookmark className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      className="text-ink-light flex size-8 items-center justify-center rounded border border-black/10 transition-colors hover:bg-black hover:text-white"
                    >
                      <Share2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </article>
          </main>
        </div>

        {showDock ? (
          <FloatingDock items={dockItems || defaultDock} className="mt-10" />
        ) : null}
      </div>
    </section>
  );
}
