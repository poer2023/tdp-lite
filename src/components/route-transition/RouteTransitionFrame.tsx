"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { resolveRouteSurface } from "@/lib/routeTransition";
import { cn } from "@/lib/utils";
import { useRouteTransition } from "./RouteTransitionProvider";

export function RouteTransitionFrame({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname() || "/";
  const surface = resolveRouteSurface(pathname);
  const { pendingSurface, renderKind, stage } = useRouteTransition();

  const visualStage = useMemo(() => {
    if (stage === "entering") {
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
  }, [pendingSurface, stage, surface]);

  return (
    <div
      className="route-transition-frame"
      data-route-render-kind={renderKind}
      data-route-surface={surface}
      data-transition-stage={stage}
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
