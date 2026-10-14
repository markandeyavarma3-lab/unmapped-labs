/**
 * GLSL for the world. Colours are passed as display-space (sRGB) vec3s and
 * written straight to the framebuffer, so the fog colour matches the page's
 * CSS background exactly and the canvas edge is invisible.
 */

export const hexToVec3 = (hex: string): [number, number, number] => {
  const n = parseInt(hex.replace("#", ""), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

export const NODE_SLOTS = 8;

export const terrainVertex = /* glsl */ `
  varying vec3 vWorld;
  varying vec3 vNormal;
  varying float vH;

  void main() {
    vec4 w = modelMatrix * vec4(position, 1.0);
    vWorld = w.xyz;
    vNormal = normalize(mat3(modelMatrix) * normal);
    vH = position.y;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;

export const terrainFragment = /* glsl */ `
  uniform float uTime;
  uniform float uIntro;          // 0 → 1: contours rise from the valleys up
  uniform float uRevealRadius;   // radius of mapped territory around uFocus
  uniform vec2  uFocus;
  uniform vec2  uPointer;
  uniform float uPointerStrength;
  uniform vec3  uNodes[${NODE_SLOTS}]; // (x, z, strength)
  uniform vec2  uHeightRange;
  uniform vec3  uBg;
  uniform vec3  uLine;
  uniform vec3  uCyan;
  uniform vec2  uFog;            // near, far

  varying vec3 vWorld;
  varying vec3 vNormal;
  varying float vH;

  float isoLine(float v, float width) {
    float d = abs(fract(v - 0.5) - 0.5) / max(fwidth(v), 1e-4);
    return 1.0 - clamp(d / width, 0.0, 1.0);
  }

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  void main() {
    vec3 N = normalize(vNormal);
    vec3 V = normalize(cameraPosition - vWorld);
    float dist = length(cameraPosition - vWorld);
    float hN = clamp((vH - uHeightRange.x) / (uHeightRange.y - uHeightRange.x), 0.0, 1.0);

    // Surface: near-black, lifted slightly by elevation, a key light and a cool rim.
    float key = max(dot(N, normalize(vec3(0.35, 0.85, 0.25))), 0.0);
    float rim = pow(1.0 - max(dot(N, V), 0.0), 3.0);
    vec3 col = mix(vec3(0.034, 0.045, 0.056), vec3(0.085, 0.104, 0.122), hN) * (0.55 + 0.55 * key);
    col += vec3(0.11, 0.17, 0.19) * rim * 0.55;

    // What is "known": mapped territory, discovered nodes, the explorer's light.
    float reveal = 1.0 - smoothstep(uRevealRadius * 0.45, uRevealRadius, length(vWorld.xz - uFocus));
    float flash = (1.0 - smoothstep(0.8, 6.0, length(vWorld.xz - uPointer))) * uPointerStrength;
    float nodeGlow = 0.0;
    for (int i = 0; i < ${NODE_SLOTS}; i++) {
      vec3 n = uNodes[i];
      nodeGlow = max(nodeGlow, (1.0 - smoothstep(0.4, 3.4, length(vWorld.xz - n.xy))) * n.z);
    }
    float known = clamp(max(max(reveal, flash), nodeGlow), 0.0, 1.0);

    // Contours: minor every 0.4 units, major every 2.0.
    float minor = isoLine(vH * 2.5, 1.0);
    float major = isoLine(vH * 0.5, 1.4);
    float rising = 1.0 - smoothstep(uIntro * 1.15 - 0.12, uIntro * 1.15, hN);

    float unknownA = minor * 0.045 + major * 0.11;
    float knownA = minor * 0.30 + major * 0.75;
    float lineA = mix(unknownA, knownA, known) * rising;
    vec3 lineCol = mix(uLine, uCyan, clamp(flash * 0.9 + nodeGlow * 0.35, 0.0, 1.0));
    col += lineCol * lineA * 0.62;

    // Incomplete survey grid — only where territory is known, with missing cells.
    vec2 g = vWorld.xz / 3.0;
    vec2 gd = abs(fract(g - 0.5) - 0.5) / max(fwidth(g), vec2(1e-4));
    float grid = 1.0 - clamp(min(gd.x, gd.y), 0.0, 1.0);
    float keep = step(0.38, hash(floor(g)));
    col += uLine * grid * keep * reveal * 0.07 * rising;

    // A slow survey pulse travelling outward from the focus.
    float ring = mod(uTime * 3.2, 46.0);
    float pulse = (1.0 - smoothstep(0.0, 0.7, abs(length(vWorld.xz - uFocus) - ring))) * (1.0 - ring / 46.0);
    col += uCyan * pulse * (minor * 0.5 + major) * 0.32 * rising;

    // Atmosphere.
    float fog = smoothstep(uFog.x, uFog.y, dist);
    col = mix(col, uBg, fog);

    gl_FragColor = vec4(col, 1.0);
  }
`;

export const pathVertex = /* glsl */ `
  varying vec2 vUv;
  varying float vDist;
  void main() {
    vUv = uv;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vDist = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

export const pathFragment = /* glsl */ `
  uniform float uDraw;
  uniform float uTime;
  uniform vec3  uColor;
  uniform vec2  uFog;
  varying vec2 vUv;
  varying float vDist;

  void main() {
    if (vUv.x > uDraw || uDraw <= 0.001) discard;
    float head = smoothstep(uDraw - 0.08, uDraw, vUv.x) * step(uDraw, 0.999);
    float travel = pow(1.0 - fract(vUv.x * 2.0 - uTime * 0.12), 12.0);
    float a = 0.42 + head * 0.9 + travel * 0.55;
    a *= 1.0 - smoothstep(uFog.x, uFog.y, vDist);
    gl_FragColor = vec4(uColor * a, a);
  }
`;

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
