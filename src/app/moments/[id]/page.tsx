import LocaleMomentPage from "../../[locale]/moments/[id]/page";

export const dynamic = "force-dynamic";

interface MomentPageProps {
  params: Promise<{ id: string }>;
}

export default async function MomentPage({ params }: MomentPageProps) {
  const { id } = await params;

  return LocaleMomentPage({
    params: Promise.resolve({ locale: "zh" as const, id }),
  });
}
