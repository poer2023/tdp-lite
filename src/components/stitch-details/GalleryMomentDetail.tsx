"use client";

import { useMemo, useState, type CSSProperties } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Heart,
  MapPin,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FloatingDock } from "./FloatingDock";
import type { DetailMetaItem, FloatingDockItem } from "./types";

export interface GalleryMomentImage {
  id: string;
  src: string;
  thumbSrc?: string;
  alt?: string;
  width?: number;
  height?: number;
}

export interface GalleryMomentDetailProps {
  title: string;
  author?: string;
  seriesLabel?: string;
  paragraphs: string[];
  images: GalleryMomentImage[];
  initialIndex?: number;
  backHref?: string;
  backLabel?: string;
  likesLabel?: string;
  avatarSrc?: string;
  metaItems?: DetailMetaItem[];
  className?: string;
  showDock?: boolean;
  dockItems?: FloatingDockItem[];
  thumbnailPlacement?: "bottom" | "right";
}

const defaultDock: FloatingDockItem[] = [
  { id: "home", icon: "home", label: "Home" },
  { id: "grid", icon: "grid", label: "Feed" },
  { id: "add", icon: "plus", emphasized: true, dividerAfter: true },
  { id: "search", icon: "search", label: "Search" },
  { id: "notifications", icon: "bell", label: "Notifications", badge: true },
];

const FALLBACK_IMAGE_RATIO = 16 / 10;
const MIN_IMAGE_RATIO = 0.55;
const MAX_IMAGE_RATIO = 2.2;
const DESKTOP_MAX_MEDIA_WIDTH = 760;
const DESKTOP_MAX_MEDIA_HEIGHT = 500;
const DESKTOP_MAX_MEDIA_HEIGHT_WITH_SIDE_THUMBS = 560;
const DESKTOP_MIN_MEDIA_WIDTH = 280;
const DESKTOP_MIN_TEXT_WIDTH = 360;
const DESKTOP_MEDIA_PANEL_HORIZONTAL_PADDING = 56;
const DESKTOP_SIDE_THUMB_RAIL_WIDTH = 72;
const DESKTOP_SIDE_THUMB_RAIL_GAP = 20;
const MOBILE_REFERENCE_WIDTH = 560;
const MOBILE_MIN_MEDIA_HEIGHT = 280;
const MOBILE_MAX_MEDIA_HEIGHT = 440;

function getImageRatio(
  image: GalleryMomentImage,
  measured?: { width: number; height: number }
) {
  const width = measured?.width ?? image.width;
  const height = measured?.height ?? image.height;
  if (!width || !height) {
    return FALLBACK_IMAGE_RATIO;
  }
  return Math.max(MIN_IMAGE_RATIO, Math.min(width / height, MAX_IMAGE_RATIO));
}

function shouldSkipOptimization(src: string) {
  return src.startsWith("blob:") || src.startsWith("data:");
}

export function GalleryMomentDetail({
  title,
  author = "Anonymous",
  seriesLabel = "Perspective Series",
  paragraphs,
  images,
  initialIndex = 0,
  backHref,
  backLabel = "Back",
  likesLabel = "Liked by 12 others",
  avatarSrc,
  metaItems,
  className,
  showDock = true,
  dockItems,
  thumbnailPlacement = "bottom",
}: GalleryMomentDetailProps) {
  const safeImages = useMemo(
    () =>
      images.length > 0
        ? images
        : [
            {
              id: "fallback",
              src: "https://picsum.photos/1200/1600",
              alt: "Fallback image",
            },
          ],
    [images]
  );

  const [index, setIndex] = useState(
    Math.max(0, Math.min(initialIndex, safeImages.length - 1))
  );
  const currentImage = safeImages[index];
  const [measuredDimensions, setMeasuredDimensions] = useState<
    Record<string, { width: number; height: number }>
  >({});

  const details = metaItems ?? [
    {
      label: "Location",
      value: "35.69° N / TOKYO",
      icon: <MapPin className="h-3.5 w-3.5" />,
    },
    { label: "Date", value: "OCT 24, 2023" },
    { label: "Tech", value: "ISO 400 • f/1.8" },
    { label: "Fragment", value: "001_A" },
  ];

  const handlePrev = () =>
    setIndex((value) => (value - 1 + safeImages.length) % safeImages.length);
  const handleNext = () => setIndex((value) => (value + 1) % safeImages.length);

  const registerImageDimensions = (imageId: string, target: HTMLImageElement) => {
    const { naturalWidth, naturalHeight } = target;
    if (!naturalWidth || !naturalHeight) {
      return;
    }
    setMeasuredDimensions((previous) => {
      const existing = previous[imageId];
      if (
        existing &&
        existing.width === naturalWidth &&
        existing.height === naturalHeight
      ) {
        return previous;
      }
      return {
        ...previous,
        [imageId]: { width: naturalWidth, height: naturalHeight },
      };
    });
  };

  const currentImageRatio = useMemo(
    () => getImageRatio(currentImage, measuredDimensions[currentImage.id]),
    [currentImage, measuredDimensions]
  );
  const useRightThumbnails = thumbnailPlacement === "right";

  const layoutSizing = useMemo(() => {
    const desktopMaxMediaHeight = useRightThumbnails
      ? DESKTOP_MAX_MEDIA_HEIGHT_WITH_SIDE_THUMBS
      : DESKTOP_MAX_MEDIA_HEIGHT;
    let desktopMediaWidth = Math.min(
      DESKTOP_MAX_MEDIA_WIDTH,
      desktopMaxMediaHeight * currentImageRatio
    );
    desktopMediaWidth = Math.max(DESKTOP_MIN_MEDIA_WIDTH, desktopMediaWidth);

    let desktopMediaHeight = desktopMediaWidth / currentImageRatio;
    if (desktopMediaHeight > desktopMaxMediaHeight) {
      desktopMediaHeight = desktopMaxMediaHeight;
      desktopMediaWidth = desktopMediaHeight * currentImageRatio;
    }

    const desktopSideRailWidth = useRightThumbnails
      ? DESKTOP_SIDE_THUMB_RAIL_WIDTH
      : 0;
    const desktopSideRailGap = useRightThumbnails ? DESKTOP_SIDE_THUMB_RAIL_GAP : 0;
    const desktopPanelWidth = Math.round(
      desktopMediaWidth +
        DESKTOP_MEDIA_PANEL_HORIZONTAL_PADDING +
        desktopSideRailWidth +
        desktopSideRailGap
    );
    const mobileMediaHeight = Math.max(
      MOBILE_MIN_MEDIA_HEIGHT,
      Math.min(MOBILE_MAX_MEDIA_HEIGHT, MOBILE_REFERENCE_WIDTH / currentImageRatio)
    );

    return {
      desktopMediaWidth: Math.round(desktopMediaWidth),
      desktopMediaHeight: Math.round(desktopMediaHeight),
      desktopPanelWidth,
      desktopSideRailWidth,
      desktopSideRailGap,
      mobileMediaHeight: Math.round(mobileMediaHeight),
    };
  }, [currentImageRatio, useRightThumbnails]);

  const mediaPanelStyle = {
    "--desktop-panel-width": `${layoutSizing.desktopPanelWidth}px`,
    "--desktop-panel-min-width": `${
      DESKTOP_MIN_MEDIA_WIDTH + DESKTOP_MEDIA_PANEL_HORIZONTAL_PADDING
    }px`,
    "--desktop-panel-max-width": `calc(100% - ${DESKTOP_MIN_TEXT_WIDTH}px)`,
  } as CSSProperties;

  const mediaFrameStyle = {
    "--desktop-media-width": `${layoutSizing.desktopMediaWidth}px`,
    "--desktop-media-height": `${layoutSizing.desktopMediaHeight}px`,
    "--desktop-side-thumb-rail-width": `${layoutSizing.desktopSideRailWidth}px`,
    "--desktop-side-thumb-rail-gap": `${layoutSizing.desktopSideRailGap}px`,
    "--mobile-media-height": `${layoutSizing.mobileMediaHeight}px`,
  } as CSSProperties;

  const renderThumbButton = (image: GalleryMomentImage, imageIndex: number) => (
    <button
      key={image.id}
      type="button"
      onClick={() => setIndex(imageIndex)}
      className={cn(
        "size-14 flex-shrink-0 overflow-hidden rounded-lg transition-all",
        imageIndex === index
          ? "border-2 border-black/80 opacity-100 ring-2 ring-paper-white ring-offset-2"
          : "border border-transparent opacity-60 hover:border-black/10 hover:opacity-100"
      )}
    >
      <Image
        src={image.thumbSrc || image.src}
        alt={image.alt || `${title} thumbnail ${imageIndex + 1}`}
        width={56}
        height={56}
        unoptimized={shouldSkipOptimization(image.thumbSrc || image.src)}
        className="h-full w-full object-cover"
        onLoad={(event) => registerImageDimensions(image.id, event.currentTarget)}
      />
    </button>
  );

  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-[2rem] bg-[#e8e8e6] p-4 md:p-6 lg:p-7",
        className
      )}
    >
      <div className="relative z-10">
        <div className="mb-4">
          {backHref ? (
            <Link
              href={backHref}
              className="text-ink/80 group inline-flex items-center gap-2 rounded-full border border-black/5 bg-white/70 px-4 py-2 text-[10px] font-bold uppercase tracking-widest shadow-sm backdrop-blur-md transition-all hover:bg-white"
            >
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
              {backLabel}
            </Link>
          ) : (
            <button
              type="button"
              className="text-ink/80 group inline-flex items-center gap-2 rounded-full border border-black/5 bg-white/70 px-4 py-2 text-[10px] font-bold uppercase tracking-widest shadow-sm backdrop-blur-md transition-all hover:bg-white"
            >
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
              {backLabel}
            </button>
          )}
        </div>

        <main className="mx-auto max-w-[1180px] overflow-hidden rounded-[2.5rem] border border-white/40 bg-paper-white shadow-[0_30px_60px_-15px_rgba(0,0,0,0.06),0_10px_20px_-5px_rgba(0,0,0,0.02)]">
          <div className="flex min-h-[560px] flex-col lg:flex-row lg:items-stretch">
            <div
              className="flex flex-col justify-center bg-paper-white p-5 md:p-7 lg:flex-none lg:w-[var(--desktop-panel-width)] lg:min-w-[var(--desktop-panel-min-width)] lg:max-w-[var(--desktop-panel-max-width)] lg:transition-[width] lg:duration-700 lg:ease-[cubic-bezier(0.22,1,0.36,1)]"
              style={mediaPanelStyle}
            >
              <div
                className={cn(
                  useRightThumbnails
                    ? "lg:flex lg:items-start lg:gap-[var(--desktop-side-thumb-rail-gap)]"
                    : ""
                )}
              >
                <div
                  className="bg-paper-grey group relative mx-auto h-[var(--mobile-media-height)] w-full overflow-hidden rounded-[1.35rem] shadow-[0_24px_40px_-16px_rgba(0,0,0,0.2)] transition-[width,height,border-radius] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] lg:mx-0 lg:h-[var(--desktop-media-height)] lg:w-[var(--desktop-media-width)]"
                  style={mediaFrameStyle}
                  data-lg-media-source="gallery-moment-media"
                >
                  <Image
                    src={currentImage.src}
                    alt={currentImage.alt || title}
                    fill
                    sizes="(min-width: 1024px) 60vw, 100vw"
                    unoptimized={shouldSkipOptimization(currentImage.src)}
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.01]"
                    onLoad={(event) =>
                      registerImageDimensions(currentImage.id, event.currentTarget)
                    }
                  />
                  <div className="absolute right-6 top-6 inline-flex items-center rounded-full border border-white/10 bg-black/20 px-3 py-1.5 font-mono text-[10px] tracking-tight text-white backdrop-blur-md">
                    {String(index + 1).padStart(2, "0")} /{" "}
                    {String(safeImages.length).padStart(2, "0")}
                  </div>
                  <div className="pointer-events-none absolute inset-y-0 left-0 right-0 flex items-center justify-between px-4 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={handlePrev}
                      className="pointer-events-auto flex size-11 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur-md transition-all hover:bg-white/20"
                    >
                      <ChevronLeft className="h-6 w-6" />
                    </button>
                    <button
                      type="button"
                      onClick={handleNext}
                      className="pointer-events-auto flex size-11 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur-md transition-all hover:bg-white/20"
                    >
                      <ChevronRight className="h-6 w-6" />
                    </button>
                  </div>
                </div>

                {useRightThumbnails ? (
                  <div className="custom-scrollbar mt-4 hidden max-h-[var(--desktop-media-height)] w-[var(--desktop-side-thumb-rail-width)] flex-col items-center gap-2.5 overflow-y-auto overflow-x-hidden pr-1 lg:mt-0 lg:flex">
                    {safeImages.map((image, imageIndex) =>
                      renderThumbButton(image, imageIndex)
                    )}
                  </div>
                ) : null}
              </div>

              <div className={cn("custom-scrollbar mt-4 flex items-center gap-2.5 overflow-x-auto pb-1.5", useRightThumbnails ? "lg:hidden" : "")}>
                {safeImages.map((image, imageIndex) =>
                  renderThumbButton(image, imageIndex)
                )}
              </div>
            </div>

            <div className="relative flex min-w-0 flex-1 flex-col justify-between bg-paper-white p-6 md:p-8 lg:min-w-[360px] lg:pl-0">
              <div className="absolute bottom-12 left-0 top-12 hidden w-px bg-gradient-to-b from-transparent via-black/5 to-transparent lg:block" />

              <div className="relative z-10 space-y-6">
                <header>
                  <div className="mb-8 flex items-center gap-3">
                    <div className="bg-ink-light size-1.5 rounded-full" />
                    <span className="text-ink-light font-mono text-[10px] uppercase tracking-[0.2em]">
                      {seriesLabel}
                    </span>
                  </div>
                  <h2 className="text-ink mb-2 font-serif text-4xl italic leading-[1.1] lg:text-5xl">
                    {title}
                  </h2>
                  <p className="text-ink-light mt-2 font-mono text-[10px] uppercase tracking-widest">
                    By {author}
                  </p>
                </header>

                <article className="space-y-4 pr-2">
                  {paragraphs.map((paragraph, paragraphIndex) => (
                    <p
                      key={`${paragraph.slice(0, 12)}-${paragraphIndex}`}
                      className={cn(
                        "font-serif text-lg leading-relaxed",
                        paragraphIndex === 0 ? "text-ink/90" : "text-ink/70"
                      )}
                    >
                      {paragraph}
                    </p>
                  ))}
                </article>
              </div>

              <footer className="relative z-10 mt-8 border-t border-black/5 pt-6">
                <div className="grid grid-cols-2 gap-x-4 gap-y-6">
                  {details.map((item) => (
                    <div key={`${item.label}-${item.value}`}>
                      <p className="text-ink-light/70 mb-1.5 font-mono text-[9px] uppercase tracking-widest">
                        {item.label}
                      </p>
                      <div className="flex items-center gap-1.5">
                        {item.icon}
                        <p className="text-ink font-mono text-[11px] font-medium">
                          {item.value}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-8 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {avatarSrc ? (
                      <div className="size-6 overflow-hidden rounded-full border border-black/10">
                        <Image
                          src={avatarSrc}
                          alt="Avatar"
                          width={24}
                          height={24}
                          unoptimized={shouldSkipOptimization(avatarSrc)}
                          className="h-full w-full object-cover grayscale"
                        />
                      </div>
                    ) : null}
                    <span className="text-ink-light font-serif text-sm italic">
                      {likesLabel}
                    </span>
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      className="text-ink-light hover:text-ink flex size-8 items-center justify-center rounded-full transition-colors hover:bg-black/5"
                    >
                      <Heart className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      className="text-ink-light hover:text-ink flex size-8 items-center justify-center rounded-full transition-colors hover:bg-black/5"
                    >
                      <Bookmark className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </footer>
            </div>
          </div>
        </main>

        {showDock ? <FloatingDock items={dockItems || defaultDock} /> : null}
      </div>
    </section>
  );
}
