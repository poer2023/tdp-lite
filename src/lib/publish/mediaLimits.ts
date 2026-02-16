const IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/heic",
  "image/heif",
]);

const VIDEO_MIME_TYPES = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-m4v",
]);

const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "avif", "heic", "heif"]);
const VIDEO_EXTENSIONS = new Set(["mp4", "webm", "mov", "m4v"]);

export const IMAGE_MAX_BYTES = 15 * 1024 * 1024;
export const VIDEO_MAX_BYTES = 120 * 1024 * 1024;

type MediaKind = "image" | "video";

function getFileExtension(filename: string): string {
  const parts = filename.toLowerCase().split(".");
  return parts[parts.length - 1] || "";
}

function detectKind(filename: string, mimeType: string): MediaKind | null {
  if (IMAGE_MIME_TYPES.has(mimeType)) return "image";
  if (VIDEO_MIME_TYPES.has(mimeType)) return "video";

  const ext = getFileExtension(filename);
  if (IMAGE_EXTENSIONS.has(ext)) return "image";
  if (VIDEO_EXTENSIONS.has(ext)) return "video";
  return null;
}

export function validateMediaUpload(params: {
  filename: string;
  mimeType: string;
  size: number;
}): { kind: MediaKind } {
  const filename = params.filename.trim();
  const mimeType = params.mimeType.trim().toLowerCase();
  const size = params.size;

  if (!filename) {
    throw new Error("filename is required");
  }
  if (!mimeType) {
    throw new Error("mime type is required");
  }

  const kind = detectKind(filename, mimeType);
  if (!kind) {
    throw new Error("unsupported media type");
  }

  const maxBytes = kind === "image" ? IMAGE_MAX_BYTES : VIDEO_MAX_BYTES;
  if (size > maxBytes) {
    throw new Error(
      `${kind} exceeds max size: ${Math.round(maxBytes / (1024 * 1024))}MB`
    );
  }

  return { kind };
}
