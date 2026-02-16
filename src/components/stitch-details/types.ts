import type { ReactNode } from "react";

export type StitchIconName =
  | "home"
  | "grid"
  | "plus"
  | "search"
  | "bell"
  | "headphones"
  | "bookmark"
  | "settings"
  | "share"
  | "more"
  | "x"
  | "arrow-left"
  | "heart"
  | "play"
  | "pause"
  | "skip-next"
  | "skip-prev";

export interface FloatingDockItem {
  id: string;
  icon: StitchIconName;
  href?: string;
  label?: string;
  active?: boolean;
  emphasized?: boolean;
  dividerAfter?: boolean;
  badge?: boolean;
}

export interface FloatingDockProps {
  items: FloatingDockItem[];
  className?: string;
}

export interface DetailMetaItem {
  label: string;
  value: string;
  icon?: ReactNode;
}
