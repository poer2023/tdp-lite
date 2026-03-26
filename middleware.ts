import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { DEFAULT_LOCALE } from "@/lib/locale-routing";

const NON_LOCALIZED_PREFIXES = ["/admin", "/preview", "/test"] as const;
const REMOVED_MAIN_SITE_PREFIXES = ["/admin"] as const;

function isNonLocalizedPath(pathname: string): boolean {
  return NON_LOCALIZED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

function isRemovedMainSitePath(pathname: string): boolean {
  return REMOVED_MAIN_SITE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isRemovedMainSitePath(pathname)) {
    return new NextResponse("Not Found", {
      status: 404,
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  }

  if (isNonLocalizedPath(pathname)) {
    return NextResponse.next();
  }

  if (pathname === `/${DEFAULT_LOCALE}` || pathname.startsWith(`/${DEFAULT_LOCALE}/`)) {
    const redirectUrl = request.nextUrl.clone();
    const withoutLocale = pathname.replace(`/${DEFAULT_LOCALE}`, "") || "/";
    redirectUrl.pathname = withoutLocale;
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|manifest.json|.*\\..*).*)"],
};
