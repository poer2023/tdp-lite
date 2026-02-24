"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

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
}

export function AutoplayCoverVideo({
  src,
  className,
  poster,
  eager = false,
}: AutoplayCoverVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isReady, setIsReady] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (eager) {
      setIsInView(true);
      setShouldLoad(true);
      return;
    }

    const observer = new IntersectionObserver(
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
      observer.disconnect();
      video.pause();
    };
  }, [eager, src]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !shouldLoad) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const saveDataMode = (navigator as NavigatorWithConnection).connection?.saveData === true;
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
    <video
      ref={videoRef}
      src={shouldLoad ? src : undefined}
      crossOrigin="anonymous"
      poster={poster}
      muted
      loop
      playsInline
      preload={eager ? "metadata" : "none"}
      disablePictureInPicture
      aria-hidden="true"
      className={cn(
        "h-full w-full object-cover transition-opacity duration-500",
        isReady || !shouldLoad ? "opacity-100" : "opacity-0",
        className
      )}
      onLoadStart={() => setIsReady(false)}
      onLoadedMetadata={() => setIsReady(true)}
      onLoadedData={() => setIsReady(true)}
    />
  );
}
