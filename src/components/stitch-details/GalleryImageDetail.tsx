"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEventHandler,
  type PointerEventHandler,
  type WheelEventHandler,
} from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  Calendar,
  Camera,
  CircleDot,
  ExternalLink,
  Info,
  Maximize2,
  Minus,
  Plus,
  X,
} from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { toLocalizedPath } from "@/lib/locale-routing";
import type { GalleryImageAggregateDTO } from "@/lib/gallery";

interface GalleryImageDetailProps {
  locale: "en" | "zh";
  item: GalleryImageAggregateDTO;
  alternateHref?: string | null;
  alternateLabel?: string;
}

interface PointerPoint {
  x: number;
  y: number;
}

const MIN_SCALE = 1;
const MAX_SCALE = 6;

function shouldSkipOptimization(src: string): boolean {
  return src.startsWith("blob:") || src.startsWith("data:");
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function sourcePositionLabel(
  position: string,
  locale: "en" | "zh"
): string {
  switch (position) {
    case "post_cover":
      return locale === "zh" ? "文章封面" : "Post cover";
    case "post_body":
      return locale === "zh" ? "文章正文" : "Post body";
    case "moment_media":
      return locale === "zh" ? "动态媒体" : "Moment media";
    default:
      return locale === "zh" ? "来源" : "Source";
  }
}

function sourceTypeLabel(type: string, locale: "en" | "zh"): string {
  switch (type) {
    case "post":
      return locale === "zh" ? "文章" : "post";
    case "moment":
      return locale === "zh" ? "动态" : "moment";
    default:
      return type;
  }
}

function distance(a: PointerPoint, b: PointerPoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function GalleryImageDetail({
  locale,
  item,
  alternateHref,
  alternateLabel = "Switch",
}: GalleryImageDetailProps) {
  const t =
    locale === "zh"
      ? {
          back: "返回画廊",
          imageAlt: "画廊图片",
          zoom: "放大",
          titleFallback: "未命名图片",
          sourceCount: "个来源",
          latest: "最近",
          imageInfo: "图片信息",
          resolution: "分辨率",
          capturedAt: "拍摄时间",
          camera: "相机",
          lens: "镜头",
          exposure: "曝光",
          coordinates: "坐标",
          unknown: "未知",
          sources: "来源",
          reset: "重置",
          zoomLabel: "缩放",
        }
      : {
          back: "Back to Gallery",
          imageAlt: "Gallery image",
          zoom: "Zoom",
          titleFallback: "Untitled image",
          sourceCount: "source",
          latest: "latest",
          imageInfo: "Image Info",
          resolution: "Resolution",
          capturedAt: "Captured At",
          camera: "Camera",
          lens: "Lens",
          exposure: "Exposure",
          coordinates: "Coordinates",
          unknown: "Unknown",
          sources: "Sources",
          reset: "Reset",
          zoomLabel: "Zoom",
        };
  const imageSrc = item.thumbUrl || item.imageUrl;
  const [isLightboxOpen, setLightboxOpen] = useState(false);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const pointersRef = useRef<Map<number, PointerPoint>>(new Map());
  const draggingPointerRef = useRef<number | null>(null);
  const lastDragPointRef = useRef<PointerPoint | null>(null);
  const pinchStartDistanceRef = useRef<number | null>(null);
  const pinchStartScaleRef = useRef(1);

  const sortedSources = useMemo(
    () => [...item.sources].sort((a, b) => Date.parse(b.sourceDate) - Date.parse(a.sourceDate)),
    [item.sources]
  );

  const openLightbox = () => {
    setLightboxOpen(true);
    setScale(1);
    setOffset({ x: 0, y: 0 });
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
    setScale(1);
    setOffset({ x: 0, y: 0 });
    pointersRef.current.clear();
    draggingPointerRef.current = null;
    lastDragPointRef.current = null;
    pinchStartDistanceRef.current = null;
    pinchStartScaleRef.current = 1;
  };

  const updateScale = (nextScale: number) => {
    const clamped = clamp(nextScale, MIN_SCALE, MAX_SCALE);
    setScale(clamped);
    if (clamped <= 1) {
      setOffset({ x: 0, y: 0 });
    }
  };

  useEffect(() => {
    if (!isLightboxOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeLightbox();
        return;
      }

      if (event.key === "+" || event.key === "=") {
        event.preventDefault();
        updateScale(scale * 1.15);
      }

      if (event.key === "-") {
        event.preventDefault();
        updateScale(scale / 1.15);
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isLightboxOpen, scale]);

  const handleWheel: WheelEventHandler<HTMLDivElement> = (event) => {
    event.preventDefault();
    const factor = event.deltaY < 0 ? 1.12 : 0.88;
    updateScale(scale * factor);
  };

  const handleDoubleClick: MouseEventHandler<HTMLDivElement> = (event) => {
    event.preventDefault();
    if (scale > 1) {
      updateScale(1);
      return;
    }
    updateScale(2);
  };

  const handlePointerDown: PointerEventHandler<HTMLDivElement> = (event) => {
    const point = { x: event.clientX, y: event.clientY };
    pointersRef.current.set(event.pointerId, point);

    if (pointersRef.current.size === 1 && scale > 1) {
      draggingPointerRef.current = event.pointerId;
      lastDragPointRef.current = point;
    }

    if (pointersRef.current.size === 2) {
      const values = Array.from(pointersRef.current.values());
      pinchStartDistanceRef.current = distance(values[0]!, values[1]!);
      pinchStartScaleRef.current = scale;
      draggingPointerRef.current = null;
      lastDragPointRef.current = null;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove: PointerEventHandler<HTMLDivElement> = (event) => {
    if (!pointersRef.current.has(event.pointerId)) {
      return;
    }

    const point = { x: event.clientX, y: event.clientY };
    pointersRef.current.set(event.pointerId, point);

    if (pointersRef.current.size === 2 && pinchStartDistanceRef.current) {
      const values = Array.from(pointersRef.current.values());
      const currentDistance = distance(values[0]!, values[1]!);
      const nextScale =
        pinchStartScaleRef.current * (currentDistance / pinchStartDistanceRef.current);
      updateScale(nextScale);
      return;
    }

    if (
      pointersRef.current.size === 1 &&
      draggingPointerRef.current === event.pointerId &&
      lastDragPointRef.current &&
      scale > 1
    ) {
      const deltaX = point.x - lastDragPointRef.current.x;
      const deltaY = point.y - lastDragPointRef.current.y;
      lastDragPointRef.current = point;
      setOffset((previous) => ({
        x: previous.x + deltaX,
        y: previous.y + deltaY,
      }));
    }
  };

  const handlePointerUp: PointerEventHandler<HTMLDivElement> = (event) => {
    pointersRef.current.delete(event.pointerId);

    if (draggingPointerRef.current === event.pointerId) {
      draggingPointerRef.current = null;
      lastDragPointRef.current = null;
    }

    if (pointersRef.current.size < 2) {
      pinchStartDistanceRef.current = null;
      pinchStartScaleRef.current = scale;
    }
  };

  return (
    <section className="relative overflow-hidden rounded-[2rem] bg-[#e8e8e6] px-6 py-8 md:px-10 md:py-10">
      <div className="mx-auto max-w-[1240px]">
        <div className="mb-6 flex items-center justify-between gap-3">
          <Link
            href={toLocalizedPath(locale, "/gallery")}
            className="lg-chip-light text-ink/80 group inline-flex items-center gap-2 rounded-full border border-black/5 bg-white/70 px-4 py-2 text-[10px] font-bold uppercase tracking-widest shadow-sm transition-all hover:bg-white"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            {t.back}
          </Link>

          {alternateHref ? (
            <Link
              href={alternateHref}
              className="rounded-full border border-black/10 bg-white/80 px-3 py-1.5 font-mono text-[11px] uppercase tracking-widest text-[#555] transition-colors hover:border-black/20 hover:text-[#111]"
            >
              {alternateLabel}
            </Link>
          ) : null}
        </div>

        <article className="overflow-hidden rounded-[2.25rem] border border-white/40 bg-paper-white shadow-[0_30px_60px_-15px_rgba(0,0,0,0.06),0_10px_20px_-5px_rgba(0,0,0,0.02)]">
          <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_minmax(360px,1fr)]">
            <div className="bg-paper-grey/40 p-5 md:p-8">
              <button
                type="button"
                onClick={openLightbox}
                className="group relative block w-full overflow-hidden rounded-[1.5rem] border border-black/5 bg-black/5 text-left"
                data-lg-media-source="gallery-image-media"
              >
                <Image
                  src={imageSrc}
                  alt={item.title || t.imageAlt}
                  width={item.width || 1600}
                  height={item.height || 1000}
                  unoptimized={shouldSkipOptimization(imageSrc)}
                  sizes="(min-width: 1024px) 60vw, 100vw"
                  className="h-auto w-full object-cover transition-transform duration-500 group-hover:scale-[1.01]"
                />

                <div className="lg-chip-dark absolute right-4 top-4 inline-flex items-center gap-1 rounded-full border border-white/20 bg-black/25 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-white">
                  <Maximize2 className="h-3.5 w-3.5" />
                  {t.zoom}
                </div>
              </button>
            </div>

            <div className="border-l border-black/5 bg-paper-white px-6 py-7 md:px-8 md:py-8">
              <header className="border-b border-black/5 pb-6">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#777]">
                  {locale === "zh" ? "纯粹画廊" : "Pure Gallery"}
                </p>
                <h1 className="mt-2 font-serif text-4xl italic leading-tight text-[#111]">
                  {item.title || t.titleFallback}
                </h1>
                <p className="mt-3 font-mono text-[11px] uppercase tracking-wider text-[#666]">
                  {item.sourceCount}{" "}
                  {locale === "zh"
                    ? t.sourceCount
                    : `${t.sourceCount}${item.sourceCount === 1 ? "" : "s"}`}{" "}
                  • {t.latest} {formatDate(item.latestAt, locale)}
                </p>
              </header>

              <section className="mt-6 space-y-4 border-b border-black/5 pb-6">
                <div className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-[#777]">
                  <Info className="h-3.5 w-3.5" />
                  {t.imageInfo}
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                  <div>
                    <p className="font-mono text-[9px] uppercase tracking-widest text-[#888]">
                      {t.resolution}
                    </p>
                    <p className="mt-1 font-mono text-xs text-[#222]">
                      {item.width && item.height
                        ? `${item.width} × ${item.height}`
                        : t.unknown}
                    </p>
                  </div>

                  <div>
                    <p className="font-mono text-[9px] uppercase tracking-widest text-[#888]">
                      {t.capturedAt}
                    </p>
                    <p className="mt-1 font-mono text-xs text-[#222]">
                      {item.capturedAt
                        ? formatDate(item.capturedAt, locale)
                        : t.unknown}
                    </p>
                  </div>

                  <div>
                    <p className="font-mono text-[9px] uppercase tracking-widest text-[#888]">
                      {t.camera}
                    </p>
                    <p className="mt-1 font-mono text-xs text-[#222]">{item.camera || "-"}</p>
                  </div>

                  <div>
                    <p className="font-mono text-[9px] uppercase tracking-widest text-[#888]">
                      {t.lens}
                    </p>
                    <p className="mt-1 font-mono text-xs text-[#222]">{item.lens || "-"}</p>
                  </div>

                  <div>
                    <p className="font-mono text-[9px] uppercase tracking-widest text-[#888]">
                      {t.exposure}
                    </p>
                    <p className="mt-1 font-mono text-xs text-[#222]">
                      {[item.focalLength, item.aperture, item.iso ? `ISO ${item.iso}` : null]
                        .filter(Boolean)
                        .join(" • ") || "-"}
                    </p>
                  </div>

                  <div>
                    <p className="font-mono text-[9px] uppercase tracking-widest text-[#888]">
                      {t.coordinates}
                    </p>
                    <p className="mt-1 font-mono text-xs text-[#222]">
                      {typeof item.latitude === "number" && typeof item.longitude === "number"
                        ? `${item.latitude.toFixed(4)}, ${item.longitude.toFixed(4)}`
                        : "-"}
                    </p>
                  </div>
                </div>
              </section>

              <section className="mt-6 space-y-3">
                <div className="mb-1 flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-[#777]">
                  <Calendar className="h-3.5 w-3.5" />
                  {t.sources}
                </div>

                <div className="space-y-2.5">
                  {sortedSources.map((source) => (
                    <Link
                      key={`${source.sourceType}-${source.sourceId}-${source.position}-${source.mediaIndex ?? ""}`}
                      href={source.sourcePath}
                      className="group flex items-center justify-between rounded-xl border border-black/6 bg-white/70 px-3 py-2.5 transition-colors hover:border-black/15 hover:bg-white"
                    >
                      <div className="min-w-0">
                        <p className="line-clamp-1 text-sm text-[#111]">{source.sourceTitle}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-[#666]">
                          <span className="inline-flex items-center gap-1">
                            <CircleDot className="h-2.5 w-2.5" />
                            {sourceTypeLabel(source.sourceType, locale)}
                          </span>
                          <span>{sourcePositionLabel(source.position, locale)}</span>
                          <span>{formatDate(source.sourceDate, locale)}</span>
                        </div>
                      </div>
                      <ExternalLink className="h-4 w-4 shrink-0 text-[#666] transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </article>
      </div>

      {isLightboxOpen ? (
        <div className="fixed inset-0 z-[80] bg-black/92" role="dialog" aria-modal="true">
          <div className="absolute right-4 top-4 z-[90] flex items-center gap-2">
              <button
                type="button"
                onClick={() => updateScale(scale / 1.15)}
                className="lg-chip-dark inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition hover:bg-white/20"
              >
              <Minus className="h-4 w-4" />
            </button>
              <button
                type="button"
                onClick={() => updateScale(scale * 1.15)}
                className="lg-chip-dark inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition hover:bg-white/20"
              >
              <Plus className="h-4 w-4" />
            </button>
              <button
                type="button"
                onClick={() => {
                  updateScale(1);
                  setOffset({ x: 0, y: 0 });
                }}
                className="lg-chip-dark inline-flex h-10 items-center justify-center rounded-full border border-white/20 bg-white/10 px-4 font-mono text-[11px] uppercase tracking-wider text-white transition hover:bg-white/20"
              >
              {t.reset}
            </button>
              <button
                type="button"
                onClick={closeLightbox}
                className="lg-chip-dark inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition hover:bg-white/20"
              >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div
            className={cn(
              "absolute inset-0 flex items-center justify-center px-4 py-16",
              scale > 1 ? "cursor-grab active:cursor-grabbing" : "cursor-zoom-in"
            )}
            onWheel={handleWheel}
            onDoubleClick={handleDoubleClick}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onClick={(event) => {
              if (event.target === event.currentTarget) {
                closeLightbox();
              }
            }}
          >
            <Image
              src={item.imageUrl}
              alt={item.title || t.imageAlt}
              width={item.width || 1920}
              height={item.height || 1080}
              unoptimized={shouldSkipOptimization(item.imageUrl)}
              draggable={false}
              className="max-h-full max-w-full select-none object-contain"
              style={{
                transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
                transformOrigin: "center center",
                transition: "transform 120ms ease-out",
              }}
            />
          </div>

          <div className="pointer-events-none absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full border border-white/20 bg-black/35 px-4 py-2 font-mono text-[11px] uppercase tracking-widest text-white">
            <span className="inline-flex items-center gap-2">
              <Camera className="h-3.5 w-3.5" />
              {t.zoomLabel} {Math.round(scale * 100)}%
            </span>
          </div>
        </div>
      ) : null}
    </section>
  );
}
