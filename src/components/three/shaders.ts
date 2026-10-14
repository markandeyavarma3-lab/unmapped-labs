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
export const DISC_SLOTS = 10;

/**
 * Terrain vertex shader. With TITLE defined it also lifts the letter relief
 * (aLetter, 0 → LETTER_HEIGHT) by uRise so the name grows out of the ground.
 */
export const terrainVertex = /* glsl */ `
  #ifdef TITLE
  attribute float aLetter;
  uniform float uRise;
  varying float vLetter;
  #endif
  varying vec3 vWorld;
  varying vec3 vNormal;
  varying float vH;

  void main() {
    vec3 p = position;
    #ifdef TITLE
    p.y += aLetter * uRise;
    vLetter = aLetter;
    #endif
    vec4 w = modelMatrix * vec4(p, 1.0);
    vWorld = w.xyz;
    vNormal = normalize(mat3(modelMatrix) * normal);
    vH = p.y;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;

export const terrainFragment = /* glsl */ `
  uniform float uTime;
  uniform sampler2D uNoise;      // tileable value noise: R 1×, G 2×, B 4×
  uniform float uIntro;          // 0 → 1: contours rise from the valleys up
  uniform vec2  uFocus;
  uniform vec2  uPointer;
  uniform float uPointerStrength;
  uniform vec3  uNodes[${NODE_SLOTS}]; // (x, z, strength)
  uniform vec4  uDiscs[${DISC_SLOTS}]; // (x, z, radius, _) — surveyed ground
  uniform vec3  uHold;           // (x, z, r) — ground that stays unmapped
  uniform vec2  uHeightRange;
  uniform vec3  uBg;
  uniform vec3  uLine;
  uniform vec3  uCyan;
  uniform vec3  uFogTint;
  uniform vec2  uFog;            // near, far
  uniform float uSweep;          // 0 → 1 during the entrance; < 0 when done
  uniform float uFinale;         // 0 → 1 at Contact
  #ifdef TITLE
  uniform float uRise;
  uniform float uTitleGlow;
  uniform float uTitleGain;
  varying float vLetter;
  #endif

  varying vec3 vWorld;
  varying vec3 vNormal;
  varying float vH;

  float isoLine(float v, float width) {
    float d = abs(fract(v - 0.5) - 0.5) / max(fwidth(v), 1e-4);
    return 1.0 - clamp(d / width, 0.0, 1.0);
  }
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  // One texture fetch instead of three procedural noise evaluations.
  float fbm(vec2 p) {
    vec3 n = texture2D(uNoise, p * 0.0625).rgb;
    return n.r * 0.55 + n.g * 0.3 + n.b * 0.15;
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

    // ---- Fog of war -------------------------------------------------------
    vec2 xz = vWorld.xz;
    float ragged = (fbm(xz * 0.09) - 0.5) * 7.0;          // organic survey edge
    float surveyed = 0.0;
    for (int i = 0; i < ${DISC_SLOTS}; i++) {
      vec4 d = uDiscs[i];
      if (d.z <= 0.01) continue;
      float dd = length(xz - d.xy) + ragged;
      surveyed = max(surveyed, 1.0 - smoothstep(d.z * 0.72, d.z, dd));
    }
    float hold = smoothstep(uHold.z * 0.55, uHold.z, length(xz - uHold.xy) + ragged * 0.6);
    surveyed *= hold;
    surveyed = max(surveyed, uFinale * hold);

    float flash = (1.0 - smoothstep(0.8, 6.0, length(xz - uPointer))) * uPointerStrength;
    float nodeGlow = 0.0;
    for (int i = 0; i < ${NODE_SLOTS}; i++) {
      vec3 n = uNodes[i];
      nodeGlow = max(nodeGlow, (1.0 - smoothstep(0.4, 3.4, length(xz - n.xy))) * n.z);
    }
    float known = clamp(max(max(surveyed, flash), nodeGlow * 0.8), 0.0, 1.0);

    // Contours: minor every 0.4 units, major every 2.0.
    float minor = isoLine(vH * 2.5, 1.0);
    float major = isoLine(vH * 0.5, 1.4);
    float rising = 1.0 - smoothstep(uIntro * 1.15 - 0.12, uIntro * 1.15, hN);
    #ifdef TITLE
    rising = max(rising, step(0.01, vLetter) * uRise);
    #endif

    float unknownA = minor * 0.03 + major * 0.08;
    float knownA = minor * 0.32 + major * 0.78;
    float lineA = mix(unknownA, knownA, known) * rising;
    vec3 lineCol = mix(uLine, uCyan, clamp(flash * 0.9 + nodeGlow * 0.35, 0.0, 1.0));
    col += lineCol * lineA * 0.62;

    // Survey grid on mapped ground, with missing cells.
    vec2 g = xz / 3.0;
    vec2 gd = abs(fract(g - 0.5) - 0.5) / max(fwidth(g), vec2(1e-4));
    float grid = 1.0 - clamp(min(gd.x, gd.y), 0.0, 1.0);
    col += uLine * grid * step(0.38, hash(floor(g))) * surveyed * 0.075 * rising;

    // The survey front: a bright seam where mapped meets unmapped.
    float seam = smoothstep(0.25, 0.5, surveyed) * (1.0 - smoothstep(0.5, 0.78, surveyed));
    col += uCyan * seam * (0.2 + (minor + major) * 0.7) * rising;

    // Drifting fog over everything not yet surveyed.
    float drift = fbm(xz * 0.07 + vec2(uTime * 0.025, uTime * 0.018));
    vec3 fogCol = uFogTint * (0.65 + 0.7 * drift);
    float fogAmt = (1.0 - known) * (0.55 + 0.35 * drift);
    col = mix(col, fogCol, fogAmt);

    // A slow survey pulse travelling outward from the focus.
    float ring = mod(uTime * 3.2, 46.0);
    float pulse = (1.0 - smoothstep(0.0, 0.7, abs(length(xz - uFocus) - ring))) * (1.0 - ring / 46.0);
    col += uCyan * pulse * (minor * 0.5 + major) * 0.28 * known * rising;

    // Entrance: a bright survey line sweeps across the land, front to back.
    if (uSweep >= 0.0) {
      float front = mix(70.0, -30.0, uSweep);
      float band = 1.0 - smoothstep(0.0, 2.2, abs(vWorld.z - front));
      col += uCyan * band * (0.06 + (minor + major) * 0.8);
    }
    col += uCyan * (minor * 0.05 + major * 0.12) * uFinale * hold;

    #ifdef TITLE
    // Letters: lit mesa tops, glowing rims, contour rings on the slopes.
    float letter = clamp(vLetter / 2.6, 0.0, 1.0);
    float top = smoothstep(0.9, 0.99, letter);
    float slope = letter * (1.0 - top);
    float rimLine = smoothstep(0.82, 0.9, letter) * (1.0 - smoothstep(0.9, 0.98, letter));
    vec3 lit = vec3(0.86, 0.9, 0.92);
    col = mix(col, vec3(0.11, 0.135, 0.155) * (0.6 + 0.6 * key), top * uRise);
    col += uCyan * rimLine * uRise * (0.62 + 0.3 * uTitleGlow) * uTitleGain;
    col += lit * isoLine(vLetter * 3.2, 1.0) * slope * uRise * 0.35 * uTitleGain;
    col += uCyan * top * uTitleGlow * 0.06 * (0.6 + 0.4 * sin(xz.x * 0.6 - uTime * 1.6));
    #endif

    // Atmosphere.
    float fog = smoothstep(uFog.x, uFog.y + uFinale * 35.0, dist);
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
  uniform float uBoost;
  uniform float uTime;
  uniform vec3  uColor;
  uniform vec2  uFog;
  varying vec2 vUv;
  varying float vDist;

  void main() {
    if (vUv.x > uDraw || uDraw <= 0.001) discard;
    float head = smoothstep(uDraw - 0.08, uDraw, vUv.x) * step(uDraw, 0.999);
    float travel = pow(1.0 - fract(vUv.x * 2.0 - uTime * (0.12 + uBoost * 0.25)), 12.0);
    float a = (0.42 + head * 0.9 + travel * 0.55) * (1.0 + uBoost * 0.9);
    a *= 1.0 - smoothstep(uFog.x, uFog.y + uBoost * 30.0, vDist);
    vec3 col = mix(uColor, vec3(0.78, 0.95, 0.42), uBoost * travel);
    gl_FragColor = vec4(col * a, a);
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
