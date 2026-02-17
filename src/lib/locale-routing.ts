export type Locale = "en" | "zh";

export const DEFAULT_LOCALE: Locale = "zh";

export const SUPPORTED_LOCALES: Locale[] = ["en", "zh"];

export function toLocalizedPath(locale: string, path: string = ""): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  if (locale === DEFAULT_LOCALE) {
    return normalizedPath;
  }

  return `/${locale}${normalizedPath === "/" ? "" : normalizedPath}`;
}

