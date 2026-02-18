/**
 * Builds the inner displacement map SVG.
 * - Base #808080 = neutral (no displacement)
 * - X gradient (screen blend): left=#F00 → right=#000 → horizontal lens
 * - Y gradient (screen blend): top=#0F0 → bottom=#000 → vertical lens
 * - Blurred inner rect reduces displacement in center, creating lens shape
 */
function buildDisplacementMapSvg(
  width: number,
  height: number,
  depth: number
): string {
  const pad = Math.round(depth);
  const innerW = Math.max(1, width - pad * 2);
  const innerH = Math.max(1, height - pad * 2);
  const blurR = Math.round(depth * 0.8);

  return (
    `<svg height="${height}" width="${width}" viewBox="0 0 ${width} ${height}" ` +
    `xmlns="http://www.w3.org/2000/svg">` +
    `<style>.mix{mix-blend-mode:screen}</style>` +
    `<defs>` +
    `<linearGradient id="Y" x1="0" x2="0" y1="0%" y2="100%">` +
    `<stop offset="0%" stop-color="#0F0"/><stop offset="100%" stop-color="#000"/>` +
    `</linearGradient>` +
    `<linearGradient id="X" x1="0%" x2="100%" y1="0" y2="0">` +
    `<stop offset="0%" stop-color="#F00"/><stop offset="100%" stop-color="#000"/>` +
    `</linearGradient>` +
    `</defs>` +
    `<rect x="0" y="0" height="${height}" width="${width}" fill="#808080"/>` +
    `<g filter="blur(2px)">` +
    `<rect x="0" y="0" height="${height}" width="${width}" fill="#000080"/>` +
    `<rect x="0" y="0" height="${height}" width="${width}" fill="url(#Y)" class="mix"/>` +
    `<rect x="0" y="0" height="${height}" width="${width}" fill="url(#X)" class="mix"/>` +
    `<rect x="${pad}" y="${pad}" height="${innerH}" width="${innerW}" ` +
    `fill="#808080" rx="${pad}" ry="${pad}" filter="blur(${blurR}px)"/>` +
    `</g>` +
    `</svg>`
  );
}

/**
 * Builds the outer SVG filter with 3-pass chromatic aberration.
 * R/G/B channels are displaced by (strength+cab), strength, (strength-cab)
 * then recombined with screen blend → iridescent edge fringing.
 */
function buildFilterSvg(
  width: number,
  height: number,
  strength: number,
  cab: number
): string {
  const depth = Math.round(strength * 0.4);
  const mapSvg = buildDisplacementMapSvg(width, height, depth);
  const mapUrl = `data:image/svg+xml;utf8,${encodeURIComponent(mapSvg)}`;
  const scaleR = strength + cab;
  const scaleG = strength;
  const scaleB = Math.max(0, strength - cab);

  return (
    `<svg height="${height}" width="${width}" viewBox="0 0 ${width} ${height}" ` +
    `xmlns="http://www.w3.org/2000/svg">` +
    `<defs>` +
    `<filter id="displace" color-interpolation-filters="sRGB">` +
    `<feImage x="0" y="0" height="${height}" width="${width}" ` +
    `href="${mapUrl}" result="map"/>` +
    `<feDisplacementMap transform-origin="center" in="SourceGraphic" in2="map" ` +
    `scale="${scaleR}" xChannelSelector="R" yChannelSelector="G"/>` +
    `<feColorMatrix type="matrix" ` +
    `values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="dispR"/>` +
    `<feDisplacementMap in="SourceGraphic" in2="map" ` +
    `scale="${scaleG}" xChannelSelector="R" yChannelSelector="G"/>` +
    `<feColorMatrix type="matrix" ` +
    `values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="dispG"/>` +
    `<feDisplacementMap in="SourceGraphic" in2="map" ` +
    `scale="${scaleB}" xChannelSelector="R" yChannelSelector="G"/>` +
    `<feColorMatrix type="matrix" ` +
    `values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="dispB"/>` +
    `<feBlend in="dispR" in2="dispG" mode="screen"/>` +
    `<feBlend in2="dispB" mode="screen"/>` +
    `</filter>` +
    `</defs>` +
    `</svg>#displace`
  );
}

interface LiquidGlassOptions {
  /** Gaussian blur in px (default: 20) */
  blur?: number;
  /** Displacement scale in px (default: 24) */
  strength?: number;
  /** Chromatic aberration offset in px (default: 2) */
  cab?: number;
  /** CSS saturate value (default: 1.6) */
  saturate?: number;
  /** CSS brightness value (default: 1.05) */
  brightness?: number;
}

/**
 * Returns the full backdrop-filter CSS value for the liquid glass effect.
 * Falls back gracefully: if width/height are 0, returns plain blur.
 */
export function getLiquidGlassFilter(
  width: number,
  height: number,
  options: LiquidGlassOptions = {}
): string {
  const {
    blur = 20,
    strength = 24,
    cab = 2,
    saturate = 1.6,
    brightness = 1.05,
  } = options;

  const base = `blur(${blur}px) saturate(${saturate}) brightness(${brightness})`;
  if (width <= 0 || height <= 0) return base;

  const filterSvg = buildFilterSvg(width, height, strength, cab);
  const filterUrl = `data:image/svg+xml;utf8,${encodeURIComponent(filterSvg)}`;
  return `${base} url("${filterUrl}")`;
}
