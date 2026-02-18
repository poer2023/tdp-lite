export const refractionVertexSource = `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const refractionFragmentSource = `
uniform sampler2D uSceneTex;
uniform vec2 uViewport;
uniform vec2 uRenderResolution;
uniform vec4 uRect;
uniform vec2 uSurfaceSize;
uniform vec3 uFillColor;
uniform float uFillOpacity;
uniform float uBlurStrength;
uniform float uEdgeInnerPx;
uniform float uEdgeOuterPx;
uniform float uStrength;
uniform float uStrengthMultiplier;
uniform float uChroma;
uniform float uRim;
uniform float uRadiusPx;
uniform float uNoise;
uniform float uTime;

varying vec2 vUv;

float roundedRectSdf(vec2 point, vec2 halfSize, float radius) {
  vec2 q = abs(point) - halfSize + vec2(radius);
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - radius;
}

float hash(vec2 point) {
  return fract(sin(dot(point, vec2(127.1, 311.7))) * 43758.5453123);
}

float luma(vec3 color) {
  return dot(color, vec3(0.299, 0.587, 0.114));
}

void main() {
  vec2 center = vec2(0.5);
  vec2 radialDir = normalize((vUv - center) + vec2(0.0001));
  vec2 pointPx = (vUv - 0.5) * uSurfaceSize;
  vec2 halfSize = uSurfaceSize * 0.5;
  float maxRadius = max(0.0, min(halfSize.x, halfSize.y) - 0.5);
  float radius = clamp(uRadiusPx, 0.0, maxRadius);
  float sdf = roundedRectSdf(pointPx, halfSize, radius);
  float shapeMask = 1.0 - smoothstep(0.0, 1.5, sdf);
  float innerDistance = max(0.0, -sdf);
  float edgeMask = (1.0 - smoothstep(uEdgeInnerPx, uEdgeOuterPx, innerDistance)) * shapeMask;
  float edgeCurve = pow(edgeMask, 0.58);
  float edgePeak = smoothstep(0.15, 0.95, edgeMask);
  float edgeBoost = mix(1.0, 1.9, edgePeak);

  vec2 sceneUv = (uRect.xy + vUv * uRect.zw) / max(uViewport, vec2(1.0));
  sceneUv.y = 1.0 - sceneUv.y;
  vec2 texel = vec2(
    1.0 / max(uRenderResolution.x, 1.0),
    1.0 / max(uRenderResolution.y, 1.0)
  );
  vec3 sampleL = texture2D(uSceneTex, clamp(sceneUv - vec2(texel.x, 0.0), 0.0, 1.0)).rgb;
  vec3 sampleR = texture2D(uSceneTex, clamp(sceneUv + vec2(texel.x, 0.0), 0.0, 1.0)).rgb;
  vec3 sampleU = texture2D(uSceneTex, clamp(sceneUv - vec2(0.0, texel.y), 0.0, 1.0)).rgb;
  vec3 sampleD = texture2D(uSceneTex, clamp(sceneUv + vec2(0.0, texel.y), 0.0, 1.0)).rgb;
  vec3 sampleCenter = texture2D(uSceneTex, clamp(sceneUv, 0.0, 1.0)).rgb;
  vec3 sampleBlur = (sampleL + sampleR + sampleU + sampleD) * 0.25;
  float blurMix = clamp(uBlurStrength * 0.45, 0.0, 0.7);
  vec3 filteredCenter = mix(sampleCenter, sampleBlur, blurMix);
  vec2 grad = vec2(luma(sampleR) - luma(sampleL), luma(sampleD) - luma(sampleU));
  float gradWeight = clamp(length(grad) * 12.0, 0.0, 1.0);
  vec2 gradDir = normalize(grad + vec2(0.0001));
  vec2 flowNoise = vec2(
    sin((sceneUv.y + uTime * 0.05) * 132.0),
    cos((sceneUv.x - uTime * 0.04) * 118.0)
  );
  float contrastBoost = 1.0 + gradWeight * 1.8;
  float flowAmount = 0.14 + edgeCurve * 0.18;
  vec2 refractDir = normalize(mix(radialDir, gradDir, gradWeight * 0.92) + flowNoise * flowAmount);
  float displacement = uStrength * uStrengthMultiplier * edgeCurve * edgeBoost * contrastBoost;
  vec2 offset = refractDir * displacement * texel;
  vec2 offsetFine = offset * 0.42;

  vec3 refracted;
  if (uChroma > 0.0) {
    vec2 chromaOffset = refractDir * (uChroma / max(uRenderResolution.x, uRenderResolution.y));
    float red = texture2D(uSceneTex, clamp(sceneUv + offset + chromaOffset + offsetFine * 0.3, 0.0, 1.0)).r;
    float green = texture2D(uSceneTex, clamp(sceneUv + offset + offsetFine * 0.15, 0.0, 1.0)).g;
    float blue = texture2D(uSceneTex, clamp(sceneUv + offset - chromaOffset - offsetFine * 0.2, 0.0, 1.0)).b;
    refracted = mix(vec3(red, green, blue), filteredCenter, blurMix * 0.65);
  } else {
    vec3 displaced = texture2D(uSceneTex, clamp(sceneUv + offset, 0.0, 1.0)).rgb;
    vec3 displacedFine = texture2D(uSceneTex, clamp(sceneUv + offsetFine, 0.0, 1.0)).rgb;
    refracted = mix(mix(displaced, displacedFine, 0.35), filteredCenter, blurMix * 0.66);
  }

  vec3 color = mix(refracted, uFillColor, uFillOpacity);
  color += vec3((edgeCurve * 0.72 + edgePeak * 0.28) * uRim);

  float grain = (hash(gl_FragCoord.xy + uTime * 0.37) - 0.5) * uNoise;
  color += vec3(grain);

  float alpha = shapeMask * clamp(uFillOpacity + edgeCurve * 0.7 + edgePeak * 0.08 + 0.05, 0.0, 0.98);
  gl_FragColor = vec4(color, alpha);
}
`;

export const compositeVertexSource = `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const compositeFragmentSource = `
uniform sampler2D uGlassTex;
uniform float uTime;

varying vec2 vUv;

float hash(vec2 point) {
  return fract(sin(dot(point, vec2(83.23, 19.79))) * 41943.1231);
}

void main() {
  vec4 glass = texture2D(uGlassTex, vUv);
  if (glass.a <= 0.0001) {
    discard;
  }

  float grain = (hash(gl_FragCoord.xy + vec2(uTime * 0.13)) - 0.5) * 0.012;
  glass.rgb += grain;
  gl_FragColor = glass;
}
`;
