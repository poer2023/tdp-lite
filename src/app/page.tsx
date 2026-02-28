import LocaleHomePage from "./[locale]/page";

export default function HomePage() {
  return LocaleHomePage({
    params: Promise.resolve({ locale: "zh" as const }),
  });
}
