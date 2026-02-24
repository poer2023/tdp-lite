"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Home,
  Grid3X3,
  Moon,
  Search,
  Sun,
  User,
  Wrench,
  X,
} from "lucide-react";
import { IconNavItem, IconNavShell } from "@/components/ui/IconNav";
import { cn } from "@/lib/utils";
import { usePreviewDockContext } from "@/components/bento/PreviewDockContext";

type Tab = "home" | "gallery" | "search" | "about";

interface BottomNavProps {
  locale: string;
  activeTab: Tab;
}

interface TabConfig {
  id: Tab;
  icon: typeof Home;
  label: string;
  path: string;
  showInMainNav?: boolean;
}

function LocaleToggleGlyph({ toLocale }: { toLocale: "en" | "zh" }) {
  if (toLocale === "en") {
    return (
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="h-5 w-5"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <text
          x="12"
          y="15.5"
          textAnchor="middle"
          fontSize="10"
          fontWeight="700"
          letterSpacing="0.2"
          fill="currentColor"
          style={{ fontFamily: "Space Grotesk, sans-serif" }}
        >
          EN
        </text>
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <text
        x="12"
        y="15.5"
        textAnchor="middle"
        fontSize="12"
        fontWeight="600"
        fill="currentColor"
        style={{
          fontFamily:
            "'PingFang SC', 'Hiragino Sans GB', 'Noto Sans SC', 'Microsoft YaHei', sans-serif",
        }}
      >
        中
      </text>
    </svg>
  );
}

const tabs: TabConfig[] = [
  { id: "home", icon: Home, label: "Home", path: "" },
  // Gallery route and implementation are intentionally retained, but hidden from main nav for now.
  { id: "gallery", icon: Grid3X3, label: "Gallery", path: "/gallery", showInMainNav: false },
  { id: "search", icon: Search, label: "Search", path: "/search" },
];

const THEME_STORAGE_KEY = "tdp-theme-preference";

export function BottomNav({ locale, activeTab }: BottomNavProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const previewDockContext = usePreviewDockContext();
  const previewDock = previewDockContext?.state;
  const isPreviewMode = Boolean(previewDock?.isActive);
  const rootRef = useRef<HTMLDivElement>(null);
  const homeCollapsedMeasureRef = useRef<HTMLDivElement>(null);
  const homeExpandedMeasureRef = useRef<HTMLDivElement>(null);
  const previewMeasureRef = useRef<HTMLDivElement>(null);
  const [homeCollapsedWidth, setHomeCollapsedWidth] = useState<number | null>(null);
  const [homeExpandedWidth, setHomeExpandedWidth] = useState<number | null>(null);
  const [previewWidth, setPreviewWidth] = useState<number | null>(null);
  const [animatedWidth, setAnimatedWidth] = useState<number | null>(null);
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const [themeMode, setThemeMode] = useState<"light" | "dark">("light");
  type LayerVisualState = "shown" | "entering" | "exiting" | "hidden";
  const [homeLayerState, setHomeLayerState] = useState<LayerVisualState>("shown");
  const [previewLayerState, setPreviewLayerState] =
    useState<LayerVisualState>("hidden");
  const homeLayerStateRef = useRef<LayerVisualState>("shown");
  const previewLayerStateRef = useRef<LayerVisualState>("hidden");
  const transitionTimersRef = useRef<number[]>([]);

  const EXIT_MS = 180;
  const ENTER_MS = 180;

  useEffect(() => {
    homeLayerStateRef.current = homeLayerState;
  }, [homeLayerState]);

  useEffect(() => {
    previewLayerStateRef.current = previewLayerState;
  }, [previewLayerState]);

  const clearTransitionTimers = useCallback(() => {
    transitionTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    transitionTimersRef.current = [];
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    root.classList.add("bottom-nav-ready");
  }, []);

  useEffect(() => {
    const target = homeCollapsedMeasureRef.current;
    if (!target) return;

    const update = () => setHomeCollapsedWidth(target.getBoundingClientRect().width);
    update();

    const observer = new ResizeObserver(update);
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const target = homeExpandedMeasureRef.current;
    if (!target) return;

    const update = () => setHomeExpandedWidth(target.getBoundingClientRect().width);
    update();

    const observer = new ResizeObserver(update);
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const target = previewMeasureRef.current;
    if (!target) return;

    const update = () => setPreviewWidth(target.getBoundingClientRect().width);
    update();

    const observer = new ResizeObserver(update);
    observer.observe(target);
    return () => observer.disconnect();
  }, [previewDock?.currentIndex, previewDock?.total]);

  const applyTheme = useCallback((nextTheme: "light" | "dark") => {
    if (typeof document === "undefined") {
      return;
    }
    const root = document.documentElement;
    const isDark = nextTheme === "dark";
    root.classList.toggle("dark", isDark);
    root.classList.toggle("light", !isDark);
    root.style.colorScheme = isDark ? "dark" : "light";
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    setThemeMode(nextTheme);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (storedTheme === "dark" || storedTheme === "light") {
      applyTheme(storedTheme);
      return;
    }

    const root = document.documentElement;
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const hasDarkClass = root.classList.contains("dark");
    const initialTheme: "light" | "dark" =
      hasDarkClass || prefersDark ? "dark" : "light";
    applyTheme(initialTheme);
  }, [applyTheme]);

  useEffect(() => {
    if (!isToolsOpen) {
      return;
    }

    const onPointerDown = (event: PointerEvent) => {
      const root = rootRef.current;
      const targetNode = event.target as Node | null;
      if (!root || !targetNode) {
        return;
      }
      if (root.contains(targetNode)) {
        return;
      }
      setIsToolsOpen(false);
    };

    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [isToolsOpen]);

  useEffect(() => {
    if (!isPreviewMode || !isToolsOpen) {
      return;
    }
    setIsToolsOpen(false);
  }, [isPreviewMode, isToolsOpen]);

  useEffect(() => {
    if (animatedWidth !== null) return;
    const currentHomeWidth = isToolsOpen
      ? homeExpandedWidth ?? homeCollapsedWidth
      : homeCollapsedWidth ?? homeExpandedWidth;
    const initialWidth = isPreviewMode
      ? previewWidth ?? currentHomeWidth
      : currentHomeWidth ?? previewWidth;
    if (initialWidth) {
      setAnimatedWidth(initialWidth);
    }
  }, [
    animatedWidth,
    homeCollapsedWidth,
    homeExpandedWidth,
    isPreviewMode,
    isToolsOpen,
    previewWidth,
  ]);

  useEffect(() => {
    const currentHomeWidth = isToolsOpen
      ? homeExpandedWidth ?? homeCollapsedWidth
      : homeCollapsedWidth ?? homeExpandedWidth;
    const desiredWidth = isPreviewMode
      ? previewWidth ?? currentHomeWidth
      : currentHomeWidth ?? previewWidth;
    if (!desiredWidth) {
      return;
    }

    clearTransitionTimers();

    if (isPreviewMode) {
      if (
        previewLayerStateRef.current === "shown" ||
        previewLayerStateRef.current === "entering"
      ) {
        setAnimatedWidth(desiredWidth);
        return;
      }

      setAnimatedWidth(desiredWidth);
      setHomeLayerState((previous) =>
        previous === "hidden" ? "hidden" : "exiting"
      );
      setPreviewLayerState("hidden");

      const exitTimer = window.setTimeout(() => {
        setHomeLayerState("hidden");
        setPreviewLayerState("entering");

        const enterTimer = window.setTimeout(() => {
          setPreviewLayerState("shown");
        }, ENTER_MS);
        transitionTimersRef.current.push(enterTimer);
      }, EXIT_MS);
      transitionTimersRef.current.push(exitTimer);
      return;
    }

    if (
      homeLayerStateRef.current === "shown" ||
      homeLayerStateRef.current === "entering"
    ) {
      setAnimatedWidth(desiredWidth);
      return;
    }

    setAnimatedWidth(desiredWidth);
    setPreviewLayerState((previous) =>
      previous === "hidden" ? "hidden" : "exiting"
    );
    setHomeLayerState("hidden");

    const exitTimer = window.setTimeout(() => {
      setPreviewLayerState("hidden");
      setHomeLayerState("entering");

      const enterTimer = window.setTimeout(() => {
        setHomeLayerState("shown");
      }, ENTER_MS);
      transitionTimersRef.current.push(enterTimer);
    }, EXIT_MS);
    transitionTimersRef.current.push(exitTimer);
  }, [
    ENTER_MS,
    EXIT_MS,
    clearTransitionTimers,
    homeCollapsedWidth,
    homeExpandedWidth,
    isPreviewMode,
    isToolsOpen,
    previewWidth,
  ]);

  useEffect(() => {
    return () => clearTransitionTimers();
  }, [clearTransitionTimers]);

  const previewCounter = `${previewDock?.currentIndex ?? 1}/${previewDock?.total ?? 1}`;
  const canCycle = Boolean(previewDock?.canCycle);
  const normalizedLocale = locale === "en" ? "en" : "zh";
  const nextLocale = normalizedLocale === "zh" ? "en" : "zh";
  const localeButtonAriaLabel =
    normalizedLocale === "zh" ? "Switch to English" : "切换到中文";
  const currentPath = pathname || `/${locale}`;
  const localePrefixPattern = /^\/(en|zh)(?=\/|$)/;
  const pathWithoutLocalePrefix = currentPath.replace(localePrefixPattern, "") || "/";
  const targetLocalePath =
    nextLocale === "zh"
      ? `/zh${pathWithoutLocalePrefix === "/" ? "" : pathWithoutLocalePrefix}`
      : `/en${pathWithoutLocalePrefix === "/" ? "" : pathWithoutLocalePrefix}`;
  const targetQuery = searchParams.toString();
  const localeTargetHref = targetQuery
    ? `${targetLocalePath}?${targetQuery}`
    : targetLocalePath;
  const themeButtonAriaLabel =
    themeMode === "dark" ? "Switch to light mode" : "切换深色主题";
  const toolsTriggerAriaLabel = isToolsOpen ? "收起工具栏" : "展开工具栏";

  const iconButtonClass = cn(
    "bottom-nav-icon-button inline-flex h-11 w-11 items-center justify-center rounded-full text-[#666] transition-all hover:bg-black/5 hover:text-[#111]",
    "disabled:cursor-not-allowed disabled:opacity-35"
  );
  const localeButtonClass =
    "bottom-nav-icon-button inline-flex h-11 w-11 items-center justify-center rounded-full text-[#666] transition-all hover:bg-black/5 hover:text-[#111]";
  const toolsPanelClass = cn(
    "inline-flex items-center gap-1 overflow-hidden transition-[max-width,opacity,transform] duration-260 ease-[cubic-bezier(0.22,1,0.36,1)]",
    isToolsOpen
      ? "max-w-[112px] opacity-100 translate-x-0"
      : "pointer-events-none max-w-0 opacity-0 translate-x-1"
  );
  const layerBaseClass =
    "absolute inset-0 flex items-center justify-center gap-1 transition-[opacity,transform,filter] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]";
  const previewLayerClass = cn(layerBaseClass, {
    "pointer-events-auto opacity-100 scale-100 blur-0":
      previewLayerState === "shown",
    "pointer-events-none opacity-100 scale-100 blur-0":
      previewLayerState === "entering",
    "pointer-events-none opacity-0 scale-[0.92] blur-[2px]":
      previewLayerState === "hidden" || previewLayerState === "exiting",
  });
  const navLayerClass = cn(layerBaseClass, {
    "pointer-events-auto opacity-100 scale-100 blur-0": homeLayerState === "shown",
    "pointer-events-none opacity-100 scale-100 blur-0":
      homeLayerState === "entering",
    "pointer-events-none opacity-0 scale-[0.92] blur-[2px]":
      homeLayerState === "hidden" || homeLayerState === "exiting",
  });
  const rootZClass =
    isPreviewMode || previewLayerState !== "hidden" || homeLayerState === "exiting"
      ? "z-[85]"
      : "z-50";
  const toggleToolsPanel = () => setIsToolsOpen((previous) => !previous);
  const toggleTheme = () => {
    const nextTheme = themeMode === "dark" ? "light" : "dark";
    applyTheme(nextTheme);
  };

  return (
    <>
      <div className="pointer-events-none fixed -left-[9999px] -top-[9999px] opacity-0" aria-hidden>
        <div
          ref={homeCollapsedMeasureRef}
          className="inline-flex items-center gap-1 rounded-full border border-[rgba(255,255,255,0.38)] bg-[rgba(255,255,255,0.78)] px-2 py-2 shadow-[0_8px_30px_rgb(0,0,0,0.12)] ring-1 ring-[rgba(0,0,0,0.05)]"
        >
          <div className="inline-flex items-center gap-1">
            {tabs.filter((tab) => tab.showInMainNav !== false).map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <IconNavItem
                  key={`measure-${tab.id}`}
                  href={`/${locale}${tab.path}`}
                  icon={<Icon className="h-5 w-5" />}
                  label={tab.label}
                  active={isActive}
                />
              );
            })}
            <IconNavItem
              href={`/${locale}/about`}
              icon={<User className="h-5 w-5" />}
              label="About"
              active={activeTab === "about"}
            />
          </div>
          <div className="bottom-nav-divider" />
          <div className="inline-flex items-center gap-1">
            <button
              type="button"
              aria-label={toolsTriggerAriaLabel}
              className={iconButtonClass}
            >
              <Wrench className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div
          ref={homeExpandedMeasureRef}
          className="mt-3 inline-flex items-center gap-1 rounded-full border border-[rgba(255,255,255,0.38)] bg-[rgba(255,255,255,0.78)] px-2 py-2 shadow-[0_8px_30px_rgb(0,0,0,0.12)] ring-1 ring-[rgba(0,0,0,0.05)]"
        >
          <div className="inline-flex items-center gap-1">
            {tabs.filter((tab) => tab.showInMainNav !== false).map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <IconNavItem
                  key={`measure-expanded-${tab.id}`}
                  href={`/${locale}${tab.path}`}
                  icon={<Icon className="h-5 w-5" />}
                  label={tab.label}
                  active={isActive}
                />
              );
            })}
            <IconNavItem
              href={`/${locale}/about`}
              icon={<User className="h-5 w-5" />}
              label="About"
              active={activeTab === "about"}
            />
          </div>
          <div className="bottom-nav-divider" />
          <div className="inline-flex items-center gap-1">
            <button
              type="button"
              aria-label={toolsTriggerAriaLabel}
              className={iconButtonClass}
            >
              <Wrench className="h-4 w-4" />
            </button>
            <Link
              href={localeTargetHref}
              aria-label={localeButtonAriaLabel}
              className={localeButtonClass}
            >
              <LocaleToggleGlyph toLocale={nextLocale} />
            </Link>
            <button
              type="button"
              aria-label={themeButtonAriaLabel}
              className={iconButtonClass}
            >
              {themeMode === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        <div
          ref={previewMeasureRef}
          className="mt-3 inline-flex items-center gap-1 rounded-full border border-[rgba(255,255,255,0.38)] bg-[rgba(255,255,255,0.78)] px-2 py-2 shadow-[0_8px_30px_rgb(0,0,0,0.12)] ring-1 ring-[rgba(0,0,0,0.05)]"
        >
          <button type="button" className={iconButtonClass}>
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            disabled
            className="bottom-nav-counter inline-flex h-11 min-w-[72px] items-center justify-center rounded-full border border-[rgba(0,0,0,0.1)] bg-[rgba(255,255,255,0.6)] px-3 font-mono text-xs text-[#333] disabled:opacity-100"
          >
            {previewCounter}
          </button>
          <button type="button" className={iconButtonClass}>
            <ChevronRight className="h-5 w-5" />
          </button>
          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-black text-white shadow-md"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div
        ref={rootRef}
        className={cn("bottom-nav-root fixed bottom-8 left-1/2", rootZClass)}
      >
        <IconNavShell
          className="bottom-nav-shell relative overflow-hidden"
          style={
            animatedWidth ? { width: `${Math.round(animatedWidth)}px` } : undefined
          }
        >
          <div className="relative h-11 w-full">
            <div className={navLayerClass}>
              <div className="inline-flex items-center gap-1">
                {tabs.filter((tab) => tab.showInMainNav !== false).map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <IconNavItem
                      key={tab.id}
                      href={`/${locale}${tab.path}`}
                      icon={<Icon className="h-5 w-5" />}
                      label={tab.label}
                      active={isActive}
                    />
                  );
                })}
                <IconNavItem
                  href={`/${locale}/about`}
                  icon={<User className="h-5 w-5" />}
                  label="About"
                  active={activeTab === "about"}
                />
              </div>
              <div className="bottom-nav-divider" />
              <div className="inline-flex items-center gap-1">
                <button
                  type="button"
                  aria-label={toolsTriggerAriaLabel}
                  onClick={toggleToolsPanel}
                  className={iconButtonClass}
                >
                  <Wrench className="h-4 w-4" />
                </button>
                <div className={toolsPanelClass}>
                  <Link
                    href={localeTargetHref}
                    aria-label={localeButtonAriaLabel}
                    className={localeButtonClass}
                  >
                    <LocaleToggleGlyph toLocale={nextLocale} />
                  </Link>
                  <button
                    type="button"
                    aria-label={themeButtonAriaLabel}
                    onClick={toggleTheme}
                    className={iconButtonClass}
                  >
                    {themeMode === "dark" ? (
                      <Sun className="h-4 w-4" />
                    ) : (
                      <Moon className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className={previewLayerClass}>
              <button
                type="button"
                aria-label="Previous media"
                disabled={!canCycle}
                onClick={previewDock?.onPrev}
                className={iconButtonClass}
              >
                <ChevronLeft className="h-5 w-5" />
              </button>

              <button
                type="button"
                disabled
                aria-label={`Current media ${previewDock?.currentIndex ?? 1} of ${previewDock?.total ?? 1}`}
                className="bottom-nav-counter inline-flex h-11 min-w-[72px] items-center justify-center rounded-full border border-[rgba(0,0,0,0.1)] bg-[rgba(255,255,255,0.6)] px-3 font-mono text-xs text-[#333] disabled:opacity-100"
              >
                {previewCounter}
              </button>

              <button
                type="button"
                aria-label="Next media"
                disabled={!canCycle}
                onClick={previewDock?.onNext}
                className={iconButtonClass}
              >
                <ChevronRight className="h-5 w-5" />
              </button>
              <button
                type="button"
                aria-label="Close preview"
                onClick={previewDock?.onClose}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-black text-white shadow-md transition-colors hover:bg-black/90"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </IconNavShell>
      </div>
    </>
  );
}
