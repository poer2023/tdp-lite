import { Home, Grid3X3, Search, User } from "lucide-react";
import { toLocalizedPath } from "@/lib/locale-routing";
import { IconNavItem, IconNavShell } from "@/components/ui/IconNav";

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
      <IconNavShell>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <IconNavItem
              key={tab.id}
              href={toLocalizedPath(locale, tab.path || "/")}
              icon={<Icon className="h-5 w-5" />}
              label={tab.label}
              active={isActive}
            />
          );
        })}
        <div className="liquid-nav-divider" />
        <IconNavItem
          href={toLocalizedPath(locale, "/about")}
          icon={<User className="h-5 w-5" />}
          label="About"
          active={activeTab === "about"}
        />
      </IconNavShell>
    </div>
  );
}
