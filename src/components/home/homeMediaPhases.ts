export const HOME_IMAGES_READY_EVENT = "tdp:home-images-ready";

type WindowWithHomeMediaPhase = Window & {
  __tdpHomeImagesReady?: boolean;
  __tdpHomeImagePhase?: {
    expected: Set<string>;
    resolved: Set<string>;
    sealed: boolean;
  };
};

function getHomeImagePhaseState(phaseWindow: WindowWithHomeMediaPhase) {
  if (!phaseWindow.__tdpHomeImagePhase) {
    phaseWindow.__tdpHomeImagePhase = {
      expected: new Set<string>(),
      resolved: new Set<string>(),
      sealed: false,
    };
  }

  return phaseWindow.__tdpHomeImagePhase;
}

function maybeMarkHomeImagesReady(phaseWindow: WindowWithHomeMediaPhase) {
  const state = getHomeImagePhaseState(phaseWindow);
  if (!state.sealed) {
    return;
  }

  const allResolved = Array.from(state.expected).every((id) =>
    state.resolved.has(id)
  );

  if (!allResolved) {
    return;
  }

  if (phaseWindow.__tdpHomeImagesReady === true) {
    return;
  }

  phaseWindow.__tdpHomeImagesReady = true;
  window.dispatchEvent(new Event(HOME_IMAGES_READY_EVENT));
}

export function markHomeImagesReady() {
  if (typeof window === "undefined") {
    return;
  }

  const phaseWindow = window as WindowWithHomeMediaPhase;
  phaseWindow.__tdpHomeImagesReady = true;
  window.dispatchEvent(new Event(HOME_IMAGES_READY_EVENT));
}

export function resetHomeImagesReady() {
  if (typeof window === "undefined") {
    return;
  }

  const phaseWindow = window as WindowWithHomeMediaPhase;
  phaseWindow.__tdpHomeImagesReady = false;
  phaseWindow.__tdpHomeImagePhase = {
    expected: new Set<string>(),
    resolved: new Set<string>(),
    sealed: false,
  };
}

export function areHomeImagesReady() {
  if (typeof window === "undefined") {
    return false;
  }

  return (window as WindowWithHomeMediaPhase).__tdpHomeImagesReady === true;
}

export function registerHomeImagePhaseItem(id?: string | null) {
  if (typeof window === "undefined" || !id) {
    return;
  }

  const phaseWindow = window as WindowWithHomeMediaPhase;
  const state = getHomeImagePhaseState(phaseWindow);
  state.expected.add(id);
  maybeMarkHomeImagesReady(phaseWindow);
}

export function unregisterHomeImagePhaseItem(id?: string | null) {
  if (typeof window === "undefined" || !id) {
    return;
  }

  const phaseWindow = window as WindowWithHomeMediaPhase;
  const state = getHomeImagePhaseState(phaseWindow);
  state.expected.delete(id);
  state.resolved.delete(id);
  maybeMarkHomeImagesReady(phaseWindow);
}

export function resolveHomeImagePhaseItem(id?: string | null) {
  if (typeof window === "undefined" || !id) {
    return;
  }

  const phaseWindow = window as WindowWithHomeMediaPhase;
  const state = getHomeImagePhaseState(phaseWindow);
  state.expected.add(id);
  state.resolved.add(id);
  maybeMarkHomeImagesReady(phaseWindow);
}

export function sealHomeImagesReadyCollection() {
  if (typeof window === "undefined") {
    return;
  }

  const phaseWindow = window as WindowWithHomeMediaPhase;
  const state = getHomeImagePhaseState(phaseWindow);
  state.sealed = true;
  maybeMarkHomeImagesReady(phaseWindow);
}
