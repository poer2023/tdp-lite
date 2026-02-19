import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { DEFAULT_LOCALE } from "@/lib/locale-routing";

const NON_LOCALIZED_PREFIXES = ["/admin", "/preview", "/test"] as const;
type Locale = "en" | "zh";

function isNonLocalizedPath(pathname: string): boolean {
  return NON_LOCALIZED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

function detectLocale(pathname: string): Locale {
  if (pathname === "/en" || pathname.startsWith("/en/")) {
    return "en";
  }
  return "zh";
}

function nextWithLocaleHeader(request: NextRequest, locale: Locale) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-tdp-locale", locale);
  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const locale = detectLocale(pathname);

  if (isNonLocalizedPath(pathname)) {
    return nextWithLocaleHeader(request, locale);
  }

  if (pathname === `/${DEFAULT_LOCALE}` || pathname.startsWith(`/${DEFAULT_LOCALE}/`)) {
    const redirectUrl = request.nextUrl.clone();
    const withoutLocale = pathname.replace(`/${DEFAULT_LOCALE}`, "") || "/";
    redirectUrl.pathname = withoutLocale;
    return NextResponse.redirect(redirectUrl);
  }

  return nextWithLocaleHeader(request, locale);
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|manifest.json|.*\\..*).*)"],
};
