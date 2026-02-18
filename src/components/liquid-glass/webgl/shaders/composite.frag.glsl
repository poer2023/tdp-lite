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
