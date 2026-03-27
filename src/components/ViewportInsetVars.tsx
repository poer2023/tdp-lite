"use client";

import { useEffect } from "react";

function setRootViewportInsets() {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  const root = document.documentElement;
  const visualViewport = window.visualViewport;

  if (!visualViewport) {
    root.style.removeProperty("--tdp-viewport-top-offset");
    root.style.removeProperty("--tdp-viewport-right-offset");
    root.style.removeProperty("--tdp-viewport-bottom-offset");
    root.style.removeProperty("--tdp-viewport-left-offset");
    return;
  }

  const layoutWidth = Math.max(root.clientWidth, window.innerWidth);
  const layoutHeight = Math.max(root.clientHeight, window.innerHeight);
  const topInset = Math.max(0, visualViewport.offsetTop);
  const leftInset = Math.max(0, visualViewport.offsetLeft);
  const bottomInset = Math.max(
    0,
    layoutHeight - visualViewport.height - visualViewport.offsetTop
  );
  const rightInset = Math.max(
    0,
    layoutWidth - visualViewport.width - visualViewport.offsetLeft
  );

  root.style.setProperty(
    "--tdp-viewport-top-offset",
    `${Math.round(topInset)}px`
  );
  root.style.setProperty(
    "--tdp-viewport-right-offset",
    `${Math.round(rightInset)}px`
  );
  root.style.setProperty(
    "--tdp-viewport-bottom-offset",
    `${Math.round(bottomInset)}px`
  );
  root.style.setProperty(
    "--tdp-viewport-left-offset",
    `${Math.round(leftInset)}px`
  );
}

export function ViewportInsetVars() {
  useEffect(() => {
    let frameId = 0;

    const scheduleViewportUpdate = () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }

      frameId = window.requestAnimationFrame(() => {
        frameId = 0;
        setRootViewportInsets();
      });
    };

    scheduleViewportUpdate();

    const visualViewport = window.visualViewport;
    window.addEventListener("resize", scheduleViewportUpdate);
    window.addEventListener("orientationchange", scheduleViewportUpdate);
    visualViewport?.addEventListener("resize", scheduleViewportUpdate);
    visualViewport?.addEventListener("scroll", scheduleViewportUpdate);

    return () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }
      window.removeEventListener("resize", scheduleViewportUpdate);
      window.removeEventListener("orientationchange", scheduleViewportUpdate);
      visualViewport?.removeEventListener("resize", scheduleViewportUpdate);
      visualViewport?.removeEventListener("scroll", scheduleViewportUpdate);
    };
  }, []);

  return null;
}
