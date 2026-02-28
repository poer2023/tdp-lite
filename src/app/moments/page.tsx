import LocaleMomentsPage from "../[locale]/moments/page";

export default function MomentsPage() {
  return LocaleMomentsPage({
    params: Promise.resolve({ locale: "zh" as const }),
  });
}
