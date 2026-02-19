import LocaleAboutPage from "../[locale]/about/page";

export const dynamic = "force-dynamic";

export default function AboutPage() {
  return LocaleAboutPage({
    params: Promise.resolve({ locale: "zh" as const }),
  });
}
