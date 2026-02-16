import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { moments } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { MomentDetailCard } from "@/components/bento/cards/MomentDetailCard";
import { TextMomentDetailCard } from "@/components/bento/cards/TextMomentDetailCard";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

type Locale = "en" | "zh";

interface MomentDetailPageProps {
  params: Promise<{ locale: Locale; id: string }>;
}

export default async function MomentDetailPage({
  params,
}: MomentDetailPageProps) {
  const { locale, id } = await params;

  const [moment] = await db
    .select()
    .from(moments)
    .where(eq(moments.id, id))
    .limit(1);

  if (!moment) {
    notFound();
  }

  const hasMedia = moment.media && moment.media.length > 0;

  return (
    <div className="min-h-screen bg-[#e9e9e7] font-display">
      {/* Noise overlay */}
      <div className="bg-noise pointer-events-none fixed inset-0 z-0 opacity-40 mix-blend-multiply" />

      <div className="relative z-10">
        {/* Back navigation */}
        <div className="mx-auto max-w-5xl px-6 pt-8">
          <Link
            href={`/${locale}`}
            className="inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 font-mono text-xs uppercase tracking-widest text-[#666] shadow-sm backdrop-blur transition-all hover:bg-white hover:text-[#111]"
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
