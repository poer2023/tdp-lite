export type MediaKind = "image" | "video";

const VIDEO_EXTENSION_PATTERN = /\.(mp4|webm|mov|m4v|ogv|ogg)$/i;

function stripQueryAndHash(url: string): string {
  return url.split("#")[0]?.split("?")[0] ?? url;
}

export function isVideoUrl(url: string | null | undefined): boolean {
  if (!url) return false;

  if (url.startsWith("data:video/")) {
    return true;
  }

  return VIDEO_EXTENSION_PATTERN.test(stripQueryAndHash(url));
}

export function inferMediaKindFromFile(file: File | null | undefined): MediaKind | null {
  if (!file) return null;

  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("image/")) return "image";

  return isVideoUrl(file.name) ? "video" : "image";
}
