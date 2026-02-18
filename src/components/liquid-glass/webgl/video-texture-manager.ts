import * as THREE from "three";
import type { BackgroundLayerRecord } from "./registry";

interface VideoTextureEntry {
  layerId: string;
  sourceKey: string;
  video: HTMLVideoElement;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  texture: THREE.CanvasTexture;
  width: number;
  height: number;
  lastTime: number;
  hasUploadedFrame: boolean;
  blocked: boolean;
}

export interface VideoTextureFrameInfo {
  uploads: number;
  activeVideos: number;
  blockedVideos: number;
}

const DEFAULT_MAX_TEXTURE_SIZE = 4096;
const MIN_TEXTURE_SIDE = 2;
const FALLBACK_VIDEO_WIDTH = 640;
const FALLBACK_VIDEO_HEIGHT = 360;

function clampInt(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.floor(value)));
}

function isSecurityError(error: unknown): boolean {
  if (error instanceof DOMException) {
    return error.name === "SecurityError";
  }
  return false;
}

function resolveTargetSize(
  video: HTMLVideoElement,
  maxTextureSize: number
): { width: number; height: number } {
  const sourceWidth =
    video.videoWidth > 0 ? video.videoWidth : FALLBACK_VIDEO_WIDTH;
  const sourceHeight =
    video.videoHeight > 0 ? video.videoHeight : FALLBACK_VIDEO_HEIGHT;
  const maxSide = Math.max(MIN_TEXTURE_SIDE, maxTextureSize);
  const scale = Math.min(1, maxSide / Math.max(sourceWidth, sourceHeight));

  return {
    width: clampInt(sourceWidth * scale, MIN_TEXTURE_SIDE, maxSide),
    height: clampInt(sourceHeight * scale, MIN_TEXTURE_SIDE, maxSide),
  };
}

function canSampleVideo(video: HTMLVideoElement): boolean {
  const haveCurrentData =
    typeof HTMLMediaElement === "undefined"
      ? 2
      : HTMLMediaElement.HAVE_CURRENT_DATA;
  if (video.readyState < haveCurrentData) {
    return false;
  }
  if (video.videoWidth <= 0 || video.videoHeight <= 0) {
    return false;
  }
  return Number.isFinite(video.currentTime);
}

export class VideoTextureManager {
  private readonly entries = new Map<string, VideoTextureEntry>();

  private frameUploads = 0;

  constructor(private readonly maxTextureSize = DEFAULT_MAX_TEXTURE_SIZE) {}

  beginFrame() {
    this.frameUploads = 0;
  }

  getTextureForLayer(layer: BackgroundLayerRecord): THREE.Texture | null {
    const video = layer.videoElement;
    if (!video) {
      return null;
    }

    const existing = this.entries.get(layer.id);
    if (
      existing &&
      existing.video === video &&
      existing.sourceKey === layer.sourceKey
    ) {
      return existing.blocked ? null : existing.texture;
    }

    if (existing) {
      this.disposeEntry(existing);
      this.entries.delete(layer.id);
    }

    const created = this.createEntry(layer.id, layer.sourceKey, video);
    if (!created) {
      return null;
    }

    this.entries.set(layer.id, created);
    return created.blocked ? null : created.texture;
  }

  updateVisibleLayers(
    layers: BackgroundLayerRecord[],
    uploadBudget: number
  ): number {
    const budget = Math.max(0, Math.floor(uploadBudget));
    if (budget === 0) {
      return 0;
    }

    const orderedLayers = [...layers].sort(
      (left, right) => right.priority - left.priority
    );

    for (const layer of orderedLayers) {
      if (this.frameUploads >= budget) {
        break;
      }

      const entry = this.entries.get(layer.id);
      if (!entry || entry.blocked) {
        continue;
      }
      if (!this.shouldUpload(entry)) {
        continue;
      }
      if (this.uploadEntry(entry)) {
        this.frameUploads += 1;
      }
    }

    return this.frameUploads;
  }

  disposeLayer(layerId: string) {
    const entry = this.entries.get(layerId);
    if (!entry) {
      return;
    }
    this.disposeEntry(entry);
    this.entries.delete(layerId);
  }

  disposeAll() {
    for (const entry of this.entries.values()) {
      this.disposeEntry(entry);
    }
    this.entries.clear();
    this.frameUploads = 0;
  }

  getFrameInfo(): VideoTextureFrameInfo {
    let blockedVideos = 0;
    for (const entry of this.entries.values()) {
      if (entry.blocked) {
        blockedVideos += 1;
      }
    }

    return {
      uploads: this.frameUploads,
      activeVideos: this.entries.size,
      blockedVideos,
    };
  }

  isLayerBlocked(layerId: string): boolean {
    const entry = this.entries.get(layerId);
    return Boolean(entry?.blocked);
  }

  private createEntry(
    layerId: string,
    sourceKey: string,
    video: HTMLVideoElement
  ): VideoTextureEntry | null {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return null;
    }

    const target = resolveTargetSize(video, this.maxTextureSize);
    canvas.width = target.width;
    canvas.height = target.height;

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    texture.needsUpdate = false;

    return {
      layerId,
      sourceKey,
      video,
      canvas,
      ctx,
      texture,
      width: target.width,
      height: target.height,
      lastTime: Number.NaN,
      hasUploadedFrame: false,
      blocked: false,
    };
  }

  private shouldUpload(entry: VideoTextureEntry): boolean {
    if (!canSampleVideo(entry.video)) {
      return false;
    }

    const target = resolveTargetSize(entry.video, this.maxTextureSize);
    if (target.width !== entry.width || target.height !== entry.height) {
      return true;
    }

    if (!entry.hasUploadedFrame) {
      return true;
    }

    const timeDelta = Math.abs(entry.video.currentTime - entry.lastTime);
    if (entry.video.paused && timeDelta < 0.0005) {
      return false;
    }

    return timeDelta >= 0.0005;
  }

  private uploadEntry(entry: VideoTextureEntry): boolean {
    const target = resolveTargetSize(entry.video, this.maxTextureSize);
    if (target.width !== entry.width || target.height !== entry.height) {
      entry.canvas.width = target.width;
      entry.canvas.height = target.height;
      entry.width = target.width;
      entry.height = target.height;
    }

    try {
      entry.ctx.clearRect(0, 0, entry.width, entry.height);
      entry.ctx.drawImage(entry.video, 0, 0, entry.width, entry.height);
    } catch (error) {
      if (isSecurityError(error)) {
        entry.blocked = true;
        entry.texture.needsUpdate = false;
      }
      return false;
    }

    entry.texture.needsUpdate = true;
    entry.lastTime = entry.video.currentTime;
    entry.hasUploadedFrame = true;
    return true;
  }

  private disposeEntry(entry: VideoTextureEntry) {
    entry.texture.dispose();
  }
}
