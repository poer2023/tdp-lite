import LocaleMomentsPage from "../[locale]/moments/page";

export const dynamic = "force-dynamic";

export default function MomentsPage() {
  return LocaleMomentsPage({
    params: Promise.resolve({ locale: "zh" as const }),
  });
}
