import {
  BACKGROUND_LAYER_SELECTOR,
  GLASS_SURFACE_SELECTOR,
  resolveProfile,
  type GlassProfileKey,
} from "./profiles";

export interface GlassSurfaceRecord {
  id: string;
  element: HTMLElement;
  rect: DOMRectReadOnly;
  profileKey: GlassProfileKey;
  borderRadiusPx: number;
  fillColor: string;
  visible: boolean;
}

export type LayerKind = "background" | "media";

export interface BackgroundLayerRecord {
  id: string;
  element: HTMLElement;
  rect: DOMRectReadOnly;
  kind: LayerKind;
  priority: number;
  color: string;
  opacity: number;
  visible: boolean;
  imageElement: HTMLImageElement | null;
  videoElement: HTMLVideoElement | null;
  sourceKey: string;
  domOrder: number;
}

export interface RegistrySnapshot {
  surfaces: GlassSurfaceRecord[];
  layers: BackgroundLayerRecord[];
  updatedAt: number;
}

type Listener = (snapshot: RegistrySnapshot) => void;

function parsePx(value: string): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseOpacity(value: string): number {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) {
    return 1;
  }
  return Math.min(1, Math.max(0, parsed));
}

function isElementVisible(
  rect: DOMRectReadOnly,
  computedStyle?: CSSStyleDeclaration
): boolean {
  if (rect.width <= 0 || rect.height <= 0) {
    return false;
  }

  if (computedStyle) {
    if (computedStyle.display === "none" || computedStyle.visibility === "hidden") {
      return false;
    }
    const opacity = Number.parseFloat(computedStyle.opacity);
    if (Number.isFinite(opacity) && opacity <= 0.01) {
      return false;
    }
  }

  if (typeof window === "undefined") {
    return true;
  }

  return (
    rect.bottom > 0 &&
    rect.right > 0 &&
    rect.top < window.innerHeight &&
    rect.left < window.innerWidth
  );
}

function getLayerKind(element: HTMLElement): LayerKind {
  if (element.hasAttribute("data-lg-media-source")) {
    return "media";
  }
  return "background";
}

function getLayerPriority(kind: LayerKind, domOrder: number): number {
  const kindBase = kind === "media" ? 10_000 : 0;
  return kindBase + domOrder;
}

function getPrimaryImageElement(element: HTMLElement): HTMLImageElement | null {
  if (element instanceof HTMLImageElement) {
    return element;
  }
  if (!element.hasAttribute("data-lg-media-source")) {
    return null;
  }
  return element.querySelector("img");
}

function getPrimaryVideoElement(element: HTMLElement): HTMLVideoElement | null {
  if (element instanceof HTMLVideoElement) {
    return element;
  }
  if (!element.hasAttribute("data-lg-media-source")) {
    return null;
  }
  return element.querySelector("video");
}

function getImageSourceKey(element: HTMLImageElement | null): string {
  if (!element) {
    return "";
  }
  const src = element.currentSrc || element.src || "";
  return `${src}|${element.complete ? "1" : "0"}|${element.naturalWidth}x${element.naturalHeight}`;
}

function getVideoSourceKey(element: HTMLVideoElement | null): string {
  if (!element) {
    return "";
  }
  const src = element.currentSrc || element.src || "";
  const poster = element.poster || "";
  return `${src}|${poster}|${element.readyState}|${element.videoWidth}x${element.videoHeight}`;
}

function snapshotSignature(snapshot: RegistrySnapshot): string {
  const surfaceSig = snapshot.surfaces
    .map((surface) => {
      const { rect } = surface;
      return [
        surface.id,
        surface.profileKey,
        rect.left.toFixed(2),
        rect.top.toFixed(2),
        rect.width.toFixed(2),
        rect.height.toFixed(2),
        surface.borderRadiusPx.toFixed(2),
        surface.fillColor,
        surface.visible ? "1" : "0",
      ].join(":");
    })
    .join("|");

  const layerSig = snapshot.layers
    .map((layer) => {
      const { rect } = layer;
      return [
        layer.id,
        layer.kind,
        layer.priority.toFixed(0),
        rect.left.toFixed(2),
        rect.top.toFixed(2),
        rect.width.toFixed(2),
        rect.height.toFixed(2),
        layer.color,
        layer.opacity.toFixed(3),
        layer.visible ? "1" : "0",
        layer.sourceKey,
      ].join(":");
    })
    .join("|");

  return `${surfaceSig}#${layerSig}`;
}

export class LiquidGlassRegistry {
  private listeners = new Set<Listener>();

  private snapshot: RegistrySnapshot = {
    surfaces: [],
    layers: [],
    updatedAt: Date.now(),
  };

  private readonly elementIds = new WeakMap<Element, string>();

  private idCounter = 0;

  private resizeObserver: ResizeObserver | null = null;

  private mutationObserver: MutationObserver | null = null;

  private rafToken = 0;

  private signature = "";

  constructor(private readonly doc: Document | null = typeof document !== "undefined" ? document : null) {}

  start() {
    if (!this.doc) {
      return;
    }

    this.scanNow();

    if (typeof ResizeObserver !== "undefined") {
      this.resizeObserver = new ResizeObserver(() => {
        this.scheduleScan();
      });
      this.observeCurrentNodes();
    }

    this.mutationObserver = new MutationObserver(() => {
      this.scheduleScan();
    });
    this.mutationObserver.observe(this.doc.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: [
        "class",
        "style",
        "src",
        "srcset",
        "poster",
        "data-lg-profile",
        "data-lg-bg-layer",
        "data-lg-media-source",
      ],
    });

    window.addEventListener("resize", this.scheduleScan, { passive: true });
    window.addEventListener("scroll", this.scheduleScan, { passive: true });
  }

  stop() {
    if (!this.doc) {
      return;
    }

    this.resizeObserver?.disconnect();
    this.resizeObserver = null;

    this.mutationObserver?.disconnect();
    this.mutationObserver = null;

    window.removeEventListener("resize", this.scheduleScan);
    window.removeEventListener("scroll", this.scheduleScan);

    if (this.rafToken) {
      cancelAnimationFrame(this.rafToken);
      this.rafToken = 0;
    }
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.snapshot);

    return () => {
      this.listeners.delete(listener);
    };
  }

  getState(): RegistrySnapshot {
    return this.snapshot;
  }

  scanNow() {
    if (!this.doc) {
      return;
    }

    const nextSnapshot = this.collectSnapshot();
    const nextSignature = snapshotSignature(nextSnapshot);

    if (nextSignature === this.signature) {
      return;
    }

    this.snapshot = nextSnapshot;
    this.signature = nextSignature;
    this.observeCurrentNodes();
    this.notify();
  }

  private readonly scheduleScan = () => {
    if (this.rafToken) {
      return;
    }

    this.rafToken = requestAnimationFrame(() => {
      this.rafToken = 0;
      this.scanNow();
    });
  };

  private collectSnapshot(): RegistrySnapshot {
    if (!this.doc) {
      return {
        surfaces: [],
        layers: [],
        updatedAt: Date.now(),
      };
    }

    const surfaces = Array.from(
      this.doc.querySelectorAll<HTMLElement>(GLASS_SURFACE_SELECTOR)
    ).map((element) => {
      const rect = element.getBoundingClientRect();
      const computed = window.getComputedStyle(element);
      const profile = resolveProfile(element);
      const borderRadiusPx = parsePx(computed.borderTopLeftRadius);

      return {
        id: this.getElementId(element, "surface"),
        element,
        rect,
        profileKey: profile.key,
        borderRadiusPx,
        fillColor: computed.backgroundColor,
        visible: isElementVisible(rect, computed),
      } satisfies GlassSurfaceRecord;
    });

    const layers = Array.from(
      this.doc.querySelectorAll<HTMLElement>(BACKGROUND_LAYER_SELECTOR)
    ).map((element, index) => {
      const rect = element.getBoundingClientRect();
      const computed = window.getComputedStyle(element);
      const imageElement = getPrimaryImageElement(element);
      const videoElement = getPrimaryVideoElement(element);
      const kind = getLayerKind(element);

      return {
        id: this.getElementId(element, "layer"),
        element,
        rect,
        kind,
        priority: getLayerPriority(kind, index),
        color: computed.backgroundColor || "rgba(232,232,230,1)",
        opacity: parseOpacity(computed.opacity),
        visible: isElementVisible(rect, computed),
        imageElement,
        videoElement,
        sourceKey: `${getImageSourceKey(imageElement)}|${getVideoSourceKey(videoElement)}`,
        domOrder: index,
      } satisfies BackgroundLayerRecord;
    });

    return {
      surfaces,
      layers,
      updatedAt: Date.now(),
    };
  }

  private observeCurrentNodes() {
    if (!this.resizeObserver || !this.doc) {
      return;
    }

    this.resizeObserver.disconnect();

    for (const surface of this.snapshot.surfaces) {
      this.resizeObserver.observe(surface.element);
    }

    for (const layer of this.snapshot.layers) {
      this.resizeObserver.observe(layer.element);
    }
  }

  private notify() {
    for (const listener of this.listeners) {
      listener(this.snapshot);
    }
  }

  private getElementId(element: Element, prefix: string): string {
    const existing = this.elementIds.get(element);
    if (existing) {
      return existing;
    }

    this.idCounter += 1;
    const next = `${prefix}-${this.idCounter}`;
    this.elementIds.set(element, next);
    return next;
  }
}
