import Link from "next/link";
import {
  ArrowLeft,
  Bell,
  Bookmark,
  Grid3X3,
  Headphones,
  Heart,
  Home,
  MoreHorizontal,
  Pause,
  Play,
  Plus,
  Search,
  Settings,
  Share2,
  SkipBack,
  SkipForward,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { FloatingDockProps, StitchIconName } from "./types";

function StitchIcon({
  name,
  className,
}: {
  name: StitchIconName;
  className?: string;
}) {
  const iconClass = cn("h-5 w-5", className);
  switch (name) {
    case "home":
      return <Home className={iconClass} />;
    case "grid":
      return <Grid3X3 className={iconClass} />;
    case "plus":
      return <Plus className={iconClass} />;
    case "search":
      return <Search className={iconClass} />;
    case "bell":
      return <Bell className={iconClass} />;
    case "headphones":
      return <Headphones className={iconClass} />;
    case "bookmark":
      return <Bookmark className={iconClass} />;
    case "settings":
      return <Settings className={iconClass} />;
    case "share":
      return <Share2 className={iconClass} />;
    case "more":
      return <MoreHorizontal className={iconClass} />;
    case "x":
      return <X className={iconClass} />;
    case "heart":
      return <Heart className={iconClass} />;
    case "play":
      return <Play className={iconClass} />;
    case "pause":
      return <Pause className={iconClass} />;
    case "skip-next":
      return <SkipForward className={iconClass} />;
    case "skip-prev":
      return <SkipBack className={iconClass} />;
    case "arrow-left":
      return <ArrowLeft className={iconClass} />;
    default:
      return <Home className={iconClass} />;
  }
}

export function FloatingDock({ items, className }: FloatingDockProps) {
  return (
    <div className={cn("mt-8 flex justify-center", className)}>
      <nav className="flex items-center gap-1 rounded-full border border-white/50 bg-white/85 px-2 py-2 shadow-[0_8px_30px_rgb(0,0,0,0.12)] ring-1 ring-black/5 backdrop-blur-md">
        {items.map((item) => {
          const baseItemClass = cn(
            "group relative flex size-11 items-center justify-center rounded-full transition-all",
            item.emphasized
              ? "size-12 bg-ink text-white shadow-md hover:scale-[1.03]"
              : item.active
                ? "bg-black text-white shadow-md"
                : "text-ink-light hover:bg-black/5 hover:text-ink"
          );

          const content = (
            <>
              <StitchIcon
                name={item.icon}
                className={item.emphasized ? "h-6 w-6" : "h-5 w-5"}
              />
              {item.label && !item.emphasized ? (
                <span className="pointer-events-none absolute -top-10 whitespace-nowrap rounded bg-black px-2 py-1 font-mono text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100">
                  {item.label}
                </span>
              ) : null}
              {item.badge ? (
                <span className="absolute right-2.5 top-2.5 size-1.5 rounded-full border border-white bg-red-400" />
              ) : null}
            </>
          );

          return (
            <div key={item.id} className="flex items-center">
              {item.href ? (
                <Link href={item.href} className={baseItemClass}>
                  {content}
                </Link>
              ) : (
                <button type="button" className={baseItemClass}>
                  {content}
                </button>
              )}
              {item.dividerAfter ? (
                <div className="mx-1 h-5 w-px bg-black/10" />
              ) : null}
            </div>
          );
        })}
      </nav>
    </div>
  );
}
