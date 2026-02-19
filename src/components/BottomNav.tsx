import { Home, Grid3X3, Search, User } from "lucide-react";
import { toLocalizedPath } from "@/lib/locale-routing";
import { IconNavItem, IconNavShell } from "@/components/ui/IconNav";

type Tab = "home" | "gallery" | "search" | "about";

interface BottomNavProps {
  locale: string;
  activeTab: Tab;
}

const tabs: { id: Tab; icon: typeof Home; path: string }[] = [
  { id: "home", icon: Home, path: "" },
  { id: "gallery", icon: Grid3X3, path: "/gallery" },
  { id: "search", icon: Search, path: "/search" },
];

export function BottomNav({ locale, activeTab }: BottomNavProps) {
  const labels =
    locale === "zh"
      ? {
          home: "首页",
          gallery: "画廊",
          search: "搜索",
          about: "关于",
        }
      : {
          home: "Home",
          gallery: "Gallery",
          search: "Search",
          about: "About",
        };

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
              label={labels[tab.id]}
              active={isActive}
            />
          );
        })}
        <div className="liquid-nav-divider" />
        <IconNavItem
          href={toLocalizedPath(locale, "/about")}
          icon={<User className="h-5 w-5" />}
          label={labels.about}
          active={activeTab === "about"}
        />
      </IconNavShell>
    </div>
  );
}
