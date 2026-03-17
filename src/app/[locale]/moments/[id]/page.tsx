import { notFound } from "next/navigation";
import { MomentDetailPage as MomentDetailPageView } from "@/components/content/MomentDetailPage";
import { getPublicMoment } from "@/lib/content/read";
import { getMomentDetailStaticParams } from "@/lib/detailRouteParams";
import { type AppLocale } from "@/lib/locale";

type Locale = AppLocale;

interface MomentDetailPageProps {
  params: Promise<{ locale: Locale; id: string }>;
}

export async function generateStaticParams() {
  return getMomentDetailStaticParams();
}

export default async function MomentDetailPage({
  params,
}: MomentDetailPageProps) {
  const { locale, id } = await params;

  const moment = await getPublicMoment(locale, id);

  if (!moment) {
    notFound();
  }

  return <MomentDetailPageView locale={locale} moment={moment} />;
}
