"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  buildTransitionPrefetchPaths,
  detectRouteLocale,
  type RouteRenderKind,
  resolveRouteSurface,
  type RouteSurface,
  type RouteTransitionStage,
  shouldAnimateRouteTransition,
} from "@/lib/routeTransition";

const LOADING_THRESHOLD_MS = 120;
const ENTER_DURATION_MS = 220;

interface RouteVisibilityPayload {
  kind: RouteRenderKind;
  pathname: string;
  surface: RouteSurface;
}

interface RouteTransitionContextValue {
  currentPathname: string;
  currentSurface: RouteSurface;
  pendingSurface: RouteSurface | null;
  renderKind: RouteRenderKind;
  stage: RouteTransitionStage;
  beginRouteTransition: (href: string) => void;
  notifyRouteVisible: (payload: RouteVisibilityPayload) => void;
  prefetchHref: (href: string) => void;
}

const RouteTransitionContext =
  createContext<RouteTransitionContextValue | null>(null);

type IdleCallbackId = number;
type IdleCallbackHandle = { type: "idle"; id: IdleCallbackId } | {
  type: "timeout";
  id: number;
};

function isContentSurface(surface: RouteSurface): boolean {
  return surface !== "other";
}

export function RouteTransitionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname() || "/";
  const router = useRouter();
  const currentSurface = resolveRouteSurface(pathname);

  const [stage, setStage] = useState<RouteTransitionStage>("idle");
  const [pendingSurface, setPendingSurface] = useState<RouteSurface | null>(
    null
  );
  const [renderKind, setRenderKind] = useState<RouteRenderKind>("content");

  const pendingTimerRef = useRef<number | null>(null);
  const settleTimerRef = useRef<number | null>(null);
  const initializedRef = useRef(false);
  const previousPathnameRef = useRef(pathname);
  const previousSurfaceRef = useRef(currentSurface);

  const clearPendingTimer = useCallback(() => {
    if (pendingTimerRef.current !== null) {
      window.clearTimeout(pendingTimerRef.current);
      pendingTimerRef.current = null;
    }
  }, []);

  const clearSettleTimer = useCallback(() => {
    if (settleTimerRef.current !== null) {
      window.clearTimeout(settleTimerRef.current);
      settleTimerRef.current = null;
    }
  }, []);

  const prefetchHref = useCallback(
    (href: string) => {
      router.prefetch(href);
    },
    [router]
  );

  const beginRouteTransition = useCallback(
    (href: string) => {
      if (!shouldAnimateRouteTransition(pathname, href)) {
        return;
      }

      const nextSurface = resolveRouteSurface(href);
      clearPendingTimer();
      clearSettleTimer();

      setPendingSurface(nextSurface);
      setStage("pending");

      pendingTimerRef.current = window.setTimeout(() => {
        setStage((previous) => (previous === "pending" ? "loading" : previous));
      }, LOADING_THRESHOLD_MS);
    },
    [clearPendingTimer, clearSettleTimer, pathname]
  );

  const notifyRouteVisible = useCallback(
    ({ kind, pathname: visiblePathname, surface }: RouteVisibilityPayload) => {
      clearPendingTimer();
      clearSettleTimer();

      if (!initializedRef.current) {
        initializedRef.current = true;
        previousPathnameRef.current = visiblePathname;
        previousSurfaceRef.current = surface;
        setStage("idle");
        setRenderKind(kind);
        setPendingSurface(null);
        return;
      }

      previousPathnameRef.current = visiblePathname;
      previousSurfaceRef.current = surface;
      setRenderKind(kind);

      if (!isContentSurface(surface)) {
        setPendingSurface(null);
        setStage("idle");
        return;
      }

      if (kind === "loading") {
        setPendingSurface(surface);
        setStage("loading");
        return;
      }

      setPendingSurface(null);
      setStage("entering");

      settleTimerRef.current = window.setTimeout(() => {
        setStage("idle");
      }, ENTER_DURATION_MS);
    },
    [clearPendingTimer, clearSettleTimer]
  );

  useEffect(() => {
    const previousPathname = previousPathnameRef.current;
    if (previousPathname === pathname) {
      return;
    }

    const previousSurface = previousSurfaceRef.current;
    previousPathnameRef.current = pathname;
    previousSurfaceRef.current = currentSurface;

    if (
      !pendingSurface &&
      initializedRef.current &&
      shouldAnimateRouteTransition(previousPathname, pathname) &&
      isContentSurface(previousSurface) &&
      isContentSurface(currentSurface)
    ) {
      const frameId = window.requestAnimationFrame(() => {
        setPendingSurface(currentSurface);
        setStage("pending");
        pendingTimerRef.current = window.setTimeout(() => {
          setStage((current) =>
            current === "pending" ? "loading" : current
          );
        }, LOADING_THRESHOLD_MS);
      });
      return () => {
        window.cancelAnimationFrame(frameId);
      };
    }

    if (!isContentSurface(currentSurface)) {
      const frameId = window.requestAnimationFrame(() => {
        setPendingSurface(null);
        setStage("idle");
        setRenderKind("content");
      });
      return () => {
        window.cancelAnimationFrame(frameId);
      };
    }
  }, [currentSurface, pathname, pendingSurface]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const locale = detectRouteLocale(pathname);
    const paths = buildTransitionPrefetchPaths(locale);
    let handle: IdleCallbackHandle | null = null;

    const prefetchAll = () => {
      paths.forEach((href) => prefetchHref(href));
    };

    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(() => {
        prefetchAll();
      });
      handle = { type: "idle", id };
    } else {
      const id = window.setTimeout(() => {
        prefetchAll();
      }, 320);
      handle = { type: "timeout", id };
    }

    return () => {
      if (!handle) {
        return;
      }
      if (handle.type === "idle" && typeof window.cancelIdleCallback === "function") {
        window.cancelIdleCallback(handle.id);
        return;
      }
      window.clearTimeout(handle.id);
    };
  }, [pathname, prefetchHref]);

  useEffect(() => {
    return () => {
      clearPendingTimer();
      clearSettleTimer();
    };
  }, [clearPendingTimer, clearSettleTimer]);

  const value = useMemo<RouteTransitionContextValue>(
    () => ({
      currentPathname: pathname,
      currentSurface,
      pendingSurface,
      renderKind,
      stage,
      beginRouteTransition,
      notifyRouteVisible,
      prefetchHref,
    }),
    [
      beginRouteTransition,
      currentSurface,
      notifyRouteVisible,
      pathname,
      pendingSurface,
      prefetchHref,
      renderKind,
      stage,
    ]
  );

  return (
    <RouteTransitionContext.Provider value={value}>
      {children}
    </RouteTransitionContext.Provider>
  );
}

export function useRouteTransition() {
  const context = useContext(RouteTransitionContext);
  if (!context) {
    throw new Error("useRouteTransition must be used within RouteTransitionProvider");
  }
  return context;
}
