"use client";

import { SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import type { SupportedLocale } from "@/lib/search/contracts";

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
  locale: SupportedLocale;
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

export function SearchFilters({ locale, value, onChange }: SearchFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const t =
    locale === "zh"
      ? {
          title: "高级筛选",
          show: "展开",
          hide: "收起",
          localeScope: "语言范围",
          localeAll: "全部语言",
          localeCurrent: "当前语言",
          dateFrom: "起始日期",
          dateTo: "结束日期",
          tags: "文章标签（逗号分隔）",
          tagsPlaceholder: "设计, 生活",
          location: "地点",
          locationPlaceholder: "东京",
          camera: "相机",
          cameraPlaceholder: "Fujifilm",
          lens: "镜头",
          lensPlaceholder: "23mm",
          focalLength: "焦距",
          focalLengthPlaceholder: "56mm",
          aperture: "光圈",
          aperturePlaceholder: "f/1.4",
          isoMin: "ISO 最小值",
          isoMax: "ISO 最大值",
          isoMinPlaceholder: "100",
          isoMaxPlaceholder: "3200",
        }
      : {
          title: "Advanced Filters",
          show: "Show",
          hide: "Hide",
          localeScope: "Locale Scope",
          localeAll: "All locales",
          localeCurrent: "Current locale",
          dateFrom: "Date From",
          dateTo: "Date To",
          tags: "Post Tags (comma separated)",
          tagsPlaceholder: "design, life",
          location: "Location",
          locationPlaceholder: "Tokyo",
          camera: "Camera",
          cameraPlaceholder: "Fujifilm",
          lens: "Lens",
          lensPlaceholder: "23mm",
          focalLength: "Focal Length",
          focalLengthPlaceholder: "56mm",
          aperture: "Aperture",
          aperturePlaceholder: "f/1.4",
          isoMin: "ISO Min",
          isoMax: "ISO Max",
          isoMinPlaceholder: "100",
          isoMaxPlaceholder: "3200",
        };

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
            {t.title}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="rounded-full bg-black/5 px-3 py-1 font-mono text-[11px] uppercase tracking-wider text-[#444] transition-colors hover:bg-black/10"
        >
          {isOpen ? t.hide : t.show}
        </button>
      </div>

      {isOpen ? (
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div>
            <InputLabel>{t.localeScope}</InputLabel>
            <select
              value={value.localeScope}
              onChange={(event) =>
                updateField("localeScope", event.target.value as "all" | "current")
              }
              className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-[#222] outline-none focus:border-black/30"
            >
              <option value="all">{t.localeAll}</option>
              <option value="current">{t.localeCurrent}</option>
            </select>
          </div>

          <div>
            <InputLabel>{t.dateFrom}</InputLabel>
            <input
              type="date"
              value={value.dateFrom}
              onChange={(event) => updateField("dateFrom", event.target.value)}
              className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-[#222] outline-none focus:border-black/30"
            />
          </div>

          <div>
            <InputLabel>{t.dateTo}</InputLabel>
            <input
              type="date"
              value={value.dateTo}
              onChange={(event) => updateField("dateTo", event.target.value)}
              className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-[#222] outline-none focus:border-black/30"
            />
          </div>

          <div>
            <InputLabel>{t.tags}</InputLabel>
            <input
              value={value.tags}
              onChange={(event) => updateField("tags", event.target.value)}
              placeholder={t.tagsPlaceholder}
              className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-[#222] outline-none focus:border-black/30"
            />
          </div>

          <div>
            <InputLabel>{t.location}</InputLabel>
            <input
              value={value.location}
              onChange={(event) => updateField("location", event.target.value)}
              placeholder={t.locationPlaceholder}
              className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-[#222] outline-none focus:border-black/30"
            />
          </div>

          <div>
            <InputLabel>{t.camera}</InputLabel>
            <input
              value={value.camera}
              onChange={(event) => updateField("camera", event.target.value)}
              placeholder={t.cameraPlaceholder}
              className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-[#222] outline-none focus:border-black/30"
            />
          </div>

          <div>
            <InputLabel>{t.lens}</InputLabel>
            <input
              value={value.lens}
              onChange={(event) => updateField("lens", event.target.value)}
              placeholder={t.lensPlaceholder}
              className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-[#222] outline-none focus:border-black/30"
            />
          </div>

          <div>
            <InputLabel>{t.focalLength}</InputLabel>
            <input
              value={value.focalLength}
              onChange={(event) => updateField("focalLength", event.target.value)}
              placeholder={t.focalLengthPlaceholder}
              className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-[#222] outline-none focus:border-black/30"
            />
          </div>

          <div>
            <InputLabel>{t.aperture}</InputLabel>
            <input
              value={value.aperture}
              onChange={(event) => updateField("aperture", event.target.value)}
              placeholder={t.aperturePlaceholder}
              className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-[#222] outline-none focus:border-black/30"
            />
          </div>

          <div>
            <InputLabel>{t.isoMin}</InputLabel>
            <input
              type="number"
              min={0}
              value={value.isoMin}
              onChange={(event) => updateField("isoMin", event.target.value)}
              placeholder={t.isoMinPlaceholder}
              className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-[#222] outline-none focus:border-black/30"
            />
          </div>

          <div>
            <InputLabel>{t.isoMax}</InputLabel>
            <input
              type="number"
              min={0}
              value={value.isoMax}
              onChange={(event) => updateField("isoMax", event.target.value)}
              placeholder={t.isoMaxPlaceholder}
              className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-[#222] outline-none focus:border-black/30"
            />
          </div>
        </div>
      ) : null}
    </section>
  );
}
