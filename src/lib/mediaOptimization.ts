const DIRECT_MEDIA_HOSTS = new Set(["assets.dybzy.com", "public.r2.dev"]);
const DIRECT_MEDIA_SUFFIXES = [".r2.dev", ".r2.cloudflarestorage.com"];

export function shouldBypassNextImageOptimization(
  src: string | null | undefined
) {
  if (!src) {
    return false;
  }

  if (src.startsWith("blob:") || src.startsWith("data:")) {
    return true;
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
