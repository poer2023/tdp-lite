"use client";

import { CalendarDays, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GallerySourceType, GalleryTimePreset } from "@/lib/gallery";

interface GalleryFiltersProps {
  sourceTypes: GallerySourceType[];
  timePreset: GalleryTimePreset;
  onSourceTypesChange: (next: GallerySourceType[]) => void;
  onTimePresetChange: (next: GalleryTimePreset) => void;
}

const sourceOptions: Array<{ value: GallerySourceType; label: string }> = [
  { value: "post", label: "Post" },
  { value: "moment", label: "Moment" },
];

const timeOptions: Array<{ value: GalleryTimePreset; label: string }> = [
  { value: "all", label: "All" },
  { value: "today", label: "Today" },
  { value: "7d", label: "7D" },
  { value: "30d", label: "30D" },
];

export function GalleryFilters({
  sourceTypes,
  timePreset,
  onSourceTypesChange,
  onTimePresetChange,
}: GalleryFiltersProps) {
  const selected = new Set(sourceTypes);

  const toggleSource = (value: GallerySourceType) => {
    const next = new Set(sourceTypes);
    if (next.has(value)) {
      next.delete(value);
    } else {
      next.add(value);
    }

    const normalized = Array.from(next);
    if (normalized.length === 0) {
      return;
    }

    onSourceTypesChange(normalized);
  };

  return (
    <section className="rounded-2xl border border-black/10 bg-white/80 p-4 shadow-sm backdrop-blur-sm">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Filter className="h-4 w-4 text-[#666]" />
            <p className="font-mono text-[11px] uppercase tracking-widest text-[#666]">
              Sources
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {sourceOptions.map((option) => {
              const active = selected.has(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => toggleSource(option.value)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider transition-colors",
                    active
                      ? "border-[#111] bg-[#111] text-white"
                      : "border-black/10 bg-white text-[#555] hover:border-black/20"
                  )}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-[#666]" />
            <p className="font-mono text-[11px] uppercase tracking-widest text-[#666]">
              Date Range
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {timeOptions.map((option) => {
              const active = option.value === timePreset;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onTimePresetChange(option.value)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider transition-colors",
                    active
                      ? "border-[#111] bg-[#111] text-white"
                      : "border-black/10 bg-white text-[#555] hover:border-black/20"
                  )}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
