"use client";

import Link from "next/link";
import { useRef, useEffect, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { getLiquidGlassFilter } from "@/lib/liquid-glass";

interface IconNavShellProps {
  children: React.ReactNode;
  className?: string;
}

export function IconNavShell({ children, className }: IconNavShellProps) {
  const navRef = useRef<HTMLElement>(null);
  const [filter, setFilter] = useState<string>(
    "blur(20px) saturate(1.6) brightness(1.05)"
  );

  const updateFilter = useCallback(() => {
    const nav = navRef.current;
    if (!nav) return;
    const rect = nav.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      setFilter(
        getLiquidGlassFilter(Math.round(rect.width), Math.round(rect.height))
      );
    }
  }, []);

  useEffect(() => {
    updateFilter();
    const observer = new ResizeObserver(updateFilter);
    if (navRef.current) observer.observe(navRef.current);
    return () => observer.disconnect();
  }, [updateFilter]);

  return (
    <nav
      ref={navRef}
      className={cn("liquid-nav-shell", className)}
      style={{
        backdropFilter: filter,
        WebkitBackdropFilter: filter,
      }}
    >
      <div className="liquid-nav-content">{children}</div>
    </nav>
  );
}

interface IconNavItemProps {
  icon: React.ReactNode;
  href?: string;
  label?: string;
  active?: boolean;
  emphasized?: boolean;
  textClassName?: string;
  tooltipTopClassName?: string;
  className?: string;
}

export function IconNavItem({
  icon,
  href,
  label,
  active = false,
  emphasized = false,
  textClassName,
  tooltipTopClassName = "-top-12",
  className,
}: IconNavItemProps) {
  const isHighlighted = active || emphasized;
  const baseClass = cn(
    "liquid-nav-item group relative flex h-11 w-11 items-center justify-center rounded-full",
    isHighlighted && "liquid-nav-item--active",
    emphasized && "liquid-nav-item--emphasized",
    !isHighlighted && textClassName,
    className
  );

  const content = (
    <>
      {icon}
      {label && !active && !emphasized ? (
        <span
          className={cn(
            "liquid-nav-tooltip pointer-events-none absolute whitespace-nowrap rounded px-2 py-1 font-mono text-[10px] text-white opacity-0",
            tooltipTopClassName
          )}
        >
          {label}
        </span>
      ) : null}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={baseClass} aria-label={label}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" className={baseClass} aria-label={label}>
      {content}
    </button>
  );
}
