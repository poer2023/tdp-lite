"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import { LiquidGlassCanvas } from "./LiquidGlassCanvas";
import { PerfController } from "./perf-controller";
import { LiquidGlassRegistry } from "./registry";

function isDesktopChromium(): boolean {
  const userAgent = navigator.userAgent;
  const chromiumLike = /(Chrome|Chromium|Edg)\//.test(userAgent);
  const webkitSafariOnly = /Safari\//.test(userAgent) && !chromiumLike;
  const mobile = /Android|iPhone|iPad|iPod|Mobile/.test(userAgent);
  return chromiumLike && !webkitSafariOnly && !mobile;
}

function isWebGl2Supported(): boolean {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("webgl2", {
    alpha: true,
    antialias: false,
    powerPreference: "high-performance",
  });
  return Boolean(context);
}

function isDevDisabled(): boolean {
  if (process.env.NODE_ENV === "production") {
    return false;
  }

  const params = new URLSearchParams(window.location.search);
  if (params.get("lg") === "off") {
    return true;
  }

  return window.localStorage.getItem("lg-webgl") === "off";
}

function getForceQualityBoost(): number {
  if (process.env.NODE_ENV === "production") {
    return 1;
  }
  const params = new URLSearchParams(window.location.search);
  const raw = params.get("lg-force");
  if (!raw || raw === "0") {
    return 1;
  }

  if (raw === "1") {
    return 1.85;
  }

  const parsed = Number.parseFloat(raw);
  if (!Number.isFinite(parsed)) {
    return 1;
  }
  return Math.min(3, Math.max(1, parsed));
}

function resolveRuntimeMode(): {
  enabled: boolean;
  forceQuality: boolean;
  forceBoost: number;
} {
  const forceBoost = getForceQualityBoost();
  const forceQuality = forceBoost > 1;

  if (isDevDisabled()) {
    return { enabled: false, forceQuality: false, forceBoost: 1 };
  }

  if (forceQuality) {
    return {
      enabled: isWebGl2Supported(),
      forceQuality: true,
      forceBoost,
    };
  }

  if (!isDesktopChromium()) {
    return { enabled: false, forceQuality: false, forceBoost: 1 };
  }

  return {
    enabled: isWebGl2Supported(),
    forceQuality: false,
    forceBoost: 1,
  };
}

export function LiquidGlassRuntimeProvider() {
  const isClient = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false
  );
  const runtimeMode = useMemo(
    () =>
      isClient
        ? resolveRuntimeMode()
        : {
            enabled: false,
            forceQuality: false,
            forceBoost: 1,
          },
    [isClient]
  );
  const enabled = runtimeMode.enabled;

  const registry = useMemo(() => new LiquidGlassRegistry(), []);
  const perfController = useMemo(
    () =>
      new PerfController({
        forceMaxQuality: runtimeMode.forceQuality,
      }),
    [runtimeMode.forceQuality]
  );

  useEffect(() => {
    if (!isClient) {
      return;
    }

    const root = document.documentElement;
    root.classList.remove("lg-webgl-active", "lg-static-fallback");
    root.classList.add(enabled ? "lg-webgl-active" : "lg-static-fallback");
    root.dataset.lgMode = enabled ? "webgl" : "fallback";

    if (!enabled) {
      return;
    }

    registry.start();
    return () => {
      registry.stop();
    };
  }, [enabled, isClient, registry]);

  if (!isClient || !enabled) {
    return null;
  }

  return (
    <LiquidGlassCanvas
      registry={registry}
      perfController={perfController}
      forceBoost={runtimeMode.forceBoost}
    />
  );
}
