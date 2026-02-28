import LocaleSearchPage from "../[locale]/search/page";

export default function SearchPage() {
  return LocaleSearchPage({
    params: Promise.resolve({ locale: "zh" as const }),
  });
}
