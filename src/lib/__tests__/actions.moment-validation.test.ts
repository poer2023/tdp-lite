import { describe, expect, it } from "vitest";
import { isMomentPublishable } from "../momentValidation";

describe("moment publish validation", () => {
  it("allows pure image moment payload", () => {
    expect(isMomentPublishable("", 1)).toBe(true);
  });

  it("rejects payload without content and media", () => {
    expect(isMomentPublishable("", 0)).toBe(false);
    expect(isMomentPublishable("   ", 0)).toBe(false);
  });
});
