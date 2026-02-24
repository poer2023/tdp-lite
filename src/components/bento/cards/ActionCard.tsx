import { cn } from "@/lib/utils";
import { Pencil } from "lucide-react";
import { ActionItem } from "../types";

interface ActionCardProps {
  item: ActionItem;
  className?: string;
}

export function ActionCard({ item, className }: ActionCardProps) {
  return (
    <div
      className={cn(
        "paper-card group relative flex h-full cursor-pointer flex-col items-center justify-center gap-3 overflow-hidden rounded-2xl border-2 border-dashed border-black/10 bg-[#f2f2f0] p-6 transition-all hover:border-black/30 hover:bg-[#efefed] dark:border-white/18 dark:bg-[#2e3742] dark:hover:border-white/28 dark:hover:bg-[#323c49]",
        className
      )}
    >
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}
      />
      <div className="text-ink z-10 flex size-10 items-center justify-center rounded-lg border border-black/5 bg-white shadow-sm transition-transform duration-300 group-hover:-translate-y-1 dark:border-white/18 dark:bg-[#394554]">
        <Pencil className="h-6 w-6" />
      </div>
      <p className="text-ink-light z-10 font-mono text-xs font-bold uppercase tracking-widest">
        {item.label || "Create Entry"}
      </p>
    </div>
  );
}
