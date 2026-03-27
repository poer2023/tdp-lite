"use client";

import { useLayoutEffect } from "react";
import { usePathname } from "next/navigation";
import {
  detectRouteLocale,
  type RouteRenderKind,
  type RouteSurface,
  resolveRouteSurface,
} from "@/lib/routeTransition";
import { useRouteTransition } from "./RouteTransitionProvider";

interface RouteTransitionMarkerProps {
  kind: RouteRenderKind;
  surface?: RouteSurface;
}

function resolveMarkerPathname(pathname: string, surface?: RouteSurface): string {
  if (!surface) {
    return pathname;
  }

  const locale = detectRouteLocale(pathname);
  const localePrefix = locale === "en" ? "/en" : "";

  switch (surface) {
    case "home":
      return localePrefix || "/";
    case "search":
      return `${localePrefix}/search`;
    case "about":
      return `${localePrefix}/about`;
    default:
      return pathname;
  }
}

export function RouteTransitionMarker({
  kind,
  surface,
}: RouteTransitionMarkerProps) {
  const pathname = usePathname() || "/";
  const resolvedSurface = surface ?? resolveRouteSurface(pathname);
  const markerPathname = resolveMarkerPathname(pathname, surface);
  const { notifyRouteVisible } = useRouteTransition();

  useLayoutEffect(() => {
    notifyRouteVisible({
      kind,
      pathname: markerPathname,
      surface: resolvedSurface,
    });
  }, [kind, markerPathname, notifyRouteVisible, resolvedSurface]);

  return null;
}
