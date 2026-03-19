"use client";

import { usePathname } from "next/navigation";
import { BottomNav } from "@/components/BottomNav";

type Locale = "en" | "zh";
type Tab = "home" | "gallery" | "search" | "about";

const HIDDEN_PREFIXES = ["/admin", "/preview", "/test"] as const;

function isHiddenPath(pathname: string): boolean {
  return HIDDEN_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

function detectLocale(pathname: string): Locale {
  if (pathname === "/en" || pathname.startsWith("/en/")) {
    return "en";
  }
  return "zh";
}

function stripLocalePrefix(pathname: string): string {
  return pathname.replace(/^\/en(?=\/|$)/, "") || "/";
}

function resolveActiveTab(pathname: string): Tab {
  if (pathname === "/gallery" || pathname.startsWith("/gallery/")) {
    return "gallery";
  }
  if (pathname === "/search") {
    return "search";
  }
  if (pathname === "/about") {
    return "about";
  }
  return "home";
}

export function AppChrome() {
  const pathname = usePathname() || "/";

  if (isHiddenPath(pathname)) {
    return null;
  }

  const locale = detectLocale(pathname);
  const normalizedPath = stripLocalePrefix(pathname);
  const activeTab = resolveActiveTab(normalizedPath);

  return <BottomNav locale={locale} activeTab={activeTab} />;
}
