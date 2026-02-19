"use client";

import Link from "next/link";
import { Languages } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";

type Locale = "en" | "zh";

const HIDDEN_PREFIXES = ["/admin", "/preview", "/test", "/api"] as const;

function isHiddenPath(pathname: string): boolean {
  return HIDDEN_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

function normalizeZhAlias(pathname: string): string {
  if (pathname === "/zh") {
    return "/";
  }
  if (pathname.startsWith("/zh/")) {
    return pathname.slice(3) || "/";
  }
  return pathname;
}

function detectLocale(pathname: string): Locale {
  if (pathname === "/en" || pathname.startsWith("/en/")) {
    return "en";
  }
  return "zh";
}

function buildTargetPath(pathname: string): string {
  const normalizedPath = normalizeZhAlias(pathname);
  const currentLocale = detectLocale(normalizedPath);

  if (currentLocale === "en") {
    if (normalizedPath === "/en") {
      return "/";
    }
    return normalizedPath.replace(/^\/en(?=\/|$)/, "") || "/";
  }

  if (normalizedPath === "/") {
    return "/en";
  }
  return `/en${normalizedPath}`;
}

export function GlobalLocaleSwitch() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const resolvedPathname = pathname || "/";

  if (isHiddenPath(resolvedPathname)) {
    return null;
  }

  const currentLocale = detectLocale(normalizeZhAlias(resolvedPathname));
  const targetPath = buildTargetPath(resolvedPathname);
  const targetQuery = searchParams.toString();
  const targetHref = targetQuery ? `${targetPath}?${targetQuery}` : targetPath;

  const text = currentLocale === "zh" ? "EN" : "中文";
  const ariaLabel =
    currentLocale === "zh" ? "Switch to English" : "切换到中文";

  return (
    <div className="fixed right-5 top-5 z-[70]">
      <Link
        href={targetHref}
        className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/85 px-3 py-1.5 font-mono text-[11px] uppercase tracking-widest text-[#333] shadow-sm backdrop-blur transition-colors hover:bg-white hover:text-[#111]"
        aria-label={ariaLabel}
      >
        <Languages className="h-3.5 w-3.5" />
        {text}
      </Link>
    </div>
  );
}
