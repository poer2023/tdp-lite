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
import { IconNavItem, IconNavShell } from "@/components/ui/IconNav";

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
      <IconNavShell>
        {items.map((item) => (
          <div key={item.id} className="flex items-center">
            <IconNavItem
              href={item.href}
              icon={<StitchIcon name={item.icon} className={item.emphasized ? "h-6 w-6" : "h-5 w-5"} />}
              label={item.label}
              active={item.active}
              emphasized={item.emphasized}
              textClassName="text-ink-light hover:text-ink"
              tooltipTopClassName="-top-10"
              className="size-11"
            />
            {item.dividerAfter ? <div className="liquid-nav-divider" /> : null}
          </div>
        ))}
      </IconNavShell>
    </div>
  );
}
