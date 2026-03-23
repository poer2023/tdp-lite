"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  areHomeImagesReady,
  HOME_IMAGES_READY_EVENT,
  resolveHomeImagePhaseItem,
} from "@/components/home/homeMediaPhases";

type NavigatorWithConnection = Navigator & {
  connection?: {
    saveData?: boolean;
  };
};

type WindowWithIdleCallback = Window & {
  requestIdleCallback?: (
    callback: IdleRequestCallback,
    options?: IdleRequestOptions
  ) => number;
  cancelIdleCallback?: (handle: number) => void;
};

interface AutoplayCoverVideoProps {
  src: string;
  className?: string;
  poster?: string;
  eager?: boolean;
  posterSizes?: string;
  waitForHomeImagesReady?: boolean;
  homeImagePhaseId?: string;
}

export function AutoplayCoverVideo({
  src,
  className,
  poster,
  eager = false,
  posterSizes = "(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw",
  waitForHomeImagesReady = false,
  homeImagePhaseId,
}: AutoplayCoverVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const posterImageRef = useRef<HTMLImageElement | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [shouldLoad, setShouldLoad] = useState(false);
  const hasPosterImage = Boolean(
    poster && !(poster.startsWith("blob:") || poster.startsWith("data:"))
  );

  useEffect(() => {
    setIsReady(false);
    setIsInView(false);
    setShouldLoad(false);
  }, [src]);

  useEffect(() => {
    if (!homeImagePhaseId) {
      return;
    }

    if (!hasPosterImage) {
      resolveHomeImagePhaseItem(homeImagePhaseId);
      return;
    }

    const node = posterImageRef.current;
    if (node?.complete && node.naturalWidth > 0) {
      resolveHomeImagePhaseItem(homeImagePhaseId);
    }
  }, [hasPosterImage, homeImagePhaseId, poster, src]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let observer: IntersectionObserver | null = null;
    let timeoutId: number | null = null;
    let idleCallbackId: number | null = null;
    let removeLoadListener: (() => void) | null = null;
    let removeImagesReadyListener: (() => void) | null = null;
    let hasScheduled = false;

    const scheduleLoad = () => {
      setShouldLoad(true);
    };

    const scheduleEagerLoad = () => {
      if (hasScheduled) {
        return;
      }

      hasScheduled = true;
      const idleWindow = window as WindowWithIdleCallback;
      if (typeof idleWindow.requestIdleCallback === "function") {
        idleCallbackId = idleWindow.requestIdleCallback(scheduleLoad, {
          timeout: 1200,
        });
        return;
      }

      timeoutId = window.setTimeout(scheduleLoad, 120);
    };

    if (eager) {
      setIsInView(true);
      let pageReady = document.readyState === "complete";
      let imagesReady = !waitForHomeImagesReady || areHomeImagesReady();

      const maybeSchedule = () => {
        if (pageReady && imagesReady) {
          scheduleEagerLoad();
        }
      };

      if (!pageReady) {
        const onLoad = () => {
          pageReady = true;
          maybeSchedule();
        };
        window.addEventListener("load", onLoad, { once: true });
        removeLoadListener = () => {
          window.removeEventListener("load", onLoad);
        };
      }

      if (waitForHomeImagesReady && !imagesReady) {
        const onImagesReady = () => {
          imagesReady = true;
          maybeSchedule();
        };
        window.addEventListener(HOME_IMAGES_READY_EVENT, onImagesReady);
        removeImagesReadyListener = () => {
          window.removeEventListener(HOME_IMAGES_READY_EVENT, onImagesReady);
        };
      }

      maybeSchedule();

      return () => {
        removeLoadListener?.();
        removeImagesReadyListener?.();
        if (
          idleCallbackId !== null &&
          typeof (window as WindowWithIdleCallback).cancelIdleCallback ===
            "function"
        ) {
          (window as WindowWithIdleCallback).cancelIdleCallback?.(idleCallbackId);
        }
        if (timeoutId !== null) {
          window.clearTimeout(timeoutId);
        }
        video.pause();
      };
    }

    observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;

        if (entry.isIntersecting) {
          setIsInView(true);
        } else {
          setIsInView(false);
        }
      },
      {
        threshold: 0.45,
        rootMargin: "240px 0px",
      }
    );

    observer.observe(video);

    return () => {
      observer?.disconnect();
      video.pause();
    };
  }, [eager, src, waitForHomeImagesReady]);

  useEffect(() => {
    if (eager || !isInView || shouldLoad) {
      return;
    }

    if (!waitForHomeImagesReady || areHomeImagesReady()) {
      setShouldLoad(true);
      return;
    }

    const onImagesReady = () => {
      setShouldLoad(true);
    };

    window.addEventListener(HOME_IMAGES_READY_EVENT, onImagesReady, {
      once: true,
    });

    return () => {
      window.removeEventListener(HOME_IMAGES_READY_EVENT, onImagesReady);
    };
  }, [eager, isInView, shouldLoad, waitForHomeImagesReady]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !shouldLoad) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const saveDataMode =
      (navigator as NavigatorWithConnection).connection?.saveData === true;
    const canAutoplay = !(prefersReducedMotion || saveDataMode);

    if (!canAutoplay || !isInView) {
      video.pause();
      return;
    }

    video.play().catch(() => {
      // Autoplay can be blocked by browser policies.
    });
  }, [isInView, shouldLoad, src]);

  return (
    <div className={cn("relative h-full w-full overflow-hidden", className)}>
      {hasPosterImage ? (
        <Image
          ref={posterImageRef}
          src={poster!}
          alt=""
          aria-hidden="true"
          fill
          sizes={posterSizes}
          priority={eager}
          onLoad={() => resolveHomeImagePhaseItem(homeImagePhaseId)}
          onError={() => resolveHomeImagePhaseItem(homeImagePhaseId)}
          className={cn(
            "object-cover transition-opacity duration-500",
            shouldLoad && isReady ? "opacity-0" : "opacity-100"
          )}
        />
      ) : null}
      <video
        ref={videoRef}
        src={shouldLoad ? src : undefined}
        crossOrigin="anonymous"
        poster={poster}
        muted
        loop
        playsInline
        preload="none"
        disablePictureInPicture
        aria-hidden="true"
        className={cn(
          "absolute inset-0 h-full w-full object-cover transition-opacity duration-500",
          isReady ? "opacity-100" : hasPosterImage ? "opacity-0" : "opacity-100"
        )}
        onLoadStart={() => setIsReady(false)}
        onLoadedMetadata={() => setIsReady(true)}
        onLoadedData={() => setIsReady(true)}
      />
    </div>
  );
}
