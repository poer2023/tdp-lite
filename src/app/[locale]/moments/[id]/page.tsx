import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getPublicMoment } from "@/lib/content/read";
import { type AppLocale } from "@/lib/locale";
import { toLocalizedPath } from "@/lib/locale-routing";
import { BottomNav } from "@/components/BottomNav";
import { PreviewDockProvider } from "@/components/bento/PreviewDockContext";
import { MomentDetailPreviewClient } from "@/components/bento/MomentDetailPreviewClient";

export const dynamic = "force-dynamic";

type Locale = AppLocale;

interface MomentDetailPageProps {
  params: Promise<{ locale: Locale; id: string }>;
}

export default async function MomentDetailPage({
  params,
}: MomentDetailPageProps) {
  const { locale, id } = await params;

  const moment = await getPublicMoment(locale, id);

  if (!moment) {
    notFound();
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-page-surface font-display">
      <div className="bg-noise pointer-events-none fixed inset-0 z-0 opacity-40 mix-blend-multiply" />

      <PreviewDockProvider>
        <div className="relative z-10 min-h-screen">
          <div className="mx-auto max-w-5xl px-6 pt-8 md:px-8">
            <Link
              href={toLocalizedPath(locale, "/")}
              className="inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 font-mono text-xs uppercase tracking-widest text-[#666] shadow-sm backdrop-blur transition-all hover:bg-white hover:text-[#111] dark:bg-[#364151]/72 dark:text-[#c4cfde] dark:hover:bg-[#3d4858] dark:hover:text-[#eff4fb]"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back
            </Link>
          </div>

          <MomentDetailPreviewClient locale={locale} moment={moment} />
        </div>

        <BottomNav locale={locale} activeTab="home" />
      </PreviewDockProvider>
    </div>
  );
}
