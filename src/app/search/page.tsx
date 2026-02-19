import LocaleSearchPage from "../[locale]/search/page";

export const dynamic = "force-dynamic";

export default function SearchPage() {
  return LocaleSearchPage({
    params: Promise.resolve({ locale: "zh" as const }),
  });
}
