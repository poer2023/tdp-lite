import type { BentoSpanKey } from "@/components/bento/layoutEngine";

export function getSearchMobileCellBudget(viewportHeight: number): number {
  if (viewportHeight < 700) {
    return 4;
  }

  if (viewportHeight < 820) {
    return 5;
  }

  return 6;
}

export function getSearchMobileRowHeight(viewportHeight: number): number {
  if (viewportHeight < 700) {
    return 112;
  }

  if (viewportHeight < 820) {
    return 120;
  }

  return 128;
}

export function getSearchSparseMobileSpan(
  span: BentoSpanKey,
  options: {
    itemCount: number;
    itemIndex: number;
    viewportHeight: number;
  }
): BentoSpanKey {
  if (options.itemCount <= 0) {
    return span;
  }

  if (options.itemCount === 1) {
    return options.viewportHeight >= 760 ? "2x2" : "2x1";
  }

  if (options.itemCount === 2) {
    return "2x1";
  }

  return span;
}
