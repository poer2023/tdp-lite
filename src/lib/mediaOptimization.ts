const CLOUDFLARE_IMAGE_TRANSFORM_HOSTS = new Set(["assets.dybzy.com"]);
const DIRECT_MEDIA_HOSTS = new Set(["public.r2.dev"]);
const DIRECT_MEDIA_SUFFIXES = [".r2.dev", ".r2.cloudflarestorage.com"];
const IMAGE_FILE_EXTENSIONS = [
  ".avif",
  ".bmp",
  ".gif",
  ".jpeg",
  ".jpg",
  ".png",
  ".webp",
] as const;

export function shouldUseCloudflareImageTransform(
  src: string | null | undefined
) {
  if (!src || src.startsWith("blob:") || src.startsWith("data:")) {
    return false;
  }

  try {
    const url = new URL(src, "https://example.com");
    const hostname = url.hostname.toLowerCase();
    const pathname = url.pathname.toLowerCase();

    return (
      CLOUDFLARE_IMAGE_TRANSFORM_HOSTS.has(hostname) &&
      !pathname.startsWith("/cdn-cgi/image/") &&
      IMAGE_FILE_EXTENSIONS.some((extension) => pathname.endsWith(extension))
    );
  } catch {
    return false;
  }
}

export function shouldBypassNextImageOptimization(
  src: string | null | undefined
) {
  if (!src) {
    return false;
  }

  if (src.startsWith("blob:") || src.startsWith("data:")) {
    return true;
  }

  if (shouldUseCloudflareImageTransform(src)) {
    return false;
  }

  try {
    const hostname = new URL(src, "https://example.com").hostname.toLowerCase();
    return (
      DIRECT_MEDIA_HOSTS.has(hostname) ||
      DIRECT_MEDIA_SUFFIXES.some((suffix) => hostname.endsWith(suffix))
    );
  } catch {
    return false;
  }
}
