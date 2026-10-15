/**
 * GLSL for the world. Colours are passed as display-space (sRGB) vec3s and
 * written straight to the framebuffer, so the fog colour matches the page's
 * CSS background exactly and the canvas edge is invisible.
 */

export const hexToVec3 = (hex: string): [number, number, number] => {
  const n = parseInt(hex.replace("#", ""), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

export const glowVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/** Soft radial disc with a crisp ring — used for node halos. */
export const glowFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uRing;
  varying vec2 vUv;
  void main() {
    float d = length(vUv - 0.5) * 2.0;
    float core = pow(1.0 - clamp(d, 0.0, 1.0), 3.0);
    float ring = (1.0 - smoothstep(0.0, 0.05, abs(d - uRing))) * (1.0 - uRing);
    float a = (core * 0.55 + ring * 0.9) * uOpacity;
    gl_FragColor = vec4(uColor * a, a);
  }
`;

export const particleVertex = /* glsl */ `
  attribute float aPhase;
  uniform float uTime;
  uniform float uPixelRatio;
  varying float vAlpha;
  void main() {
    vec3 p = position;
    p.y += sin(uTime * 0.25 + aPhase * 6.283) * 0.35;
    p.x += cos(uTime * 0.18 + aPhase * 12.0) * 0.25;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = (1.4 + aPhase * 1.6) * uPixelRatio * (14.0 / -mv.z);
    vAlpha = (0.25 + 0.5 * aPhase) * (1.0 - smoothstep(14.0, 46.0, -mv.z));
  }
`;

export const particleFragment = /* glsl */ `
  uniform vec3 uColor;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = (1.0 - smoothstep(0.2, 0.5, d)) * vAlpha;
    gl_FragColor = vec4(uColor * a, a);
  }
`;
