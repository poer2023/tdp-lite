"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { resolveRouteSurface } from "@/lib/routeTransition";
import { cn } from "@/lib/utils";
import { useRouteTransition } from "./RouteTransitionProvider";

const ENTER_DURATION_MS = 220;

export function RouteTransitionFrame({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname() || "/";
  const surface = resolveRouteSurface(pathname);
  const { pendingSurface, renderKind, renderToken, stage } =
    useRouteTransition();
  const [isEntering, setIsEntering] = useState(false);

  useEffect(() => {
    if (renderToken === 0) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      setIsEntering(true);
    });
    const timerId = window.setTimeout(() => {
      setIsEntering(false);
    }, ENTER_DURATION_MS);
    return () => {
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(timerId);
      setIsEntering(false);
    };
  }, [renderToken]);

  const visualStage = useMemo(() => {
    if (isEntering) {
      return "entering";
    }
    if (
      pendingSurface &&
      surface !== pendingSurface &&
      (stage === "pending" || stage === "loading")
    ) {
      return stage;
    }
    return "idle";
  }, [isEntering, pendingSurface, stage, surface]);

  return (
    <div
      className="route-transition-frame"
      data-route-render-kind={renderKind}
      data-route-surface={surface}
      data-transition-stage={isEntering ? "entering" : stage}
    >
      <div
        className={cn("route-transition-viewport", {
          "route-transition-viewport--pending": visualStage === "pending",
          "route-transition-viewport--loading": visualStage === "loading",
          "route-transition-viewport--entering": visualStage === "entering",
        })}
      >
        {children}
      </div>
    </div>
  );
}
