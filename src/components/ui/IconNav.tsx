"use client";

import Link from "next/link";
import { useEffect, useId } from "react";
import { cn } from "@/lib/utils";
import { Vaso } from "vaso";

interface IconNavShellProps {
  children: React.ReactNode;
  className?: string;
}

export function IconNavShell({ children, className }: IconNavShellProps) {
  const shellId = useId();

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

  return (
    <Vaso
      id={shellId}
      component="nav"
      className={cn("liquid-nav-shell", className)}
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
          data-lg-profile="tooltip"
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
