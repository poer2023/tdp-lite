import { FeedItem } from "./types";

export type BentoSpanKey = "1x1" | "1x2" | "2x1" | "2x2";

export const BENTO_SPAN_CLASS: Record<BentoSpanKey, string> = {
  "1x1": "col-span-1 row-span-1",
  "1x2": "col-span-1 row-span-2",
  "2x1": "col-span-1 md:col-span-2 row-span-1",
  "2x2": "col-span-1 md:col-span-2 row-span-2",
};

export const TWO_COLUMN_MOBILE_BENTO_SPAN_CLASS: Record<BentoSpanKey, string> = {
  "1x1": "col-span-1 row-span-1",
  "1x2": "col-span-1 row-span-2",
  "2x1": "col-span-2 md:col-span-2 row-span-1",
  "2x2": "col-span-2 md:col-span-2 row-span-2",
};

const LARGE_SPANS = new Set<BentoSpanKey>(["1x2", "2x1", "2x2"]);

export function getFeedItemLayoutKey(item: FeedItem): string {
  if (item.type === "action") {
    return `${item.type}:${item.id}`;
  }

  const stableId = item.translationKey || item.id;
  return `${item.type}:${stableId}`;
}

function getGalleryAutoSpan(item: Extract<FeedItem, { type: "gallery" }>): BentoSpanKey {
  if (!item.width || !item.height || item.height === 0) {
    return "1x1";
  }

  const ratio = item.width / item.height;
  if (ratio >= 1.4) {
    return "2x1";
  }

  if (ratio <= 0.78) {
    return "1x2";
  }

  return "1x1";
}

function getMomentTextAutoSpan(contentLength: number): BentoSpanKey {
  if (contentLength > 260) {
    return "2x2";
  }

  if (contentLength > 120) {
    return "1x2";
  }

  if (contentLength > 36) {
    return "2x1";
  }

  return "1x1";
}

function getPostTextWeight(item: Extract<FeedItem, { type: "post" }>): number {
  const titleWeight = item.title.trim().length * 2;
  const excerptWeight = item.excerpt?.trim().length ?? 0;
  const contentWeight = Math.min(item.content.trim().length, 320);
  return titleWeight + excerptWeight + contentWeight;
}

function getMomentMediaAutoSpan(item: Extract<FeedItem, { type: "moment" }>): BentoSpanKey {
  const media = item.media ?? [];
  const primary = media[0];

  if (primary?.width && primary?.height && primary.height > 0) {
    const ratio = primary.width / primary.height;
    if (ratio >= 1.35) {
      return "2x1";
    }
    if (ratio <= 0.82) {
      return "1x2";
    }
  }

  if (media.length >= 3) {
    return "2x2";
  }

  return media.length >= 2 ? "2x1" : "1x2";
}

function getPostAutoSpan(item: Extract<FeedItem, { type: "post" }>): BentoSpanKey {
  const textWeight = getPostTextWeight(item);

  if (item.coverUrl) {
    return textWeight > 280 ? "2x2" : "2x1";
  }

  if (textWeight > 320) {
    return "2x2";
  }

  if (textWeight > 180) {
    return "1x2";
  }

  if (textWeight > 60) {
    return "2x1";
  }

  return "1x1";
}

function getExplicitSpan(item: FeedItem): BentoSpanKey | null {
  if (item.type === "action" || item.type === "gallery") {
    return null;
  }

  return item.cardSpan ?? null;
}

function getAutoSpan(item: FeedItem): BentoSpanKey {
  if (item.type === "action") {
    return "1x1";
  }

  if (item.type === "post") {
    return getPostAutoSpan(item);
  }

  if (item.type === "moment") {
    if (item.media && item.media.length > 0) {
      return getMomentMediaAutoSpan(item);
    }

    return getMomentTextAutoSpan(item.content.trim().length);
  }

  if (item.type === "gallery") {
    return getGalleryAutoSpan(item);
  }

  return "1x1";
}

function downgradeSpan(
  span: BentoSpanKey,
  options: { avoidLarge: boolean }
): BentoSpanKey {
  const downgradeOrder: Record<BentoSpanKey, BentoSpanKey[]> = {
    "2x2": ["2x1", "1x2", "1x1"],
    "2x1": ["1x1"],
    "1x2": ["1x1"],
    "1x1": ["1x1"],
  };

  for (const candidate of downgradeOrder[span]) {
    if (!options.avoidLarge || !LARGE_SPANS.has(candidate)) {
      return candidate;
    }
  }

  return "1x1";
}

export function resolvePreferredBentoSpan(item: FeedItem): BentoSpanKey {
  return getExplicitSpan(item) ?? getAutoSpan(item);
}

function applyAutoConstraints(
  preferred: BentoSpanKey,
  options: {
    prevWasLarge: boolean;
    twoByTwoCount: number;
    maxTwoByTwo: number;
  }
): BentoSpanKey {
  let next = preferred;

  if (next === "2x2" && (options.maxTwoByTwo === 0 || options.twoByTwoCount >= options.maxTwoByTwo)) {
    next = downgradeSpan(next, { avoidLarge: false });
  }

  if (options.prevWasLarge && LARGE_SPANS.has(next)) {
    next = downgradeSpan(next, { avoidLarge: true });
  }

  return next;
}

export function computeBentoSpanKeys(items: FeedItem[]): Record<string, BentoSpanKey> {
  const layout: Record<string, BentoSpanKey> = {};
  const contentCount = items.filter((item) => item.type !== "action").length;
  const maxTwoByTwo = contentCount < 8 ? 0 : Math.ceil(contentCount / 10);

  let prevWasLarge = false;
  let twoByTwoCount = 0;

  items.forEach((item) => {
    const explicitSpan = getExplicitSpan(item);
    const preferredSpan = explicitSpan ?? getAutoSpan(item);
    const pickedSpan = explicitSpan
      ? explicitSpan
      : applyAutoConstraints(preferredSpan, {
          prevWasLarge,
          twoByTwoCount,
          maxTwoByTwo,
        });

    if (pickedSpan === "2x2") {
      twoByTwoCount += 1;
    }
    prevWasLarge = LARGE_SPANS.has(pickedSpan);

    layout[getFeedItemLayoutKey(item)] = pickedSpan;
  });

  return layout;
}

export function computeBentoSpans(
  items: FeedItem[],
  options?: {
    classMap?: Record<BentoSpanKey, string>;
  }
): Record<string, string> {
  const classMap = options?.classMap ?? BENTO_SPAN_CLASS;
  const spanKeys = computeBentoSpanKeys(items);

  return Object.fromEntries(
    Object.entries(spanKeys).map(([layoutKey, spanKey]) => [layoutKey, classMap[spanKey]])
  );
}

export function getHighlightedItemId(items: FeedItem[]): string | null {
  const firstContentItem = items.find((item) => item.type !== "action");
  return firstContentItem?.id ?? null;
}
