// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { LiquidGlassRegistry } from "../registry";

function setRect(
  element: HTMLElement,
  rect: { left: number; top: number; width: number; height: number }
) {
  const fullRect = {
    x: rect.left,
    y: rect.top,
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
    right: rect.left + rect.width,
    bottom: rect.top + rect.height,
    toJSON() {
      return this;
    },
  };

  Object.defineProperty(element, "getBoundingClientRect", {
    configurable: true,
    value: () => fullRect,
  });
}

describe("LiquidGlassRegistry", () => {
  it("tracks registration and unregistration", () => {
    document.body.innerHTML = "";

    const surface = document.createElement("div");
    surface.className = "lg-panel-medium";
    surface.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
    setRect(surface, { left: 10, top: 20, width: 180, height: 64 });

    const layer = document.createElement("div");
    layer.setAttribute("data-lg-bg-layer", "main");
    layer.style.backgroundColor = "rgb(233, 233, 231)";
    setRect(layer, { left: 0, top: 0, width: 500, height: 400 });

    document.body.append(surface, layer);

    const registry = new LiquidGlassRegistry(document);
    registry.scanNow();
    let snapshot = registry.getState();

    expect(snapshot.surfaces).toHaveLength(1);
    expect(snapshot.layers).toHaveLength(1);
    expect(snapshot.surfaces[0]?.profileKey).toBe("panelMedium");

    surface.remove();
    registry.scanNow();
    snapshot = registry.getState();

    expect(snapshot.surfaces).toHaveLength(0);
    expect(snapshot.layers).toHaveLength(1);
  });

  it("updates rects when layout changes", () => {
    document.body.innerHTML = "";

    const surface = document.createElement("div");
    surface.className = "liquid-nav-shell";
    setRect(surface, { left: 40, top: 520, width: 360, height: 72 });
    document.body.append(surface);

    const registry = new LiquidGlassRegistry(document);
    registry.scanNow();

    const initialTop = registry.getState().surfaces[0]?.rect.top;
    expect(initialTop).toBe(520);

    setRect(surface, { left: 40, top: 480, width: 360, height: 72 });
    registry.scanNow();

    const movedTop = registry.getState().surfaces[0]?.rect.top;
    expect(movedTop).toBe(480);
  });

  it("uses data profile override when provided", () => {
    document.body.innerHTML = "";

    const surface = document.createElement("div");
    surface.className = "lg-panel-light";
    surface.dataset.lgProfile = "chip-dark";
    setRect(surface, { left: 24, top: 40, width: 160, height: 48 });

    document.body.append(surface);

    const registry = new LiquidGlassRegistry(document);
    registry.scanNow();

    const profileKey = registry.getState().surfaces[0]?.profileKey;
    expect(profileKey).toBe("chipDark");
  });

  it("does not treat bg-layer descendants as media sources", () => {
    document.body.innerHTML = "";

    const root = document.createElement("div");
    root.setAttribute("data-lg-bg-layer", "root");
    setRect(root, { left: 0, top: 0, width: 900, height: 700 });

    const image = document.createElement("img");
    image.src = "https://example.com/bg.jpg";
    root.append(image);

    const video = document.createElement("video");
    video.src = "https://example.com/bg.mp4";
    root.append(video);

    document.body.append(root);

    const registry = new LiquidGlassRegistry(document);
    registry.scanNow();

    const layer = registry.getState().layers[0];
    expect(layer?.kind).toBe("background");
    expect(layer?.imageElement).toBeNull();
    expect(layer?.videoElement).toBeNull();
  });
});
