import LocaleAboutPage from "../[locale]/about/page";

export default function AboutPage() {
  return LocaleAboutPage({
    params: Promise.resolve({ locale: "zh" as const }),
  });
}
