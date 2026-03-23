"use client";

import { cn } from "@/lib/utils";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  registerHomeImagePhaseItem,
  unregisterHomeImagePhaseItem,
} from "@/components/home/homeMediaPhases";

type WindowWithIdleCallback = Window & {
  requestIdleCallback?: (
    callback: IdleRequestCallback,
    options?: IdleRequestOptions
  ) => number;
  cancelIdleCallback?: (handle: number) => void;
};

interface DeferredCardMediaSlotProps {
  children: ReactNode;
  deferred?: boolean;
  delayMs?: number;
  rootMargin?: string;
  className?: string;
  placeholder?: ReactNode;
  homeImagePhaseId?: string;
}

export function DeferredCardMediaSlot({
  children,
  deferred = false,
  delayMs = 1600,
  rootMargin = "220px 0px",
  className,
  placeholder,
  homeImagePhaseId,
}: DeferredCardMediaSlotProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [isNearViewport, setIsNearViewport] = useState(() => !deferred);
  const [shouldRender, setShouldRender] = useState(() => !deferred);

  useEffect(() => {
    if (!homeImagePhaseId) {
      return;
    }

    registerHomeImagePhaseItem(homeImagePhaseId);

    return () => {
      unregisterHomeImagePhaseItem(homeImagePhaseId);
    };
  }, [homeImagePhaseId]);

  useEffect(() => {
    if (!deferred || shouldRender) {
      return;
    }

    const node = hostRef.current;
    if (!node) {
      return;
    }

    if (typeof IntersectionObserver !== "function") {
      const fallbackTimer = window.setTimeout(() => {
        setIsNearViewport(true);
      }, 0);

      return () => window.clearTimeout(fallbackTimer);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setIsNearViewport(true);
        }
      },
      {
        threshold: 0.01,
        rootMargin,
      }
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, [deferred, rootMargin, shouldRender]);

  useEffect(() => {
    if (!deferred || !isNearViewport || shouldRender) {
      return;
    }

    const idleWindow = window as WindowWithIdleCallback;
    let timeoutId: number | null = null;
    let idleCallbackId: number | null = null;

    const reveal = () => {
      setShouldRender(true);
    };

    const scheduleReveal = () => {
      if (typeof idleWindow.requestIdleCallback === "function") {
        idleCallbackId = idleWindow.requestIdleCallback(reveal, {
          timeout: Math.max(1200, delayMs),
        });
        return;
      }

      reveal();
    };

    timeoutId = window.setTimeout(scheduleReveal, delayMs);

    return () => {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }

      if (
        idleCallbackId !== null &&
        typeof idleWindow.cancelIdleCallback === "function"
      ) {
        idleWindow.cancelIdleCallback(idleCallbackId);
      }
    };
  }, [deferred, delayMs, isNearViewport, shouldRender]);

  return (
    <div ref={hostRef} className={cn("absolute inset-0", className)}>
      {shouldRender ? children : placeholder}
    </div>
  );
}

interface DeferredCardMediaPlaceholderProps {
  variant?: "light" | "dark";
  className?: string;
}

export function DeferredCardMediaPlaceholder({
  variant = "dark",
  className,
}: DeferredCardMediaPlaceholderProps) {
  return (
    <div
      className={cn(
        "absolute inset-0 overflow-hidden",
        variant === "dark" ? "bg-[#6a6257]" : "bg-[#ece6dd]",
        className
      )}
      aria-hidden="true"
    >
      <div
        className={cn(
          "absolute inset-0",
          variant === "dark"
            ? "bg-gradient-to-br from-white/14 via-transparent to-black/18"
            : "bg-gradient-to-br from-white/75 via-transparent to-black/8"
        )}
      />
      <div
        className={cn(
          "absolute -right-10 top-0 h-36 w-36 rounded-full blur-3xl",
          variant === "dark" ? "bg-white/10" : "bg-white/70"
        )}
      />
      <div
        className={cn(
          "absolute -left-8 bottom-0 h-28 w-28 rounded-full blur-2xl",
          variant === "dark" ? "bg-black/12" : "bg-black/6"
        )}
      />
    </div>
  );
}
