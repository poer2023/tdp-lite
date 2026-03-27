export type RouteSurface = "home" | "search" | "about" | "other";
export type RouteTransitionStage = "idle" | "pending" | "loading" | "entering";
export type RouteRenderKind = "content" | "loading";

const LOCALE_PREFIX_PATTERN = /^\/(en|zh)(?=\/|$)/;

function normalizePathname(pathname: string): string {
  const value = pathname.split("#", 1)[0]?.split("?", 1)[0] ?? "/";
  return value || "/";
}

export function detectRouteLocale(pathname: string): "en" | "zh" {
  const normalized = normalizePathname(pathname);
  return normalized === "/en" || normalized.startsWith("/en/") ? "en" : "zh";
}

export function stripRouteLocale(pathname: string): string {
  return normalizePathname(pathname).replace(LOCALE_PREFIX_PATTERN, "") || "/";
}

export function resolveRouteSurface(pathname: string): RouteSurface {
  const normalized = stripRouteLocale(pathname);
  if (normalized === "/") {
    return "home";
  }
  if (normalized === "/search") {
    return "search";
  }
  if (normalized === "/about") {
    return "about";
  }
  return "other";
}

export function isRouteTransitionSurface(
  surface: RouteSurface
): surface is Exclude<RouteSurface, "other"> {
  return surface !== "other";
}

export function isRouteTransitionEligiblePath(pathname: string): boolean {
  return isRouteTransitionSurface(resolveRouteSurface(pathname));
}

export function shouldAnimateRouteTransition(
  fromPathname: string,
  toPathname: string
): boolean {
  const fromSurface = resolveRouteSurface(fromPathname);
  const toSurface = resolveRouteSurface(toPathname);

  if (
    !isRouteTransitionSurface(fromSurface) ||
    !isRouteTransitionSurface(toSurface)
  ) {
    return false;
  }

  return fromSurface !== toSurface;
}

export function buildTransitionPrefetchPaths(locale: "en" | "zh"): string[] {
  if (locale === "zh") {
    return ["/", "/search", "/about"];
  }

  return ["/en", "/en/search", "/en/about"];
}
