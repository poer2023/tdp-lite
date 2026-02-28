import LocaleMomentPage from "../../[locale]/moments/[id]/page";
import { getDefaultMomentDetailStaticParams } from "@/lib/detailRouteParams";

interface MomentPageProps {
  params: Promise<{ id: string }>;
}

export async function generateStaticParams() {
  return getDefaultMomentDetailStaticParams();
}

export default async function MomentPage({ params }: MomentPageProps) {
  const { id } = await params;

  return LocaleMomentPage({
    params: Promise.resolve({ locale: "zh" as const, id }),
  });
}
