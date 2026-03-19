"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

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
}

export function AutoplayCoverVideo({
  src,
  className,
  poster,
  eager = false,
  posterSizes = "(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw",
}: AutoplayCoverVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
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
    const video = videoRef.current;
    if (!video) return;

    let observer: IntersectionObserver | null = null;
    let timeoutId: number | null = null;
    let idleCallbackId: number | null = null;

    const scheduleLoad = () => {
      setShouldLoad(true);
    };

    if (eager) {
      setIsInView(true);
      if (hasPosterImage) {
        const idleWindow = window as WindowWithIdleCallback;
        if (typeof idleWindow.requestIdleCallback === "function") {
          idleCallbackId = idleWindow.requestIdleCallback(scheduleLoad, {
            timeout: 1200,
          });
        } else {
          timeoutId = window.setTimeout(scheduleLoad, 350);
        }
      } else {
        scheduleLoad();
      }
      return () => {
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
          setShouldLoad(true);
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
  }, [eager, hasPosterImage, src]);

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
          src={poster!}
          alt=""
          aria-hidden="true"
          fill
          sizes={posterSizes}
          priority={eager}
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
