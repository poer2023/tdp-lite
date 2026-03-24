export const BENTO_CARD_MEDIA_SIZES =
  "(max-width: 767px) calc(100vw - 3.5rem), (min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw";

export const BENTO_PREVIEW_VIDEO_POSTER_SIZES =
  "(max-width: 767px) calc(100vw - 4rem), (min-width: 1024px) 66vw, 90vw";

export function getDetachedPreviewImageSizes(
  measuredWidth: number | null,
  isPortraitMedia: boolean
) {
  if (measuredWidth) {
    return `${Math.max(1, Math.round(measuredWidth))}px`;
  }

  return isPortraitMedia
    ? "(max-width: 767px) calc(74vw - 1rem), (min-width: 1024px) 420px, 74vw"
    : "(max-width: 767px) calc(100vw - 4rem), (min-width: 1280px) 768px, (min-width: 1024px) 74vw, 90vw";
}

const NEXT_IMAGE_WIDTH_BUCKETS = [
  16, 32, 48, 64, 96, 128, 256, 384, 640, 750, 828, 1080, 1200, 1920, 2048,
  3840,
] as const;

function getOptimizedImageWidth(
  requestedWidth: number,
  sourceWidth?: number,
  minimumWidth = 384
) {
  const safeRequestedWidth = Math.max(1, Math.round(requestedWidth));
  const clampedWidth = sourceWidth
    ? Math.min(safeRequestedWidth, Math.max(sourceWidth, minimumWidth))
    : safeRequestedWidth;

  return (
    NEXT_IMAGE_WIDTH_BUCKETS.find((width) => width >= clampedWidth) ??
    NEXT_IMAGE_WIDTH_BUCKETS[NEXT_IMAGE_WIDTH_BUCKETS.length - 1]
  );
}

export function buildOptimizedImageUrl(
  src: string,
  requestedWidth: number,
  sourceWidth?: number,
  quality = 75,
  minimumWidth = 384
) {
  const width = getOptimizedImageWidth(
    requestedWidth,
    sourceWidth,
    minimumWidth
  );
  return `/_next/image?url=${encodeURIComponent(src)}&w=${width}&q=${quality}`;
}

export function buildOptimizedPreviewImageUrl(
  src: string,
  requestedWidth: number,
  sourceWidth?: number,
  quality = 75
) {
  return buildOptimizedImageUrl(src, requestedWidth, sourceWidth, quality, 640);
}
