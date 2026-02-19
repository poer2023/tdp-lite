"use client";

import { Quote, Clock, MapPin } from "lucide-react";
import { cn, formatRelativeTime } from "@/lib/utils";
import type { Moment } from "@/lib/schema";

interface TextMomentDetailCardProps {
  moment: Moment;
  locale?: "en" | "zh";
  index?: number;
  className?: string;
}

export function TextMomentDetailCard({
  moment,
  locale = "en",
  index = 1,
  className,
}: TextMomentDetailCardProps) {
  const t =
    locale === "zh"
      ? {
          fragment: "片段",
        }
      : {
          fragment: "Fragment",
        };
  const locationName = moment.location?.name ?? null;

  return (
    <div className={cn("relative w-full max-w-4xl mx-auto", className)}>
      {/* Paper stack effect - background layers */}
      <div
        className={cn(
          "absolute inset-0 rounded-3xl",
          "bg-[#f4f4f2]",
          "translate-x-2 translate-y-3 -rotate-1",
          "shadow-[0_1px_1px_rgba(0,0,0,0.05),0_2px_2px_rgba(0,0,0,0.05),0_4px_4px_rgba(0,0,0,0.05),0_8px_8px_rgba(0,0,0,0.05),0_16px_16px_rgba(0,0,0,0.05)]"
        )}
      />
      <div
        className={cn(
          "absolute inset-0 rounded-3xl",
          "bg-[#e8e8e6]",
          "-translate-x-1 translate-y-1 rotate-1",
          "shadow-sm opacity-50"
        )}
      />

      {/* Main card */}
      <article
        className={cn(
          "relative rounded-3xl overflow-hidden",
          "bg-[#fdfdfd]",
          "shadow-[0_1px_1px_rgba(0,0,0,0.05),0_2px_2px_rgba(0,0,0,0.05),0_4px_4px_rgba(0,0,0,0.05),0_8px_8px_rgba(0,0,0,0.05),0_16px_16px_rgba(0,0,0,0.05)]",
          "border border-black/5",
          "min-h-[60vh] flex flex-col items-center justify-center"
        )}
      >
        {/* Paper texture gradient overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(at 0% 0%, rgba(255,255,255,0.5) 0, transparent 50%), radial-gradient(at 50% 0%, rgba(0,0,0,0.02) 0, transparent 50%)",
          }}
        />

        {/* Paper fold shadow */}
        <div
          className="absolute inset-0 pointer-events-none z-10"
          style={{
            boxShadow:
              "inset 0 20px 40px -20px rgba(0,0,0,0.03), inset 20px 0 40px -20px rgba(0,0,0,0.02)",
          }}
        />

        {/* Corner highlight */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-black/[0.03] to-transparent pointer-events-none" />

        {/* Content area */}
        <div className="relative z-20 px-8 md:px-24 py-20 text-center flex flex-col items-center flex-1 justify-center">
          {/* Quote icon */}
          <Quote className="text-black/10 w-16 h-16 mb-12" />

          {/* Main text content */}
          <h2
            className={cn(
              "font-serif text-4xl md:text-5xl lg:text-6xl",
              "leading-[1.15] italic tracking-tight",
              "text-[#1a1a1a] mb-8"
            )}
          >
            {moment.content}
          </h2>

          {/* Divider */}
          <div className="w-16 h-px bg-black/10" />
        </div>

        {/* Footer with metadata */}
        <footer className="relative z-20 w-full px-12 pb-12 mt-auto">
          <div
            className={cn(
              "flex flex-col md:flex-row items-center justify-between gap-4",
              "font-mono text-[11px] uppercase tracking-[0.2em]",
              "text-[#666666]/60"
            )}
          >
            {/* Left side - time and location */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5" />
                <span>{formatRelativeTime(moment.createdAt, locale)}</span>
              </div>
              {locationName && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{locationName}</span>
                </div>
              )}
            </div>

            {/* Right side - fragment number */}
            <div className="hidden md:block">
              <span>
                {t.fragment} {String(index).padStart(3, "0")}
              </span>
            </div>
          </div>
        </footer>
      </article>
    </div>
  );
}
