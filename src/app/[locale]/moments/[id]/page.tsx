import { notFound } from "next/navigation";
import Link from "next/link";
import { MomentDetailCard } from "@/components/bento/cards/MomentDetailCard";
import { TextMomentDetailCard } from "@/components/bento/cards/TextMomentDetailCard";
import { ArrowLeft } from "lucide-react";
import { getPublicMoment } from "@/lib/content/read";
import { toLocalizedPath } from "@/lib/locale-routing";

export const dynamic = "force-dynamic";

type Locale = "en" | "zh";

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

  const hasMedia = moment.media && moment.media.length > 0;

  return (
    <div className="min-h-screen bg-[#e9e9e7] font-display" data-lg-bg-layer="moment-root">
      {/* Noise overlay */}
      <div
        className="bg-noise pointer-events-none fixed inset-0 z-0 opacity-40 mix-blend-multiply"
        data-lg-bg-layer="moment-noise"
      />

      <div className="relative z-10">
        {/* Back navigation */}
        <div className="mx-auto max-w-5xl px-6 pt-8">
          <Link
            href={toLocalizedPath(locale, "/")}
            className="lg-chip-light inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 font-mono text-xs uppercase tracking-widest text-[#666] shadow-sm transition-all hover:bg-white hover:text-[#111]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </Link>
        </div>

        {/* Detail card */}
        <div className="flex min-h-[80vh] items-center justify-center px-6 py-12">
          {hasMedia ? (
            <MomentDetailCard moment={moment} />
          ) : (
            <TextMomentDetailCard moment={moment} />
          )}
        </div>
      </div>
    </div>
  );
}
