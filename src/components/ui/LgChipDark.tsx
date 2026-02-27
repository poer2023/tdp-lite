import { cn } from "@/lib/utils";

interface LgChipDarkProps {
    children: React.ReactNode;
    className?: string;
}

/**
 * Reusable dark glass chip badge used on media overlays.
 * Consolidates the repeated `lg-chip-dark rounded-full bg-white/20 px-3 py-1 text-xs font-medium text-white` pattern.
 */
export function LgChipDark({ children, className }: LgChipDarkProps) {
    return (
        <span
            className={cn(
                "lg-chip-dark rounded-full bg-white/20 px-3 py-1 text-xs font-medium text-white",
                className,
            )}
        >
            {children}
        </span>
    );
}
