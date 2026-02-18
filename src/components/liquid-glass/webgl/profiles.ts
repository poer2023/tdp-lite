export type GlassProfileKey =
  | "panelStrong"
  | "panelMedium"
  | "panelLight"
  | "chipLight"
  | "chipDark"
  | "overlayDark"
  | "navShell"
  | "navTooltip";

export interface GlassProfile {
  strength: number;
  blurStrength: number;
  fillOpacity: number;
  edgeInnerPx: number;
  edgeOuterPx: number;
  rimIntensity: number;
  chromaAmount: number;
}

export interface ResolvedProfile {
  key: GlassProfileKey;
  profile: GlassProfile;
}

export const GLASS_SURFACE_SELECTOR = [
  ".lg-panel-strong",
  ".lg-panel-medium",
  ".lg-panel-light",
  ".lg-chip-light",
  ".lg-chip-dark",
  ".lg-overlay-dark",
  ".bento-card-about",
  ".liquid-nav-shell",
  ".liquid-nav-tooltip",
].join(",");

export const BACKGROUND_LAYER_SELECTOR = "[data-lg-bg-layer],[data-lg-media-source]";

const PROFILE_MAP: Record<GlassProfileKey, GlassProfile> = {
  panelStrong: {
    strength: 42,
    blurStrength: 0.92,
    fillOpacity: 0.13,
    edgeInnerPx: 1.6,
    edgeOuterPx: 26,
    rimIntensity: 0.26,
    chromaAmount: 3.2,
  },
  panelMedium: {
    strength: 34,
    blurStrength: 0.8,
    fillOpacity: 0.11,
    edgeInnerPx: 1.4,
    edgeOuterPx: 24,
    rimIntensity: 0.23,
    chromaAmount: 2.6,
  },
  panelLight: {
    strength: 24,
    blurStrength: 0.68,
    fillOpacity: 0.08,
    edgeInnerPx: 1.2,
    edgeOuterPx: 19,
    rimIntensity: 0.19,
    chromaAmount: 1.8,
  },
  chipLight: {
    strength: 20,
    blurStrength: 0.52,
    fillOpacity: 0.17,
    edgeInnerPx: 0.8,
    edgeOuterPx: 14,
    rimIntensity: 0.28,
    chromaAmount: 1.4,
  },
  chipDark: {
    strength: 22,
    blurStrength: 0.56,
    fillOpacity: 0.14,
    edgeInnerPx: 0.8,
    edgeOuterPx: 14,
    rimIntensity: 0.24,
    chromaAmount: 1.25,
  },
  overlayDark: {
    strength: 22,
    blurStrength: 0.58,
    fillOpacity: 0.12,
    edgeInnerPx: 0.8,
    edgeOuterPx: 18,
    rimIntensity: 0.11,
    chromaAmount: 1.1,
  },
  navShell: {
    strength: 138,
    blurStrength: 0.9,
    fillOpacity: 0.24,
    edgeInnerPx: 0.2,
    edgeOuterPx: 30,
    rimIntensity: 0.44,
    chromaAmount: 3.6,
  },
  navTooltip: {
    strength: 20,
    blurStrength: 0.48,
    fillOpacity: 0.2,
    edgeInnerPx: 0.8,
    edgeOuterPx: 14,
    rimIntensity: 0.24,
    chromaAmount: 1.3,
  },
};

const DATA_PROFILE_MAP: Record<string, GlassProfileKey> = {
  "panel-strong": "panelStrong",
  "panel-medium": "panelMedium",
  "panel-light": "panelLight",
  "chip-light": "chipLight",
  "chip-dark": "chipDark",
  "overlay-dark": "overlayDark",
  nav: "navShell",
  tooltip: "navTooltip",
};

export function getProfile(key: GlassProfileKey): GlassProfile {
  return PROFILE_MAP[key];
}

function profileKeyFromClassList(classList: DOMTokenList): GlassProfileKey {
  if (classList.contains("liquid-nav-tooltip")) {
    return "navTooltip";
  }
  if (classList.contains("liquid-nav-shell")) {
    return "navShell";
  }
  if (classList.contains("lg-panel-strong")) {
    return "panelStrong";
  }
  if (classList.contains("lg-panel-medium")) {
    return "panelMedium";
  }
  if (classList.contains("lg-panel-light")) {
    return "panelLight";
  }
  if (classList.contains("lg-chip-light")) {
    return "chipLight";
  }
  if (classList.contains("lg-chip-dark")) {
    return "chipDark";
  }
  if (classList.contains("lg-overlay-dark")) {
    return "overlayDark";
  }
  return "panelMedium";
}

export function resolveProfileKey(element: HTMLElement): GlassProfileKey {
  const dataProfile = element.dataset.lgProfile?.trim();
  if (dataProfile) {
    const mapped = DATA_PROFILE_MAP[dataProfile];
    if (mapped) {
      return mapped;
    }
  }
  return profileKeyFromClassList(element.classList);
}

export function resolveProfile(element: HTMLElement): ResolvedProfile {
  const key = resolveProfileKey(element);
  return {
    key,
    profile: getProfile(key),
  };
}
