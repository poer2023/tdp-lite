"use client";

import Link from "next/link";
import { useEffect, useId } from "react";
import { cn } from "@/lib/utils";
import { Vaso } from "vaso";

interface IconNavShellProps {
  children: React.ReactNode;
  className?: string;
  variant?: "solid" | "liquid";
  style?: React.CSSProperties;
}

function useVasoRefraction(shellId: string) {
  useEffect(() => {
    const shell = document.getElementById(shellId);
    if (!shell) return;

    const vasoLayer = shell.querySelector<HTMLElement>("[data-vaso]");
    const filter = shell.querySelector<SVGFilterElement>("filter[id$='_filter']");
    if (!vasoLayer || !filter?.id) return;

    const pureRefraction = `url(#${filter.id})`;
    const enforcePureRefraction = () => {
      vasoLayer.style.setProperty("backdrop-filter", pureRefraction);
      vasoLayer.style.setProperty("-webkit-backdrop-filter", pureRefraction);
    };

    enforcePureRefraction();

    const observer = new MutationObserver(enforcePureRefraction);
    observer.observe(vasoLayer, { attributes: true, attributeFilter: ["style"] });

    return () => observer.disconnect();
  }, [shellId]);
}

export function LiquidGlassIconNavShell({
  children,
  className,
  style,
}: Omit<IconNavShellProps, "variant">) {
  const shellId = useId();
  useVasoRefraction(shellId);

  return (
    <Vaso
      id={shellId}
      component="nav"
      className={cn("liquid-nav-shell", className)}
      style={style}
      data-lg-profile="nav"
      px={0}
      py={0}
      radius={999}
      depth={0.66}
      blur={0}
      dispersion={false}
    >
      <div className="liquid-nav-content">{children}</div>
    </Vaso>
  );
}

export function IconNavShell({
  children,
  className,
  variant = "solid",
  style,
}: IconNavShellProps) {
  if (variant === "liquid") {
    return (
      <LiquidGlassIconNavShell className={className} style={style}>
        {children}
      </LiquidGlassIconNavShell>
    );
  }

  return (
    <nav
      className={cn(
        "flex items-center gap-1 rounded-full border border-[rgba(255,255,255,0.38)] bg-[rgba(255,255,255,0.78)] px-2 py-2 shadow-[0_8px_30px_rgb(0,0,0,0.12)] ring-1 ring-[rgba(0,0,0,0.05)] backdrop-blur-md",
        className
      )}
      style={style}
    >
      {children}
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
  const baseClass = cn(
    "group relative flex h-11 w-11 items-center justify-center rounded-full transition-all",
    emphasized
      ? "h-12 w-12 bg-black text-white shadow-md hover:scale-[1.03]"
      : active
        ? "bg-black text-white shadow-md"
        : cn(
            "text-[rgb(102,102,102)] hover:bg-black/5 hover:text-[rgb(17,17,17)]",
            textClassName
          ),
    className
  );

  const content = (
    <>
      {icon}
      {label && !active && !emphasized ? (
        <span
          className={cn(
            "pointer-events-none absolute rounded bg-black px-2 py-1 font-mono text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100 whitespace-nowrap",
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
      <Link href={href} className={baseClass}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" className={baseClass}>
      {content}
    </button>
  );
}
