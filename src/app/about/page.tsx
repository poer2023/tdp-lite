import LocaleAboutPage from "../[locale]/about/page";

export const revalidate = 60;

export default function AboutPage() {
  return LocaleAboutPage({
    params: Promise.resolve({ locale: "zh" as const }),
  });
}
