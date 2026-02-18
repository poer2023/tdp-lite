"use client";

import { SlidersHorizontal } from "lucide-react";
import { useState } from "react";

export interface SearchFilterDraft {
  localeScope: "all" | "current";
  dateFrom: string;
  dateTo: string;
  tags: string;
  location: string;
  camera: string;
  lens: string;
  focalLength: string;
  aperture: string;
  isoMin: string;
  isoMax: string;
}

interface SearchFiltersProps {
  value: SearchFilterDraft;
  onChange: (next: SearchFilterDraft) => void;
}

function InputLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-[#666]">
      {children}
    </label>
  );
}

export function SearchFilters({ value, onChange }: SearchFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);

  const updateField = <K extends keyof SearchFilterDraft>(
    key: K,
    fieldValue: SearchFilterDraft[K]
  ) => {
    onChange({
      ...value,
      [key]: fieldValue,
    });
  };

  return (
    <section className="lg-panel-medium rounded-2xl border border-black/10 bg-white/80 p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-[#666]" />
          <p className="font-mono text-xs uppercase tracking-widest text-[#666]">
            Advanced Filters
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="rounded-full bg-black/5 px-3 py-1 font-mono text-[11px] uppercase tracking-wider text-[#444] transition-colors hover:bg-black/10"
        >
          {isOpen ? "Hide" : "Show"}
        </button>
      </div>

      {isOpen ? (
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div>
            <InputLabel>Locale Scope</InputLabel>
            <select
              value={value.localeScope}
              onChange={(event) =>
                updateField("localeScope", event.target.value as "all" | "current")
              }
              className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-[#222] outline-none focus:border-black/30"
            >
              <option value="all">All locales</option>
              <option value="current">Current locale</option>
            </select>
          </div>

          <div>
            <InputLabel>Date From</InputLabel>
            <input
              type="date"
              value={value.dateFrom}
              onChange={(event) => updateField("dateFrom", event.target.value)}
              className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-[#222] outline-none focus:border-black/30"
            />
          </div>

          <div>
            <InputLabel>Date To</InputLabel>
            <input
              type="date"
              value={value.dateTo}
              onChange={(event) => updateField("dateTo", event.target.value)}
              className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-[#222] outline-none focus:border-black/30"
            />
          </div>

          <div>
            <InputLabel>Post Tags (comma separated)</InputLabel>
            <input
              value={value.tags}
              onChange={(event) => updateField("tags", event.target.value)}
              placeholder="design, life"
              className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-[#222] outline-none focus:border-black/30"
            />
          </div>

          <div>
            <InputLabel>Location</InputLabel>
            <input
              value={value.location}
              onChange={(event) => updateField("location", event.target.value)}
              placeholder="Tokyo"
              className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-[#222] outline-none focus:border-black/30"
            />
          </div>

          <div>
            <InputLabel>Camera</InputLabel>
            <input
              value={value.camera}
              onChange={(event) => updateField("camera", event.target.value)}
              placeholder="Fujifilm"
              className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-[#222] outline-none focus:border-black/30"
            />
          </div>

          <div>
            <InputLabel>Lens</InputLabel>
            <input
              value={value.lens}
              onChange={(event) => updateField("lens", event.target.value)}
              placeholder="23mm"
              className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-[#222] outline-none focus:border-black/30"
            />
          </div>

          <div>
            <InputLabel>Focal Length</InputLabel>
            <input
              value={value.focalLength}
              onChange={(event) => updateField("focalLength", event.target.value)}
              placeholder="56mm"
              className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-[#222] outline-none focus:border-black/30"
            />
          </div>

          <div>
            <InputLabel>Aperture</InputLabel>
            <input
              value={value.aperture}
              onChange={(event) => updateField("aperture", event.target.value)}
              placeholder="f/1.4"
              className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-[#222] outline-none focus:border-black/30"
            />
          </div>

          <div>
            <InputLabel>ISO Min</InputLabel>
            <input
              type="number"
              min={0}
              value={value.isoMin}
              onChange={(event) => updateField("isoMin", event.target.value)}
              placeholder="100"
              className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-[#222] outline-none focus:border-black/30"
            />
          </div>

          <div>
            <InputLabel>ISO Max</InputLabel>
            <input
              type="number"
              min={0}
              value={value.isoMax}
              onChange={(event) => updateField("isoMax", event.target.value)}
              placeholder="3200"
              className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-[#222] outline-none focus:border-black/30"
            />
          </div>
        </div>
      ) : null}
    </section>
  );
}
