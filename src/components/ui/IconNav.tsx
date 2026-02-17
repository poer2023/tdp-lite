import Link from "next/link";
import { cn } from "@/lib/utils";

interface IconNavShellProps {
  children: React.ReactNode;
  className?: string;
}

export function IconNavShell({ children, className }: IconNavShellProps) {
  return (
    <nav
      className={cn(
        "flex items-center gap-1 rounded-full border border-white/50 bg-white/90 px-2 py-2 shadow-[0_8px_30px_rgb(0,0,0,0.12)] ring-1 ring-black/5 backdrop-blur-md",
        className
      )}
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
        : cn("text-[#666] hover:bg-black/5 hover:text-[#111]", textClassName),
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
    return <Link href={href} className={baseClass}>{content}</Link>;
  }

  return <button type="button" className={baseClass}>{content}</button>;
}
