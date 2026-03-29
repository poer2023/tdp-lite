"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  areHomeImagesReady,
  HOME_IMAGES_READY_EVENT,
  resolveHomeImagePhaseItem,
} from "@/components/home/homeMediaPhases";
import {
  BENTO_CARD_MEDIA_SIZES,
  buildOptimizedImageUrl,
  createOptimizedImageLoader,
} from "./mediaSizing";
import { shouldBypassNextImageOptimization } from "@/lib/mediaOptimization";

type NavigatorWithConnection = Navigator & {
  connection?: {
    saveData?: boolean;
  };
};

interface AutoplayCoverVideoProps {
  src: string;
  className?: string;
  poster?: string;
  eager?: boolean;
  suspended?: boolean;
  posterSizes?: string;
  waitForHomeImagesReady?: boolean;
  homeImagePhaseId?: string;
}

export function AutoplayCoverVideo({
  src,
  className,
  poster,
  eager = false,
  suspended = false,
  posterSizes = BENTO_CARD_MEDIA_SIZES,
  waitForHomeImagesReady = false,
  homeImagePhaseId,
}: AutoplayCoverVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const posterImageRef = useRef<HTMLImageElement | null>(null);
  const [readySrc, setReadySrc] = useState<string | null>(null);
  const [visibleSrc, setVisibleSrc] = useState<string | null>(null);
  const [loadRequestedSrc, setLoadRequestedSrc] = useState<string | null>(null);
  const isReady = readySrc === src;
  const isInView = !suspended && (eager || visibleSrc === src);
  const shouldLoad = loadRequestedSrc === src;
  const hasPosterImage = Boolean(
    poster && !(poster.startsWith("blob:") || poster.startsWith("data:"))
  );
  const bypassPosterOptimization = shouldBypassNextImageOptimization(poster);
  const optimizedPosterUrl =
    poster && !bypassPosterOptimization
      ? buildOptimizedImageUrl(
          poster,
          eager ? 640 : 384,
          undefined,
          75,
          eager ? 640 : 384
        )
      : poster;
  const posterLoader =
    poster && !bypassPosterOptimization
      ? createOptimizedImageLoader(undefined, eager ? 640 : 384)
      : undefined;

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
    let removeImagesReadyListener: (() => void) | null = null;
    let loadFrameId: number | null = null;

    const scheduleLoad = () => {
      if (typeof window === "undefined") {
        return;
      }
      if (loadFrameId !== null) {
        window.cancelAnimationFrame(loadFrameId);
      }
      loadFrameId = window.requestAnimationFrame(() => {
        loadFrameId = null;
        setLoadRequestedSrc((previous) => (previous === src ? previous : src));
      });
    };

    if (eager && !suspended) {
      let imagesReady = !waitForHomeImagesReady || areHomeImagesReady();

      const maybeSchedule = () => {
        if (imagesReady) {
          scheduleLoad();
        }
      };

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
        if (loadFrameId !== null) {
          window.cancelAnimationFrame(loadFrameId);
        }
        removeImagesReadyListener?.();
        video.pause();
      };
    }

    if (suspended) {
      return () => {
        if (loadFrameId !== null) {
          window.cancelAnimationFrame(loadFrameId);
        }
        video.pause();
      };
    }

    observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;

        if (entry.isIntersecting) {
          setVisibleSrc(src);
        } else {
          setVisibleSrc(null);
        }
      },
      {
        threshold: 0.45,
        rootMargin: "240px 0px",
      }
    );

    observer.observe(video);

    return () => {
      if (loadFrameId !== null) {
        window.cancelAnimationFrame(loadFrameId);
      }
      observer?.disconnect();
      video.pause();
    };
  }, [eager, src, suspended, waitForHomeImagesReady]);

  useEffect(() => {
    if (eager || suspended || !isInView || shouldLoad) {
      return;
    }

    let loadFrameId: number | null = null;
    const scheduleLoad = () => {
      loadFrameId = window.requestAnimationFrame(() => {
        loadFrameId = null;
        setLoadRequestedSrc((previous) => (previous === src ? previous : src));
      });
    };

    if (!waitForHomeImagesReady || areHomeImagesReady()) {
      scheduleLoad();
      return () => {
        if (loadFrameId !== null) {
          window.cancelAnimationFrame(loadFrameId);
        }
      };
    }

    const onImagesReady = () => {
      scheduleLoad();
    };

    window.addEventListener(HOME_IMAGES_READY_EVENT, onImagesReady, {
      once: true,
    });

    return () => {
      if (loadFrameId !== null) {
        window.cancelAnimationFrame(loadFrameId);
      }
      window.removeEventListener(HOME_IMAGES_READY_EVENT, onImagesReady);
    };
  }, [eager, isInView, shouldLoad, src, suspended, waitForHomeImagesReady]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !shouldLoad) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const saveDataMode =
      (navigator as NavigatorWithConnection).connection?.saveData === true;
    const canAutoplay = !(prefersReducedMotion || saveDataMode);

    if (!canAutoplay || !isInView || suspended) {
      video.pause();
      return;
    }

    video.play().catch(() => {
      // Autoplay can be blocked by browser policies.
    });
  }, [isInView, shouldLoad, src, suspended]);

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
          unoptimized={bypassPosterOptimization}
          loader={posterLoader}
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
        poster={optimizedPosterUrl}
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
        onLoadStart={() => {
          setReadySrc((previous) => (previous === src ? null : previous));
        }}
        onLoadedMetadata={() => {
          setReadySrc(src);
        }}
        onLoadedData={() => {
          setReadySrc(src);
        }}
      />
    </div>
  );
}
