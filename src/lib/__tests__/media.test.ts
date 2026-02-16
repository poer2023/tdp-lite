import { describe, expect, it } from "vitest";
import { inferMediaKindFromFile, isVideoUrl } from "../media";

function mockFile(name: string, type: string): File {
  return { name, type } as File;
}

describe("media helpers", () => {
  it("detects video urls by extension and data uri", () => {
    expect(isVideoUrl("https://cdn.example.com/foo.mp4")).toBe(true);
    expect(isVideoUrl("https://cdn.example.com/foo.webm?x=1")).toBe(true);
    expect(isVideoUrl("data:video/mp4;base64,AAAA")).toBe(true);
  });

  it("does not mark non-video urls as video", () => {
    expect(isVideoUrl("https://cdn.example.com/foo.jpg")).toBe(false);
    expect(isVideoUrl("blob:https://example.com/abc")).toBe(false);
    expect(isVideoUrl(null)).toBe(false);
  });

  it("infers file media kind from mime type first, filename second", () => {
    expect(inferMediaKindFromFile(mockFile("cover.bin", "video/mp4"))).toBe("video");
    expect(inferMediaKindFromFile(mockFile("cover.png", "image/png"))).toBe("image");
    expect(inferMediaKindFromFile(mockFile("cover.mov", ""))).toBe("video");
    expect(inferMediaKindFromFile(mockFile("cover.unknown", ""))).toBe("image");
    expect(inferMediaKindFromFile(null)).toBeNull();
  });
});
