"use client";

import { Search, X } from "lucide-react";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  clearLabel?: string;
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Search posts, moments, gallery metadata...",
  clearLabel = "Clear search",
}: SearchInputProps) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-light" />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-black/10 bg-paper-white/90 py-3 pl-11 pr-11 text-sm text-ink shadow-sm outline-none transition-all focus:border-black/30 focus:ring-2 focus:ring-black/5 dark:border-white/14 dark:bg-[rgba(43,51,64,0.9)] dark:focus:border-white/24 dark:focus:ring-white/10"
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-ink-light transition-colors hover:bg-black/5 hover:text-ink dark:hover:bg-white/8"
          aria-label={clearLabel}
        >
          <X className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}
