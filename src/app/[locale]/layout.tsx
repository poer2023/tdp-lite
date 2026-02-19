import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";

import { APP_LOCALES, isAppLocale, type AppLocale } from "@/lib/locale";

type Locale = AppLocale;

interface LocaleLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export async function generateStaticParams() {
  return APP_LOCALES.map((locale) => ({ locale }));
}

export function generateViewport(): Viewport {
  return {
    themeColor: "#111",
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const resolvedLocale: Locale = isAppLocale(locale) ? locale : "en";
  return {
    title:
      resolvedLocale === "zh" ? "TDP Lite - 极简博客" : "TDP Lite - Minimal Blog",
    description:
      resolvedLocale === "zh"
        ? "一个极简的个人博客平台"
        : "A minimal personal blog platform",
    manifest: "/manifest.json",
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: "TDP Lite",
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps) {
  const { locale } = await params;
  if (!isAppLocale(locale)) {
    notFound();
  }

  return <>{children}</>;
}
