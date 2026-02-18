// @vitest-environment jsdom

import * as THREE from "three";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { BackgroundLayerRecord } from "../registry";
import { VideoTextureManager } from "../video-texture-manager";

const originalGetContext = HTMLCanvasElement.prototype.getContext;

function createRect(width: number, height: number): DOMRectReadOnly {
  return {
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    width,
    height,
    right: width,
    bottom: height,
    toJSON() {
      return this;
    },
  } as DOMRectReadOnly;
}

function createMockVideo({
  src,
  width,
  height,
  readyState = 4,
}: {
  src: string;
  width: number;
  height: number;
  readyState?: number;
}): HTMLVideoElement {
  const video = document.createElement("video");
  video.src = src;

  let currentTime = 0;
  const paused = false;

  Object.defineProperty(video, "currentSrc", {
    configurable: true,
    get: () => src,
  });
  Object.defineProperty(video, "videoWidth", {
    configurable: true,
    get: () => width,
  });
  Object.defineProperty(video, "videoHeight", {
    configurable: true,
    get: () => height,
  });
  Object.defineProperty(video, "readyState", {
    configurable: true,
    get: () => readyState,
  });
  Object.defineProperty(video, "paused", {
    configurable: true,
    get: () => paused,
  });
  Object.defineProperty(video, "currentTime", {
    configurable: true,
    get: () => currentTime,
    set: (value: number) => {
      currentTime = value;
    },
  });

  return video;
}

function createLayer(
  id: string,
  video: HTMLVideoElement,
  priority: number
): BackgroundLayerRecord {
  return {
    id,
    element: document.createElement("div"),
    rect: createRect(320, 180),
    kind: "media",
    priority,
    color: "rgba(0,0,0,0)",
    opacity: 1,
    visible: true,
    imageElement: null,
    videoElement: video,
    sourceKey: `${id}:${video.currentSrc}`,
    domOrder: priority,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
    configurable: true,
    value: originalGetContext,
  });
});

function mock2dContext(context: Partial<CanvasRenderingContext2D>) {
  Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
    configurable: true,
    value: (contextId: string) =>
      contextId === "2d" ? (context as CanvasRenderingContext2D) : null,
  });
}

describe("VideoTextureManager", () => {
  it("resizes uploads within max texture bounds", () => {
    const drawImage = vi.fn();
    const clearRect = vi.fn();
    mock2dContext({
      drawImage,
      clearRect,
    });

    const manager = new VideoTextureManager(512);
    const video = createMockVideo({
      src: "https://cdn.example.com/video.mp4",
      width: 1920,
      height: 1080,
    });
    const layer = createLayer("layer-video", video, 100);

    const texture = manager.getTextureForLayer(layer);
    expect(texture).toBeInstanceOf(THREE.Texture);

    manager.beginFrame();
    const uploads = manager.updateVisibleLayers([layer], 2);
    expect(uploads).toBe(1);

    const canvas = (texture as THREE.CanvasTexture).image as HTMLCanvasElement;
    expect(canvas.width).toBe(512);
    expect(canvas.height).toBe(288);
  });

  it("enforces per-frame upload budget", () => {
    const drawImage = vi.fn();
    const clearRect = vi.fn();
    mock2dContext({
      drawImage,
      clearRect,
    });

    const manager = new VideoTextureManager(1024);
    const layerA = createLayer(
      "layer-a",
      createMockVideo({
        src: "https://cdn.example.com/a.mp4",
        width: 1280,
        height: 720,
      }),
      200
    );
    const layerB = createLayer(
      "layer-b",
      createMockVideo({
        src: "https://cdn.example.com/b.mp4",
        width: 1280,
        height: 720,
      }),
      100
    );

    manager.getTextureForLayer(layerA);
    manager.getTextureForLayer(layerB);

    manager.beginFrame();
    const uploads = manager.updateVisibleLayers([layerA, layerB], 1);
    expect(uploads).toBe(1);
    expect(manager.getFrameInfo().uploads).toBe(1);
  });

  it("marks cross-origin blocked frame uploads and returns null texture afterwards", () => {
    const clearRect = vi.fn();
    const drawImage = vi.fn(() => {
      throw new DOMException("The canvas has been tainted by cross-origin data.", "SecurityError");
    });
    mock2dContext({
      drawImage,
      clearRect,
    });

    const manager = new VideoTextureManager(1024);
    const video = createMockVideo({
      src: "https://third-party.example.com/video.mp4",
      width: 1920,
      height: 1080,
    });
    const layer = createLayer("layer-security", video, 300);

    expect(manager.getTextureForLayer(layer)).toBeInstanceOf(THREE.Texture);

    manager.beginFrame();
    expect(manager.updateVisibleLayers([layer], 2)).toBe(0);
    expect(manager.getFrameInfo().blockedVideos).toBe(1);
    expect(manager.getTextureForLayer(layer)).toBeNull();
  });
});
