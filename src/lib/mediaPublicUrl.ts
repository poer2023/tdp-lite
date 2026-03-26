const RAW_PUBLIC_MEDIA_BASE =
  process.env.S3_CDN_URL ||
  process.env.S3_PUBLIC_BASE_URL ||
  process.env.R2_PUBLIC_URL ||
  process.env.NEXT_PUBLIC_R2_CDN_DOMAIN ||
  "";

function resolveConfiguredPublicMediaOrigin(): string | null {
  const trimmed = RAW_PUBLIC_MEDIA_BASE.trim();
  if (!trimmed) {
    return null;
  }

  const candidate = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  try {
    return new URL(candidate).origin;
  } catch {
    return null;
  }
}

const CONFIGURED_PUBLIC_MEDIA_ORIGIN = resolveConfiguredPublicMediaOrigin();

function shouldRewriteToConfiguredOrigin(url: URL): boolean {
  return url.hostname === "public.r2.dev" || url.hostname.endsWith(".r2.dev");
}

export function rewriteConfiguredPublicMediaUrl(
  raw: string | null | undefined
): string | null | undefined {
  if (!raw || !CONFIGURED_PUBLIC_MEDIA_ORIGIN) {
    return raw;
  }

  if (
    raw.startsWith("data:") ||
    raw.startsWith("blob:") ||
    raw.startsWith("/") ||
    raw.startsWith("#")
  ) {
    return raw;
  }

  try {
    const url = new URL(raw);
    if (!shouldRewriteToConfiguredOrigin(url)) {
      return raw;
    }
    return `${CONFIGURED_PUBLIC_MEDIA_ORIGIN}${url.pathname}${url.search}${url.hash}`;
  } catch {
    return raw;
  }
}

export function rewriteConfiguredPublicMediaUrlsInText(
  raw: string | null | undefined
): string | null | undefined {
  if (!raw || !CONFIGURED_PUBLIC_MEDIA_ORIGIN) {
    return raw;
  }

  return raw.replace(
    /https:\/\/(?:public|pub-[^/]+)\.r2\.dev(?=\/[^\s)"'>]+)/g,
    CONFIGURED_PUBLIC_MEDIA_ORIGIN
  );
}
