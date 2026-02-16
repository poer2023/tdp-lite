import { FeedItem } from "./types";

export type BentoSpanKey = "1x1" | "1x2" | "2x1" | "2x2";

type WeightedSpan = {
  span: BentoSpanKey;
  weight: number;
};

export const BENTO_SPAN_CLASS: Record<BentoSpanKey, string> = {
  "1x1": "col-span-1 row-span-1",
  "1x2": "col-span-1 row-span-2",
  "2x1": "col-span-1 md:col-span-2 row-span-1",
  "2x2": "col-span-1 md:col-span-2 row-span-2",
};

const LARGE_SPANS = new Set<BentoSpanKey>(["1x2", "2x1", "2x2"]);

export function getFeedItemLayoutKey(item: FeedItem): string {
  return `${item.type}:${item.id}`;
}

function hashString(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededRandom(seed: string): number {
  return hashString(seed) / 4294967295;
}

function pickWeighted(candidates: WeightedSpan[], random: number): BentoSpanKey {
  const total = candidates.reduce((sum, candidate) => sum + candidate.weight, 0);
  if (total <= 0) {
    return "1x1";
  }

  let cursor = random * total;
  for (const candidate of candidates) {
    cursor -= candidate.weight;
    if (cursor <= 0) {
      return candidate.span;
    }
  }

  return candidates[candidates.length - 1]?.span ?? "1x1";
}

function getGalleryCandidates(item: Extract<FeedItem, { type: "gallery" }>): WeightedSpan[] {
  if (!item.width || !item.height || item.height === 0) {
    return [
      { span: "1x1", weight: 0.65 },
      { span: "2x1", weight: 0.2 },
      { span: "1x2", weight: 0.15 },
    ];
  }

  const ratio = item.width / item.height;
  if (ratio >= 1.25) {
    return [
      { span: "2x1", weight: 0.55 },
      { span: "1x1", weight: 0.35 },
      { span: "1x2", weight: 0.1 },
    ];
  }

  if (ratio <= 0.8) {
    return [
      { span: "1x2", weight: 0.55 },
      { span: "1x1", weight: 0.35 },
      { span: "2x1", weight: 0.1 },
    ];
  }

  return [
    { span: "1x1", weight: 0.65 },
    { span: "2x1", weight: 0.2 },
    { span: "1x2", weight: 0.15 },
  ];
}

function getMomentTextCandidates(contentLength: number): WeightedSpan[] {
  if (contentLength > 200) {
    return [
      { span: "1x2", weight: 0.55 },
      { span: "1x1", weight: 0.35 },
      { span: "2x1", weight: 0.1 },
    ];
  }

  if (contentLength > 120) {
    return [
      { span: "1x2", weight: 0.4 },
      { span: "1x1", weight: 0.5 },
      { span: "2x1", weight: 0.1 },
    ];
  }

  return [
    { span: "1x1", weight: 0.75 },
    { span: "1x2", weight: 0.2 },
    { span: "2x1", weight: 0.05 },
  ];
}

function getBaseCandidates(item: FeedItem): WeightedSpan[] {
  if (item.type === "action") {
    return [{ span: "1x1", weight: 1 }];
  }

  if (item.type === "post") {
    if (item.coverUrl) {
      return [
        { span: "2x1", weight: 0.58 },
        { span: "1x2", weight: 0.27 },
        { span: "2x2", weight: 0.15 },
      ];
    }

    return [
      { span: "1x1", weight: 0.72 },
      { span: "2x1", weight: 0.28 },
    ];
  }

  if (item.type === "moment") {
    if (item.media && item.media.length > 0) {
      return [
        { span: "1x2", weight: 0.62 },
        { span: "2x1", weight: 0.38 },
      ];
    }

    return getMomentTextCandidates(item.content.trim().length);
  }

  if (item.type === "gallery") {
    return getGalleryCandidates(item);
  }

  return [{ span: "1x1", weight: 1 }];
}

function applyConstraints(
  candidates: WeightedSpan[],
  options: {
    prevWasLarge: boolean;
    twoByTwoCount: number;
    maxTwoByTwo: number;
  }
): WeightedSpan[] {
  let next = candidates;

  if (options.maxTwoByTwo === 0 || options.twoByTwoCount >= options.maxTwoByTwo) {
    next = next.filter((candidate) => candidate.span !== "2x2");
  }

  if (options.prevWasLarge) {
    const oneByOneCandidate = next.find((candidate) => candidate.span === "1x1");
    return oneByOneCandidate ? [oneByOneCandidate] : [{ span: "1x1", weight: 1 }];
  }

  return next.length > 0 ? next : [{ span: "1x1", weight: 1 }];
}

export function computeBentoSpans(items: FeedItem[]): Record<string, string> {
  const layout: Record<string, string> = {};
  const contentCount = items.filter((item) => item.type !== "action").length;
  const maxTwoByTwo = contentCount < 8 ? 0 : Math.ceil(contentCount / 10);

  let prevWasLarge = false;
  let twoByTwoCount = 0;

  items.forEach((item) => {
    const baseCandidates = getBaseCandidates(item);
    const constrainedCandidates = applyConstraints(baseCandidates, {
      prevWasLarge,
      twoByTwoCount,
      maxTwoByTwo,
    });
    const pickedSpan = pickWeighted(
      constrainedCandidates,
      seededRandom(getFeedItemLayoutKey(item))
    );

    if (pickedSpan === "2x2") {
      twoByTwoCount += 1;
    }
    prevWasLarge = LARGE_SPANS.has(pickedSpan);

    layout[getFeedItemLayoutKey(item)] = BENTO_SPAN_CLASS[pickedSpan];
  });

  return layout;
}

export function getHighlightedItemId(items: FeedItem[]): string | null {
  const firstContentItem = items.find((item) => item.type !== "action");
  return firstContentItem?.id ?? null;
}
