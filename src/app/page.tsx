import LocaleHomePage from "./[locale]/page";

export const dynamic = "force-dynamic";

export default function HomePage() {
  return LocaleHomePage({
    params: Promise.resolve({ locale: "zh" as const }),
  });
}
