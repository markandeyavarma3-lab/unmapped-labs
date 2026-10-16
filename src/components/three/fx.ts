import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { mulberry32 } from "./terrain-math";

/**
 * Small story effects shared by the process block, the districts and the
 * projects: fog over the unknown, question marks, ribbons that draw
 * themselves, ring markers and billboard screens.
 */

export const flatVertex = /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

/** A ring (and optional disc fill) drawn on a quad. */
export const ringFragment = /* glsl */ `
  uniform vec3 uColor; uniform float uOpacity; uniform float uFill; varying vec2 vUv;
  void main() {
    float d = length(vUv - 0.5) * 2.0;
    float ring = 1.0 - smoothstep(0.0, 0.08, abs(d - 0.86));
    float fill = (1.0 - smoothstep(0.72, 0.84, d)) * uFill;
    float a = max(ring, fill) * uOpacity;
    if (a < 0.004) discard;
    gl_FragColor = vec4(uColor, a);
    #include <colorspace_fragment>
  }
`;

export const overlay = (fragmentShader: string, uniforms: Record<string, THREE.IUniform>, vertexShader = flatVertex) =>
  new THREE.ShaderMaterial({ vertexShader, fragmentShader, uniforms, transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });

export const ringMaterial = (color: THREE.ColorRepresentation, fill = 0) =>
  overlay(ringFragment, { uColor: { value: new THREE.Color(color) }, uOpacity: { value: 0 }, uFill: { value: fill } });

/* ------------------------------------------------------------------ */
/* Fog puffs                                                           */
/* ------------------------------------------------------------------ */

const fogVertex = /* glsl */ `
  attribute float aPhase; attribute float aSize;
  uniform float uTime; uniform float uClear; uniform float uScale; uniform vec3 uCenter;
  varying float vAlpha;
  void main() {
    vec3 p = position;
    p.x += sin(uTime * 0.25 + aPhase * 20.0) * 0.35;
    p.z += cos(uTime * 0.2 + aPhase * 13.0) * 0.35;
    vec3 away = normalize(vec3(p.x - uCenter.x, 0.6, p.z - uCenter.z) + 1e-4);
    p += away * uClear * (5.0 + aPhase * 4.0);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = aSize * uScale / -mv.z;
    vAlpha = (1.0 - uClear) * (0.55 + 0.45 * fract(aPhase * 7.3));
  }
`;
const fogFragment = /* glsl */ `
  uniform float uOpacity; varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    float a = (1.0 - smoothstep(0.2, 1.0, d)) * vAlpha * uOpacity * 0.55;
    if (a < 0.01) discard;
    gl_FragColor = vec4(vec3(1.0, 0.97, 0.92), a);
    #include <colorspace_fragment>
  }
`;

/** Soft fog puffs over a box; `uClear` 0 → 1 drifts them apart and fades them. */
export function fogPuffs(count: number, min: [number, number, number], max: [number, number, number], size: [number, number], seed = 1) {
  const rand = mulberry32(seed);
  const pos = new Float32Array(count * 3), phase = new Float32Array(count), sz = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    pos.set([min[0] + rand() * (max[0] - min[0]), min[1] + rand() * (max[1] - min[1]), min[2] + rand() * (max[2] - min[2])], i * 3);
    phase[i] = rand();
    sz[i] = size[0] + rand() * (size[1] - size[0]);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geometry.setAttribute("aPhase", new THREE.BufferAttribute(phase, 1));
  geometry.setAttribute("aSize", new THREE.BufferAttribute(sz, 1));
  const center = new THREE.Vector3((min[0] + max[0]) / 2, 0, (min[2] + max[2]) / 2);
  const material = new THREE.ShaderMaterial({
    vertexShader: fogVertex,
    fragmentShader: fogFragment,
    transparent: true,
    depthWrite: false,
    uniforms: { uTime: { value: 0 }, uClear: { value: 0 }, uScale: { value: 1 }, uOpacity: { value: 0 }, uCenter: { value: center } },
  });
  return { geometry, material };
}

/** Pixels per world unit at distance 1, for point sprites sized in world units. */
export function pointScale(state: { size: { height: number }; gl: THREE.WebGLRenderer; camera: THREE.Camera }) {
  const fov = (state.camera as THREE.PerspectiveCamera).fov ?? 40;
  return (state.size.height * state.gl.getPixelRatio()) / (2 * Math.tan(THREE.MathUtils.degToRad(fov) / 2));
}

/* ------------------------------------------------------------------ */
/* Shapes                                                              */
/* ------------------------------------------------------------------ */

/** A chunky "?" built from a torus arc, a stem and a dot (origin at its base). */
export function questionMark() {
  const arc = new THREE.TorusGeometry(0.2, 0.065, 8, 20, Math.PI * 1.35);
  arc.rotateZ(-Math.PI * 0.35);
  arc.translate(0, 0.62, 0);
  const stem = new THREE.CylinderGeometry(0.065, 0.065, 0.2, 8);
  stem.translate(0, 0.33, 0);
  const dot = new THREE.SphereGeometry(0.075, 10, 8);
  dot.translate(0, 0.08, 0);
  const parts = [arc, stem, dot].map((g) => {
    g.deleteAttribute("uv");
    return g.index ? g.toNonIndexed() : g;
  });
  const g = mergeGeometries(parts, false)!;
  [arc, stem, dot, ...parts].forEach((x) => x !== g && x.dispose());
  return g;
}

/* ------------------------------------------------------------------ */
/* Ribbons that draw themselves along a path                           */
/* ------------------------------------------------------------------ */

const ribbonVertex = /* glsl */ `attribute float aT; attribute float aS; varying float vT; varying float vS; void main() { vT = aT; vS = aS; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
/** uDraw: how much of the ribbon is drawn (0 → 1, in order of `aT`). uLen: path length (for dashes). uKind: 0 = line, 1 = road. */
const ribbonFragment = /* glsl */ `
  uniform float uDraw; uniform vec3 uColor; uniform float uOpacity; uniform float uLen; uniform float uKind;
  varying float vT; varying float vS;
  void main() {
    if (vT > uDraw) discard;
    vec3 col = uColor;
    if (uKind > 0.5) {
      float dash = step(fract(vT * uLen / 0.45), 0.5) * (1.0 - smoothstep(0.05, 0.09, abs(vS)));
      float edge = smoothstep(0.82, 0.88, abs(vS)) * (1.0 - smoothstep(0.92, 0.96, abs(vS)));
      col = mix(col, vec3(0.95, 0.93, 0.88), max(dash, edge));
    }
    float head = smoothstep(uDraw - 0.03, uDraw, vT) * (1.0 - step(0.999, uDraw));
    gl_FragColor = vec4(mix(col, vec3(0.75, 1.0, 0.4), head * 0.8), uOpacity);
    #include <colorspace_fragment>
  }
`;

/** Polylines on the ground → one strip mesh whose `aT` runs 0 → 1 along them in order. */
export function ribbon(polys: [number, number][][], width: number, y: number, color: THREE.ColorRepresentation, kind: "line" | "road" = "line") {
  const pos: number[] = [], t: number[] = [], side: number[] = [], idx: number[] = [];
  let total = 0;
  for (const poly of polys) for (let i = 0; i < poly.length - 1; i++) total += Math.hypot(poly[i + 1][0] - poly[i][0], poly[i + 1][1] - poly[i][1]);
  let run = 0;
  for (const poly of polys)
    for (let i = 0; i < poly.length - 1; i++) {
      const [x0, z0] = poly[i], [x1, z1] = poly[i + 1];
      const len = Math.hypot(x1 - x0, z1 - z0) || 1;
      const nx = (-(z1 - z0) / len) * width * 0.5, nz = ((x1 - x0) / len) * width * 0.5;
      // extend each segment by half a width so corners close
      const ex = ((x1 - x0) / len) * width * 0.5, ez = ((z1 - z0) / len) * width * 0.5;
      const ax = x0 - (i > 0 ? ex : 0), az = z0 - (i > 0 ? ez : 0), bx = x1 + (i < poly.length - 2 ? ex : 0), bz = z1 + (i < poly.length - 2 ? ez : 0);
      const b = pos.length / 3;
      pos.push(ax + nx, y, az + nz, ax - nx, y, az - nz, bx - nx, y, bz - nz, bx + nx, y, bz + nz);
      const t0 = run / total, t1 = (run + len) / total;
      t.push(t0, t0, t1, t1);
      side.push(1, -1, -1, 1);
      idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
      run += len;
    }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geometry.setAttribute("aT", new THREE.Float32BufferAttribute(t, 1));
  geometry.setAttribute("aS", new THREE.Float32BufferAttribute(side, 1));
  geometry.setIndex(idx);
  const material = new THREE.ShaderMaterial({
    vertexShader: ribbonVertex,
    fragmentShader: ribbonFragment,
    transparent: true,
    depthWrite: false,
    toneMapped: false,
    side: THREE.DoubleSide,
    uniforms: { uDraw: { value: 0 }, uColor: { value: new THREE.Color(color) }, uOpacity: { value: 0 }, uLen: { value: total }, uKind: { value: kind === "road" ? 1 : 0 } },
  });
  return { geometry, material, length: total };
}

/* ------------------------------------------------------------------ */
/* Billboards                                                          */
/* ------------------------------------------------------------------ */

const _v = new THREE.Vector3();
/** Turns an object to face the camera about the vertical axis only (stays upright). */
export function faceCamera(o: THREE.Object3D, camera: THREE.Camera) {
  _v.copy(camera.position).sub(o.position);
  o.rotation.set(0, Math.atan2(_v.x, _v.z), 0);
}

/** World point at (u, v) ∈ [0, 1]² on an upright billboard of size w × h centred at `c`, facing yaw `ry`. */
export function onBillboard(c: THREE.Vector3, ry: number, w: number, h: number, u: number, v: number, out: THREE.Vector3) {
  const rx = Math.cos(ry), rz = -Math.sin(ry);
  return out.set(c.x + rx * (u - 0.5) * w, c.y + (v - 0.5) * h, c.z + rz * (u - 0.5) * w);
}

export const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** How strongly beat i (0–3) of a story is showing at progress s, with soft edges. */
export function beatWeight(s: number, i: number) {
  const a = i === 0 ? 1 : smooth(i * 0.25 - 0.03, i * 0.25 + 0.03, s);
  const b = i === 3 ? 1 : 1 - smooth((i + 1) * 0.25 - 0.03, (i + 1) * 0.25 + 0.03, s);
  return a * b;
}
