import { describe, expect, it } from "vitest";
import {
  getSearchMobileCellBudget,
  getSearchMobileRowHeight,
  getSearchSparseMobileSpan,
} from "@/components/search/mobileLayout";

describe("search mobile layout helpers", () => {
  it("uses a tighter budget on short screens and expands on tall screens", () => {
    expect(getSearchMobileCellBudget(667)).toBe(4);
    expect(getSearchMobileCellBudget(780)).toBe(5);
    expect(getSearchMobileCellBudget(844)).toBe(6);
  });

  it("scales row height with viewport height", () => {
    expect(getSearchMobileRowHeight(667)).toBe(112);
    expect(getSearchMobileRowHeight(780)).toBe(120);
    expect(getSearchMobileRowHeight(844)).toBe(128);
  });

  it("stretches sparse mobile result sets to avoid empty gutters", () => {
    expect(
      getSearchSparseMobileSpan("1x1", {
        itemCount: 1,
        itemIndex: 0,
        viewportHeight: 844,
      })
    ).toBe("2x2");

    expect(
      getSearchSparseMobileSpan("1x1", {
        itemCount: 2,
        itemIndex: 1,
        viewportHeight: 667,
      })
    ).toBe("2x1");

    expect(
      getSearchSparseMobileSpan("1x2", {
        itemCount: 4,
        itemIndex: 2,
        viewportHeight: 844,
      })
    ).toBe("1x2");
  });
});
