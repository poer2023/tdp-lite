"use client";

import { useLayoutEffect } from "react";
import { usePathname } from "next/navigation";
import {
  type RouteRenderKind,
  type RouteSurface,
  resolveRouteSurface,
} from "@/lib/routeTransition";
import { useRouteTransition } from "./RouteTransitionProvider";

interface RouteTransitionMarkerProps {
  kind: RouteRenderKind;
  surface?: RouteSurface;
}

export function RouteTransitionMarker({
  kind,
  surface,
}: RouteTransitionMarkerProps) {
  const pathname = usePathname() || "/";
  const resolvedSurface = surface ?? resolveRouteSurface(pathname);
  const { notifyRouteVisible } = useRouteTransition();

  useLayoutEffect(() => {
    notifyRouteVisible({
      kind,
      pathname,
      surface: resolvedSurface,
    });
  }, [kind, notifyRouteVisible, pathname, resolvedSurface]);

  return null;
}
