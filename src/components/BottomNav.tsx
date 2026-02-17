import Link from "next/link";
import { Home, Grid3X3, Search, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { toLocalizedPath } from "@/lib/locale-routing";

type Tab = "home" | "gallery" | "search" | "about";

interface BottomNavProps {
  locale: string;
  activeTab: Tab;
}

const tabs: { id: Tab; icon: typeof Home; label: string; path: string }[] = [
  { id: "home", icon: Home, label: "Home", path: "" },
  { id: "gallery", icon: Grid3X3, label: "Gallery", path: "/gallery" },
  { id: "search", icon: Search, label: "Search", path: "/search" },
];

export function BottomNav({ locale, activeTab }: BottomNavProps) {
  return (
    <div className="fixed bottom-8 left-1/2 z-50 -translate-x-1/2">
      <nav className="flex items-center gap-1 rounded-full border border-white/50 bg-white/90 px-2 py-2 shadow-[0_8px_30px_rgb(0,0,0,0.12)] ring-1 ring-black/5 backdrop-blur-md">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <Link
              key={tab.id}
              href={toLocalizedPath(locale, tab.path || "/")}
              className={cn(
                "group relative flex h-11 w-11 items-center justify-center rounded-full transition-all",
                isActive
                  ? "bg-black text-white shadow-md"
                  : "text-[#666] hover:bg-black/5 hover:text-[#111]"
              )}
            >
              <Icon className="h-5 w-5" />
              {!isActive && (
                <span className="pointer-events-none absolute -top-12 rounded bg-black px-2 py-1 font-mono text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100">
                  {tab.label}
                </span>
              )}
            </Link>
          );
        })}
        <div className="mx-1 h-5 w-px bg-black/10" />
        <Link
          href={toLocalizedPath(locale, "/about")}
          className={cn(
            "group relative flex h-11 w-11 items-center justify-center rounded-full transition-all",
            activeTab === "about"
              ? "bg-black text-white shadow-md"
              : "text-[#666] hover:bg-black/5 hover:text-[#111]"
          )}
        >
          <User className="h-5 w-5" />
          {activeTab !== "about" && (
            <span className="pointer-events-none absolute -top-12 rounded bg-black px-2 py-1 font-mono text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100">
              About
            </span>
          )}
        </Link>
      </nav>
    </div>
  );
}
