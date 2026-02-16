import { Clock3, LocateFixed, Quote } from "lucide-react";
import { cn } from "@/lib/utils";
import { FloatingDock } from "./FloatingDock";
import type { FloatingDockItem } from "./types";

export interface TextMomentPaperDetailProps {
  quote: string;
  timeLabel?: string;
  locationLabel?: string;
  fragmentLabel?: string;
  className?: string;
  showDock?: boolean;
  dockItems?: FloatingDockItem[];
}

const defaultDock: FloatingDockItem[] = [
  { id: "home", icon: "home", label: "Home" },
  { id: "close", icon: "x", active: true, label: "Close" },
  { id: "share", icon: "share", label: "Share", dividerAfter: true },
  { id: "more", icon: "more", label: "More" },
];

export function TextMomentPaperDetail({
  quote,
  timeLabel = "2h ago",
  locationLabel = "Shinjuku • Tokyo",
  fragmentLabel = "Fragment 082 / Series 12",
  className,
  showDock = true,
  dockItems,
}: TextMomentPaperDetailProps) {
  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-[2rem] bg-[#e8e8e6] px-6 py-10 md:px-12 md:py-14",
        className
      )}
    >
      <div className="relative z-10">
        <div className="mx-auto w-full max-w-4xl [perspective:1000px]">
          <div className="bg-paper-off-white absolute inset-0 translate-x-2 translate-y-3 -rotate-1 rounded-3xl shadow-paper-stack" />
          <div className="bg-paper-grey absolute inset-0 -translate-x-1 translate-y-1 rotate-1 rounded-3xl opacity-50 shadow-sm" />

          <article className="relative z-10 flex min-h-[60vh] flex-col items-center justify-center overflow-hidden rounded-3xl border border-black/5 bg-paper-white shadow-paper-stack">
            <div
              className="pointer-events-none absolute inset-0 z-10"
              style={{
                boxShadow:
                  "inset 0 20px 40px -20px rgba(0,0,0,0.03), inset 20px 0 40px -20px rgba(0,0,0,0.02)",
              }}
            />
            <div className="pointer-events-none absolute right-0 top-0 h-32 w-32 bg-gradient-to-bl from-black/[0.03] to-transparent" />

            <div className="relative z-20 flex flex-1 flex-col items-center justify-center px-8 py-20 text-center md:px-24">
              <Quote className="mb-12 h-16 w-16 text-black/10" />
              <h3 className="text-ink mb-8 font-serif text-4xl italic leading-[1.15] tracking-tight md:text-6xl">
                {quote}
              </h3>
              <div className="h-px w-16 bg-black/10" />
            </div>

            <footer className="relative z-20 mt-auto w-full px-12 pb-12">
              <div className="text-ink-light/60 flex flex-col items-center justify-between gap-4 font-mono text-[11px] uppercase tracking-[0.2em] md:flex-row">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <Clock3 className="h-3.5 w-3.5" />
                    <span>{timeLabel}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <LocateFixed className="h-3.5 w-3.5" />
                    <span>{locationLabel}</span>
                  </div>
                </div>
                <div className="hidden md:block">{fragmentLabel}</div>
              </div>
            </footer>
          </article>
        </div>

        {showDock ? (
          <FloatingDock items={dockItems || defaultDock} className="mt-10" />
        ) : null}
      </div>
    </section>
  );
}
