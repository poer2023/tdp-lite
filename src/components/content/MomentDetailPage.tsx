import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { MomentDetailPreviewClient } from "@/components/bento/MomentDetailPreviewClient";
import type { Moment } from "@/lib/content/types";
import type { AppLocale } from "@/lib/locale";
import { toLocalizedPath } from "@/lib/locale-routing";

interface MomentDetailPageProps {
  locale: AppLocale;
  moment: Moment;
  hideLocaleToggle?: boolean;
}

export function MomentDetailPage({ locale, moment }: MomentDetailPageProps) {
  const backLabel = locale === "zh" ? "返回" : "Back";

  return (
    <div className="tdp-safe-surface bg-page-surface relative min-h-dvh overflow-x-hidden font-display">
      <div className="tdp-safe-noise bg-noise pointer-events-none fixed inset-0 z-0 opacity-40 mix-blend-multiply" />
      <div className="relative z-10 min-h-dvh">
        <div className="mx-auto max-w-5xl px-6 pt-[calc(2rem+var(--tdp-inset-top))] md:px-8">
          <Link
            href={toLocalizedPath(locale, "/")}
            className="dark:bg-[#364151]/72 inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 font-mono text-xs uppercase tracking-widest text-[#666] shadow-sm backdrop-blur transition-all hover:bg-white hover:text-[#111] dark:text-[#c4cfde] dark:hover:bg-[#3d4858] dark:hover:text-[#eff4fb]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {backLabel}
          </Link>
        </div>

        <MomentDetailPreviewClient locale={locale} moment={moment} />
      </div>
    </div>
  );
}
