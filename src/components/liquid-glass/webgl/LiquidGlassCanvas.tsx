"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { PerfController, type PerfState } from "./perf-controller";
import { getProfile } from "./profiles";
import type {
  BackgroundLayerRecord,
  GlassSurfaceRecord,
  LiquidGlassRegistry,
  RegistrySnapshot,
} from "./registry";
import { VideoTextureManager } from "./video-texture-manager";
import {
  compositeFragmentSource,
  compositeVertexSource,
  refractionFragmentSource,
  refractionVertexSource,
} from "./shader-sources";

interface LiquidGlassCanvasProps {
  registry: LiquidGlassRegistry;
  perfController: PerfController;
  forceBoost?: number;
}

interface MeshRecord {
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.Material>;
  geometry: THREE.PlaneGeometry;
  material: THREE.Material;
  texture: THREE.Texture | null;
  ownsTexture: boolean;
}

interface GlassMeshRecord {
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  geometry: THREE.PlaneGeometry;
  material: THREE.ShaderMaterial;
}

interface Pipeline {
  camera: THREE.OrthographicCamera;
  backgroundScene: THREE.Scene;
  glassScene: THREE.Scene;
  compositeScene: THREE.Scene;
  sceneTarget: THREE.WebGLRenderTarget;
  glassTarget: THREE.WebGLRenderTarget;
  compositeMaterial: THREE.ShaderMaterial;
  compositeMesh: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
}

interface RenderHudMetrics extends PerfState {
  activeSurfaces: number;
  activeLayers: number;
  videoUploads: number;
  effectiveStrength: number;
}

const HUD_UPDATE_MS = 240;
const imageTextureCache = new Map<string, THREE.Texture>();
const imageTextureLoader = new THREE.TextureLoader();

const RGBA_PATTERN =
  /^rgba?\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)(?:\s*[,/]\s*([0-9.]+))?\s*\)$/i;

interface ParsedColorStyle {
  style: string;
  alpha: number;
}

function parseColorStyle(value: string, fallback = "#f0f0ee"): ParsedColorStyle {
  const input = value.trim();
  const rgbaMatch = input.match(RGBA_PATTERN);
  if (rgbaMatch) {
    const r = Number.parseFloat(rgbaMatch[1] ?? "0");
    const g = Number.parseFloat(rgbaMatch[2] ?? "0");
    const b = Number.parseFloat(rgbaMatch[3] ?? "0");
    const alpha = Number.parseFloat(rgbaMatch[4] ?? "1");
    const clampedR = Number.isFinite(r) ? Math.min(255, Math.max(0, r)) : 0;
    const clampedG = Number.isFinite(g) ? Math.min(255, Math.max(0, g)) : 0;
    const clampedB = Number.isFinite(b) ? Math.min(255, Math.max(0, b)) : 0;
    const clampedA = Number.isFinite(alpha) ? Math.min(1, Math.max(0, alpha)) : 1;
    return {
      style: `rgb(${Math.round(clampedR)}, ${Math.round(clampedG)}, ${Math.round(clampedB)})`,
      alpha: clampedA,
    };
  }

  return {
    style: input || fallback,
    alpha: 1,
  };
}

function toSafeColor(value: string, fallback = "#f0f0ee"): THREE.Color {
  const color = new THREE.Color();
  const parsed = parseColorStyle(value, fallback);
  try {
    color.setStyle(parsed.style);
    return color;
  } catch {
    color.setStyle(fallback);
    return color;
  }
}

function isSafeTextureSource(src: string): boolean {
  if (!src) {
    return false;
  }
  if (src.startsWith("blob:") || src.startsWith("data:")) {
    return true;
  }
  try {
    const resolved = new URL(src, window.location.href);
    return resolved.origin === window.location.origin;
  } catch {
    return false;
  }
}

function getCachedImageTexture(src: string): THREE.Texture {
  const cached = imageTextureCache.get(src);
  if (cached) {
    return cached;
  }

  const texture = imageTextureLoader.load(
    src,
    undefined,
    undefined,
    () => {
      imageTextureCache.delete(src);
    }
  );
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  imageTextureCache.set(src, texture);
  return texture;
}

function resolveVideoPosterUrl(layer: BackgroundLayerRecord): string | null {
  const poster = layer.videoElement?.poster?.trim();
  if (!poster) {
    return null;
  }
  return isSafeTextureSource(poster) ? poster : null;
}

function createLayerTexture(
  layer: BackgroundLayerRecord,
  videoTextureManager: VideoTextureManager | null
): THREE.Texture | null {
  if (layer.videoElement && videoTextureManager) {
    const dynamicTexture = videoTextureManager.getTextureForLayer(layer);
    if (dynamicTexture) {
      return dynamicTexture;
    }

    const poster = resolveVideoPosterUrl(layer);
    if (poster) {
      return getCachedImageTexture(poster);
    }
  }

  if (layer.imageElement) {
    const src = layer.imageElement.currentSrc || layer.imageElement.src;
    if (isSafeTextureSource(src)) {
      return getCachedImageTexture(src);
    }
  }

  return null;
}

function createRenderTarget(width: number, height: number): THREE.WebGLRenderTarget {
  const target = new THREE.WebGLRenderTarget(width, height, {
    depthBuffer: false,
    stencilBuffer: false,
    format: THREE.RGBAFormat,
    type: THREE.UnsignedByteType,
  });
  target.texture.colorSpace = THREE.SRGBColorSpace;
  return target;
}

function disposeMeshRecord(record: MeshRecord) {
  record.geometry.dispose();
  record.material.dispose();
  if (record.ownsTexture) {
    record.texture?.dispose();
  }
}

function disposeGlassMeshRecord(record: GlassMeshRecord) {
  record.geometry.dispose();
  record.material.dispose();
}

function buildLayerMesh(
  layer: BackgroundLayerRecord,
  videoTextureManager: VideoTextureManager | null
): MeshRecord | null {
  if (layer.rect.width <= 0 || layer.rect.height <= 0) {
    return null;
  }

  const geometry = new THREE.PlaneGeometry(layer.rect.width, layer.rect.height);
  const texture = createLayerTexture(layer, videoTextureManager);
  const parsedColor = parseColorStyle(layer.color, "#e9e9e7");
  const colorAlpha = texture ? 1 : parsedColor.alpha;
  const effectiveOpacity = layer.visible ? layer.opacity * colorAlpha : 0;

  if (!texture && effectiveOpacity <= 0.01) {
    geometry.dispose();
    return null;
  }

  const material = new THREE.MeshBasicMaterial({
    color: texture ? "#ffffff" : toSafeColor(parsedColor.style, "#e9e9e7"),
    map: texture,
    transparent: true,
    opacity: effectiveOpacity,
    depthWrite: false,
    toneMapped: false,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(
    layer.rect.left + layer.rect.width / 2,
    layer.rect.top + layer.rect.height / 2,
    layer.priority * 0.001
  );

  return { mesh, geometry, material, texture, ownsTexture: false };
}

function buildGlassMesh(
  surface: GlassSurfaceRecord,
  sceneTexture: THREE.Texture
): GlassMeshRecord {
  const profile = getProfile(surface.profileKey);
  const geometry = new THREE.PlaneGeometry(surface.rect.width, surface.rect.height);
  const fillColor = toSafeColor(surface.fillColor || "rgba(255,255,255,0.12)");
  const maxRadiusPx = Math.max(
    0,
    Math.min(surface.rect.width, surface.rect.height) * 0.5 - 0.5
  );
  const radiusPx = Math.min(Math.max(0, surface.borderRadiusPx), maxRadiusPx);

  const material = new THREE.ShaderMaterial({
    vertexShader: refractionVertexSource,
    fragmentShader: refractionFragmentSource,
    transparent: true,
    depthWrite: false,
    uniforms: {
      uSceneTex: { value: sceneTexture },
      uViewport: { value: new THREE.Vector2(1, 1) },
      uRenderResolution: { value: new THREE.Vector2(1, 1) },
      uRect: {
        value: new THREE.Vector4(
          surface.rect.left,
          surface.rect.top,
          surface.rect.width,
          surface.rect.height
        ),
      },
      uSurfaceSize: {
        value: new THREE.Vector2(surface.rect.width, surface.rect.height),
      },
      uFillColor: { value: fillColor },
      uFillOpacity: { value: profile.fillOpacity },
      uBlurStrength: { value: profile.blurStrength },
      uEdgeInnerPx: { value: profile.edgeInnerPx },
      uEdgeOuterPx: { value: profile.edgeOuterPx },
      uStrength: { value: profile.strength },
      uStrengthMultiplier: { value: 1 },
      uChroma: { value: profile.chromaAmount },
      uRim: { value: profile.rimIntensity },
      uRadiusPx: { value: radiusPx },
      uNoise: { value: 0.018 },
      uTime: { value: 0 },
    },
  });
  material.userData.baseChromaAmount = profile.chromaAmount;

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(
    surface.rect.left + surface.rect.width / 2,
    surface.rect.top + surface.rect.height / 2,
    5
  );

  return { mesh, geometry, material };
}

function LiquidGlassRenderer({
  snapshot,
  perfController,
  forceBoost,
  onMetrics,
}: {
  snapshot: RegistrySnapshot;
  perfController: PerfController;
  forceBoost: number;
  onMetrics: (next: RenderHudMetrics) => void;
}) {
  const { gl, size, clock } = useThree();

  const pipelineRef = useRef<Pipeline | null>(null);
  const layerMeshesRef = useRef<Map<string, MeshRecord>>(new Map());
  const glassMeshesRef = useRef<Map<string, GlassMeshRecord>>(new Map());
  const videoTextureManagerRef = useRef<VideoTextureManager | null>(null);
  const currentScaleRef = useRef(1);
  const hudTimestampRef = useRef(0);

  useEffect(() => {
    gl.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    const layerMeshes = layerMeshesRef.current;
    const glassMeshes = glassMeshesRef.current;

    const camera = new THREE.OrthographicCamera(0, size.width, size.height, 0, -100, 100);
    camera.position.set(0, 0, 10);

    const backgroundScene = new THREE.Scene();
    const glassScene = new THREE.Scene();
    const compositeScene = new THREE.Scene();

    const sceneTarget = createRenderTarget(Math.max(1, Math.floor(size.width)), Math.max(1, Math.floor(size.height)));
    const glassTarget = createRenderTarget(Math.max(1, Math.floor(size.width)), Math.max(1, Math.floor(size.height)));

    const compositeMaterial = new THREE.ShaderMaterial({
      vertexShader: compositeVertexSource,
      fragmentShader: compositeFragmentSource,
      transparent: true,
      depthWrite: false,
      uniforms: {
        uGlassTex: { value: glassTarget.texture },
        uTime: { value: 0 },
      },
    });

    const compositeMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(size.width, size.height),
      compositeMaterial
    );
    compositeMesh.position.set(size.width / 2, size.height / 2, 0);
    compositeScene.add(compositeMesh);

    pipelineRef.current = {
      camera,
      backgroundScene,
      glassScene,
      compositeScene,
      sceneTarget,
      glassTarget,
      compositeMaterial,
      compositeMesh,
    };
    videoTextureManagerRef.current = new VideoTextureManager(
      gl.capabilities.maxTextureSize
    );

    return () => {
      for (const record of layerMeshes.values()) {
        pipelineRef.current?.backgroundScene.remove(record.mesh);
        disposeMeshRecord(record);
      }
      layerMeshes.clear();

      for (const record of glassMeshes.values()) {
        pipelineRef.current?.glassScene.remove(record.mesh);
        disposeGlassMeshRecord(record);
      }
      glassMeshes.clear();

      compositeMesh.geometry.dispose();
      compositeMaterial.dispose();
      sceneTarget.dispose();
      glassTarget.dispose();
      videoTextureManagerRef.current?.disposeAll();
      videoTextureManagerRef.current = null;
      pipelineRef.current = null;
    };
  }, [gl, size.height, size.width]);

  useEffect(() => {
    const pipeline = pipelineRef.current;
    if (!pipeline) {
      return;
    }

    pipeline.camera.left = 0;
    pipeline.camera.right = size.width;
    pipeline.camera.top = 0;
    pipeline.camera.bottom = size.height;
    pipeline.camera.updateProjectionMatrix();

    const geometry = pipeline.compositeMesh.geometry;
    geometry.dispose();
    pipeline.compositeMesh.geometry = new THREE.PlaneGeometry(size.width, size.height);
    pipeline.compositeMesh.position.set(size.width / 2, size.height / 2, 0);
  }, [size.height, size.width]);

  useEffect(() => {
    const pipeline = pipelineRef.current;
    const videoTextureManager = videoTextureManagerRef.current;
    if (!pipeline) {
      return;
    }

    for (const [id, record] of layerMeshesRef.current.entries()) {
      if (snapshot.layers.some((layer) => layer.id === id)) {
        continue;
      }
      pipeline.backgroundScene.remove(record.mesh);
      disposeMeshRecord(record);
      videoTextureManager?.disposeLayer(id);
      layerMeshesRef.current.delete(id);
    }

    for (const layer of snapshot.layers) {
      if (!layer.visible) {
        const existing = layerMeshesRef.current.get(layer.id);
        if (existing) {
          pipeline.backgroundScene.remove(existing.mesh);
          disposeMeshRecord(existing);
          videoTextureManager?.disposeLayer(layer.id);
          layerMeshesRef.current.delete(layer.id);
        }
        continue;
      }

      const existing = layerMeshesRef.current.get(layer.id);
      if (existing) {
        pipeline.backgroundScene.remove(existing.mesh);
        disposeMeshRecord(existing);
        layerMeshesRef.current.delete(layer.id);
      }

      const next = buildLayerMesh(layer, videoTextureManager);
      if (next) {
        pipeline.backgroundScene.add(next.mesh);
        layerMeshesRef.current.set(layer.id, next);
      }
    }

    for (const [id, record] of glassMeshesRef.current.entries()) {
      if (snapshot.surfaces.some((surface) => surface.id === id)) {
        continue;
      }
      pipeline.glassScene.remove(record.mesh);
      disposeGlassMeshRecord(record);
      glassMeshesRef.current.delete(id);
    }

    for (const surface of snapshot.surfaces) {
      if (!surface.visible) {
        const existing = glassMeshesRef.current.get(surface.id);
        if (existing) {
          pipeline.glassScene.remove(existing.mesh);
          disposeGlassMeshRecord(existing);
          glassMeshesRef.current.delete(surface.id);
        }
        continue;
      }

      const existing = glassMeshesRef.current.get(surface.id);
      if (existing) {
        pipeline.glassScene.remove(existing.mesh);
        disposeGlassMeshRecord(existing);
        glassMeshesRef.current.delete(surface.id);
      }

      const next = buildGlassMesh(surface, pipeline.sceneTarget.texture);
      pipeline.glassScene.add(next.mesh);
      glassMeshesRef.current.set(surface.id, next);
    }
  }, [snapshot]);

  useFrame((_state, delta) => {
    const pipeline = pipelineRef.current;
    const videoTextureManager = videoTextureManagerRef.current;
    if (!pipeline) {
      return;
    }

    const perf = perfController.update(delta * 1000);

    if (Math.abs(perf.internalScale - currentScaleRef.current) > 0.001) {
      currentScaleRef.current = perf.internalScale;
      const width = Math.max(1, Math.floor(size.width * perf.internalScale));
      const height = Math.max(1, Math.floor(size.height * perf.internalScale));
      pipeline.sceneTarget.setSize(width, height);
      pipeline.glassTarget.setSize(width, height);
    }

    const renderResolution = new THREE.Vector2(
      Math.max(1, Math.floor(size.width * perf.internalScale)),
      Math.max(1, Math.floor(size.height * perf.internalScale))
    );
    const viewportResolution = new THREE.Vector2(
      Math.max(1, Math.floor(size.width)),
      Math.max(1, Math.floor(size.height))
    );

    for (const record of glassMeshesRef.current.values()) {
      record.material.uniforms.uViewport.value.copy(viewportResolution);
      record.material.uniforms.uRenderResolution.value.copy(renderResolution);
      record.material.uniforms.uStrengthMultiplier.value = Math.min(
        3,
        perf.strengthMultiplier * forceBoost
      );
      const chromaBase = Number(record.material.userData.baseChromaAmount ?? 0);
      record.material.uniforms.uChroma.value = perf.chromaEnabled ? chromaBase : 0;
      record.material.uniforms.uTime.value = clock.elapsedTime;
    }

    let videoUploads = 0;
    if (videoTextureManager) {
      videoTextureManager.beginFrame();
      const visibleVideoLayers = snapshot.layers.filter(
        (layer) => layer.visible && Boolean(layer.videoElement)
      );
      const uploadBudget = perf.internalScale <= 0.8 ? 2 : 4;
      videoUploads = videoTextureManager.updateVisibleLayers(
        visibleVideoLayers,
        uploadBudget
      );

      for (const layer of visibleVideoLayers) {
        const layerRecord = layerMeshesRef.current.get(layer.id);
        if (!layerRecord) {
          continue;
        }

        const material = layerRecord.material as THREE.MeshBasicMaterial;
        if (videoTextureManager.isLayerBlocked(layer.id)) {
          const posterUrl = resolveVideoPosterUrl(layer);
          const fallbackTexture = posterUrl
            ? getCachedImageTexture(posterUrl)
            : null;
          if (material.map !== fallbackTexture) {
            material.map = fallbackTexture;
            material.needsUpdate = true;
          }
          continue;
        }

        const dynamicTexture = videoTextureManager.getTextureForLayer(layer);
        if (dynamicTexture && material.map !== dynamicTexture) {
          material.map = dynamicTexture;
          material.needsUpdate = true;
        }
      }
    }

    pipeline.compositeMaterial.uniforms.uTime.value = clock.elapsedTime;

    gl.setRenderTarget(pipeline.sceneTarget);
    gl.setClearColor(new THREE.Color(0x000000), 0);
    gl.clear(true, true, true);
    gl.render(pipeline.backgroundScene, pipeline.camera);

    gl.setRenderTarget(pipeline.glassTarget);
    gl.setClearColor(new THREE.Color(0x000000), 0);
    gl.clear(true, true, true);
    gl.render(pipeline.glassScene, pipeline.camera);

    gl.setRenderTarget(null);
    gl.clearDepth();
    gl.render(pipeline.compositeScene, pipeline.camera);

    const now = performance.now();
    if (now - hudTimestampRef.current > HUD_UPDATE_MS) {
      hudTimestampRef.current = now;
      onMetrics({
        ...perf,
        activeSurfaces: glassMeshesRef.current.size,
        activeLayers: layerMeshesRef.current.size,
        videoUploads,
        effectiveStrength: Math.min(3, perf.strengthMultiplier * forceBoost),
      });
    }
  }, 1);

  return null;
}

function PerfHud({ metrics }: { metrics: RenderHudMetrics }) {
  return (
    <div className="lg-webgl-hud" aria-hidden="true">
      <span>fpsAvg {metrics.fpsAvg.toFixed(1)}</span>
      <span>frameP95 {metrics.frameP95.toFixed(2)}ms</span>
      <span>surfaces {metrics.activeSurfaces}</span>
      <span>layers {metrics.activeLayers}</span>
      <span>videoUploads {metrics.videoUploads}</span>
      <span>scale {metrics.internalScale.toFixed(2)}</span>
      <span>chroma {metrics.chromaEnabled ? "on" : "off"}</span>
      <span>strength {metrics.effectiveStrength.toFixed(2)}</span>
    </div>
  );
}

export function LiquidGlassCanvas({
  registry,
  perfController,
  forceBoost = 1,
}: LiquidGlassCanvasProps) {
  const [snapshot, setSnapshot] = useState<RegistrySnapshot>(registry.getState());
  const [metrics, setMetrics] = useState<RenderHudMetrics>({
    ...perfController.getState(),
    activeSurfaces: 0,
    activeLayers: 0,
    videoUploads: 0,
    effectiveStrength: 1,
  });

  useEffect(() => {
    return registry.subscribe((next) => {
      setSnapshot(next);
    });
  }, [registry]);

  const showHud = useMemo(
    () => process.env.NODE_ENV !== "production",
    []
  );

  return (
    <div className="lg-webgl-canvas-root" aria-hidden="true">
      <Canvas
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: "high-performance",
        }}
        dpr={[1, 2]}
      >
        <LiquidGlassRenderer
          snapshot={snapshot}
          perfController={perfController}
          forceBoost={forceBoost}
          onMetrics={setMetrics}
        />
      </Canvas>
      {showHud ? <PerfHud metrics={metrics} /> : null}
    </div>
  );
}
