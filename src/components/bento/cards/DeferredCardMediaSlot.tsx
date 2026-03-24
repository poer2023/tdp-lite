"use client";

import { cn } from "@/lib/utils";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  registerHomeImagePhaseItem,
  unregisterHomeImagePhaseItem,
} from "@/components/home/homeMediaPhases";

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
  delayMs = 0,
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

    if (delayMs <= 0) {
      setShouldRender(true);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setShouldRender(true);
    }, delayMs);

    return () => window.clearTimeout(timeoutId);
  }, [deferred, delayMs, isNearViewport, shouldRender]);

  return (
    <div ref={hostRef} className={cn("absolute inset-0", className)}>
      {placeholder}
      {shouldRender ? children : null}
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
        "card-media-placeholder absolute inset-0 overflow-hidden",
        variant === "dark"
          ? "card-media-placeholder--dark"
          : "card-media-placeholder--light",
        className
      )}
      aria-hidden="true"
    />
  );
}
