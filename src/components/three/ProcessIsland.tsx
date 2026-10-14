"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mulberry32, simplex2 } from "./terrain-math";
import { islandState, viewRects, viewVisible } from "./views";
import { glowFragment, glowVertex } from "./shaders";
import type { Tier } from "./Scene";

/* ------------------------------------------------------------------ */
/* Island geometry                                                    */
/* ------------------------------------------------------------------ */

const R = 3.3;
const edgeRadius = (a: number) => R * (1 + 0.07 * Math.sin(a * 3 + 1) + 0.05 * Math.sin(a * 7 + 2));

export function islandHeight(x: number, z: number) {
  const r = Math.hypot(x, z) / R;
  const relief = simplex2(x * 0.42 + 3, z * 0.42 - 1) * 0.32 + simplex2(x * 0.95, z * 0.95 + 5) * 0.12;
  const dome = (1 - r * r) * 0.35;
  return Math.max(-0.2, (relief + dome) * (1 - Math.pow(Math.min(r, 1), 6)));
}

export const STATIONS: [number, number][] = [
  [-2.05, 1.25],
  [-1.05, -1.15],
  [0.3, 0.55],
  [1.4, -1.25],
  [2.2, 0.95],
];
const stationPos = (i: number, lift = 0) =>
  new THREE.Vector3(STATIONS[i][0], islandHeight(STATIONS[i][0], STATIONS[i][1]) + lift, STATIONS[i][1]);

/** The island splits along x = CUT during "Understand". */
const CUT = STATIONS[2][0];

const CYAN = new THREE.Color("#65e4e8");
const LIME = new THREE.Color("#c7f36b");
const SLATE = new THREE.Color("#9fb3c4");

/* ------------------------------------------------------------------ */
/* Shaders                                                            */
/* ------------------------------------------------------------------ */

const surfaceVertex = /* glsl */ `
  varying vec3 vWorld; varying vec3 vLocal; varying vec3 vNormal; varying float vH;
  void main() {
    vLocal = position;
    vec4 w = modelMatrix * vec4(position, 1.0);
    vWorld = w.xyz; vH = position.y;
    vNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;
const cutChunk = /* glsl */ `
  uniform float uSide;   // -1 left half, +1 right half, 0 = no cut
  uniform float uCut;
`;
const topFragment = /* glsl */ `
  ${cutChunk}
  uniform vec3 uFocus; uniform float uTime; uniform float uGain;
  uniform vec3 uWaveOrigin; uniform float uWave; uniform float uWaveT;
  varying vec3 vWorld; varying vec3 vLocal; varying vec3 vNormal; varying float vH;
  float iso(float v, float w) { float d = abs(fract(v - 0.5) - 0.5) / max(fwidth(v), 1e-4); return 1.0 - clamp(d / w, 0.0, 1.0); }
  void main() {
    if (uSide * (vLocal.x - uCut) < 0.0) discard;
    vec3 N = normalize(vNormal);
    vec3 V = normalize(cameraPosition - vWorld);
    float key = max(dot(N, normalize(vec3(0.3, 0.9, 0.35))), 0.0);
    float rim = pow(1.0 - max(dot(N, V), 0.0), 2.5);
    vec3 col = vec3(0.06, 0.075, 0.09) * (0.55 + 0.7 * key) + vec3(0.12, 0.2, 0.22) * rim * 0.5;
    float near = 1.0 - smoothstep(0.3, 1.6, length(vLocal.xz - uFocus.xz));
    float minor = iso(vH * 14.0, 1.0);
    float major = iso(vH * 2.8, 1.3);
    col += vec3(0.62, 0.7, 0.77) * (minor * 0.13 + major * 0.3) * (0.5 + 0.5 * near) * uGain;
    col += vec3(0.4, 0.89, 0.91) * minor * near * 0.22;
    vec2 g = abs(fract(vLocal.xz * 2.0 - 0.5) - 0.5) / fwidth(vLocal.xz * 2.0);
    col += vec3(0.62, 0.7, 0.77) * (1.0 - min(min(g.x, g.y), 1.0)) * 0.05;
    // Validate: signal waves roll across the whole island.
    float d = length(vLocal.xz - uWaveOrigin.xz);
    for (int k = 0; k < 3; k++) {
      float r = fract(uWaveT * 0.45 + float(k) / 3.0) * 6.5;
      float ring = (1.0 - smoothstep(0.0, 0.12, abs(d - r))) * (1.0 - r / 6.5);
      col += mix(vec3(0.4, 0.89, 0.91), vec3(0.78, 0.95, 0.42), r / 6.5) * ring * uWave * (0.6 + minor + major);
    }
    gl_FragColor = vec4(col, 1.0);
  }
`;
const rockFragment = /* glsl */ `
  ${cutChunk}
  varying vec3 vWorld; varying vec3 vLocal; varying vec3 vNormal; varying float vH;
  void main() {
    if (uSide * (vLocal.x - uCut) < 0.0) discard;
    vec3 N = normalize(vNormal);
    vec3 V = normalize(cameraPosition - vWorld);
    float rim = pow(1.0 - max(dot(N, V), 0.0), 2.0);
    float strata = 1.0 - clamp(abs(fract(vLocal.y * 7.0) - 0.5) / max(fwidth(vLocal.y * 7.0), 1e-4) / 1.2, 0.0, 1.0);
    float fade = smoothstep(-2.6, -0.2, vLocal.y);
    vec3 col = vec3(0.03, 0.038, 0.047) + vec3(0.08, 0.12, 0.14) * rim * 0.35 + vec3(0.45, 0.52, 0.58) * strata * 0.09 * fade;
    gl_FragColor = vec4(col * (0.35 + 0.65 * fade), 1.0);
  }
`;
/** Lines that draw themselves in order of aT (routes, roots, grid). */
const drawVertex = /* glsl */ `
  attribute float aT;
  varying float vT; varying vec3 vLocal;
  void main() { vT = aT; vLocal = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
const drawFragment = /* glsl */ `
  ${cutChunk}
  uniform float uDraw; uniform float uTime; uniform vec3 uColor; uniform float uBright;
  varying float vT; varying vec3 vLocal;
  void main() {
    if (uSide * (vLocal.x - uCut) < 0.0) discard;
    if (vT > uDraw) discard;
    float head = smoothstep(uDraw - 0.05, uDraw, vT) * step(uDraw, 0.999);
    float travel = pow(1.0 - fract(vT * 3.0 - uTime * 0.3), 10.0);
    float a = (0.4 + head * 0.9 + travel * 0.45) * uBright;
    gl_FragColor = vec4(uColor * a, a);
  }
`;
const flatVertex = /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const coneFragment = /* glsl */ `
  uniform float uAmount; uniform vec3 uColor; varying vec2 vUv;
  void main() {
    float edge = 1.0 - smoothstep(0.3, 0.5, abs(vUv.x - 0.5));
    float a = edge * pow(vUv.y, 0.6) * 0.5 * uAmount;
    gl_FragColor = vec4(uColor * a, a);
  }
`;
const scanFragment = /* glsl */ `
  uniform float uAmount; uniform vec3 uColor; varying vec2 vUv;
  void main() {
    vec2 p = vUv * 2.0 - 1.0; float r = max(abs(p.x), abs(p.y));
    float front = uAmount * 1.15;
    float reveal = 1.0 - smoothstep(front - 0.12, front, r);
    vec2 g = abs(fract(vUv * 7.0 - 0.5) - 0.5) / fwidth(vUv * 7.0);
    float grid = 1.0 - min(min(g.x, g.y), 1.0);
    float edge = (1.0 - smoothstep(0.0, 0.03, abs(r - front))) * step(r, 1.0);
    float a = (grid * 0.6 * reveal + edge * 1.1) * step(r, 1.0) * min(1.0, uAmount * 3.0);
    gl_FragColor = vec4(uColor * a, a);
  }
`;

const additive = (vertexShader: string, fragmentShader: string, uniforms: Record<string, THREE.IUniform>) =>
  new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });

/** Polylines (local coords) → LineSegments geometry with a 0→1 draw order. */
function drawLines(polys: THREE.Vector3[][], order: "sequential" | "parallel" = "sequential") {
  const pos: number[] = [];
  const t: number[] = [];
  polys.forEach((poly, pi) => {
    for (let i = 0; i < poly.length - 1; i++) {
      pos.push(poly[i].x, poly[i].y, poly[i].z, poly[i + 1].x, poly[i + 1].y, poly[i + 1].z);
      const a = i / (poly.length - 1);
      const b = (i + 1) / (poly.length - 1);
      if (order === "parallel") t.push(a, b);
      else t.push((pi + a) / polys.length, (pi + b) / polys.length);
    }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("aT", new THREE.Float32BufferAttribute(t, 1));
  return g;
}

const ground = (x: number, z: number, lift = 0.03) => new THREE.Vector3(x, islandHeight(x, z) + lift, z);

/* ------------------------------------------------------------------ */
/* Build everything once                                              */
/* ------------------------------------------------------------------ */

function buildIsland(tier: Tier) {
  const rand = mulberry32(31);
  const seg = tier === "high" ? 150 : 90;

  const top = new THREE.PlaneGeometry(2 * R, 2 * R, seg, seg);
  top.rotateX(-Math.PI / 2);
  const tp = top.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < tp.count; i++) {
    let x = tp.getX(i);
    let z = tp.getZ(i);
    const er = edgeRadius(Math.atan2(z, x));
    const r = Math.hypot(x, z);
    if (r > er) {
      x = (x / r) * er;
      z = (z / r) * er;
    }
    tp.setXYZ(i, x, islandHeight(x, z), z);
  }
  top.computeVertexNormals();

  const rock = new THREE.CylinderGeometry(1, 0.05, 2.8, 96, 14, true);
  const rp = rock.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < rp.count; i++) {
    const x = rp.getX(i), y = rp.getY(i), z = rp.getZ(i);
    const a = Math.atan2(z, x);
    const isTop = y > 1.39;
    const r = Math.hypot(x, z) * edgeRadius(a) * (isTop ? 1 : 0.9 + 0.14 * simplex2(a * 2.5, y * 1.6));
    rp.setXYZ(i, Math.cos(a) * r, isTop ? islandHeight(Math.cos(a) * r, Math.sin(a) * r) : y - 1.4, Math.sin(a) * r);
  }
  rock.computeVertexNormals();

  // Route through all stations.
  const flat = new THREE.CatmullRomCurve3(STATIONS.map(([x, z]) => new THREE.Vector3(x, 0, z)), false, "centripetal");
  const route = drawLines([flat.getSpacedPoints(220).map((p) => ground(p.x, p.z, 0.025))], "parallel");

  // 01 Observe — data points scattered around the tower.
  const obs = stationPos(0);
  const dataPoints = Array.from({ length: 26 }, () => {
    const a = rand() * Math.PI * 2;
    const r = 0.35 + rand() * 1.05;
    return { a, p: ground(obs.x + Math.cos(a) * r, obs.z + Math.sin(a) * r, 0.06) };
  });

  // 02 Map — routes traced out from the station; arrows flow along them.
  const mapC = stationPos(1);
  const mapCurves = [0, 1, 2].map((k) => {
    const a0 = -0.6 + k * 1.1;
    const pts = [0, 1, 2, 3].map((s) => {
      const r = 0.15 + s * 0.38;
      const a = a0 + Math.sin(s * 1.7 + k) * 0.35;
      return ground(mapC.x + Math.cos(a) * r, mapC.z + Math.sin(a) * r, 0.05);
    });
    return new THREE.CatmullRomCurve3(pts);
  });
  const mapRoutes = drawLines(mapCurves.map((c) => c.getSpacedPoints(40)), "parallel");

  // 03 Understand — a root network growing down through the split.
  const rootPolys: THREE.Vector3[][] = [];
  const grow = (from: THREE.Vector3, dir: THREE.Vector3, len: number, depth: number) => {
    const pts = [from.clone()];
    const p = from.clone();
    const d = dir.clone();
    for (let s = 0; s < 6; s++) {
      d.x += (rand() - 0.5) * 0.35;
      d.z += (rand() - 0.5) * 0.35;
      d.normalize();
      p.addScaledVector(d, len / 6);
      p.x = CUT + (p.x - CUT) * 0.35; // stay inside the gap
      pts.push(p.clone());
    }
    rootPolys.push(pts);
    if (depth < 3) {
      const n = depth === 0 ? 3 : 2;
      for (let k = 0; k < n; k++) grow(p, new THREE.Vector3((rand() - 0.5) * 0.8, -1, (rand() - 0.5) * 1.2), len * 0.62, depth + 1);
    }
  };
  const undTop = stationPos(2);
  [-0.9, 0, 0.9].forEach((dz) => grow(new THREE.Vector3(CUT, undTop.y - 0.02, undTop.z + dz * 0.6), new THREE.Vector3(0, -1, dz * 0.3), 1.3, 0));
  const roots = drawLines(rootPolys);

  // 04 Build — foundation grid, then blocks (sorted bottom-up).
  const bc = stationPos(3);
  const gridPolys: THREE.Vector3[][] = [];
  for (let i = 0; i <= 4; i++) {
    const o = -0.6 + i * 0.3;
    gridPolys.push([ground(bc.x - 0.6, bc.z + o, 0.03), ground(bc.x + 0.6, bc.z + o, 0.03)]);
    gridPolys.push([ground(bc.x + o, bc.z - 0.6, 0.03), ground(bc.x + o, bc.z + 0.6, 0.03)]);
  }
  const buildGrid = drawLines(gridPolys, "parallel");
  const heights = [3, 2, 2, 1, 2, 1, 1, 1, 1];
  const blocks: { x: number; z: number; level: number }[] = [];
  heights.forEach((h, i) => {
    for (let l = 0; l < h; l++) blocks.push({ x: -0.3 + (i % 3) * 0.3, z: -0.3 + Math.floor(i / 3) * 0.3, level: l });
  });
  blocks.sort((a, b) => a.level - b.level || a.z - b.z || a.x - b.x);

  // 05 Validate — a check mark.
  const tick = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-0.09, 0.0, 0),
    new THREE.Vector3(-0.025, -0.07, 0),
    new THREE.Vector3(-0.025, -0.07, 0),
    new THREE.Vector3(0.11, 0.08, 0),
  ]);

  const cut = (side: number) => ({ uSide: { value: side }, uCut: { value: CUT } });
  const halves = [-1, 1].map((side) => ({
    side,
    topMat: new THREE.ShaderMaterial({
      vertexShader: surfaceVertex,
      fragmentShader: topFragment,
      side: THREE.DoubleSide,
      uniforms: {
        ...cut(side),
        uFocus: { value: new THREE.Vector3() },
        uTime: { value: 0 },
        uGain: { value: tier === "high" ? 1 : 2.6 },
        uWaveOrigin: { value: stationPos(4) },
        uWave: { value: 0 },
        uWaveT: { value: 0 },
      },
    }),
    rockMat: new THREE.ShaderMaterial({ vertexShader: surfaceVertex, fragmentShader: rockFragment, side: THREE.DoubleSide, uniforms: cut(side) }),
    routeMat: additive(drawVertex, drawFragment, { ...cut(side), uDraw: { value: 0 }, uTime: { value: 0 }, uColor: { value: CYAN.clone() }, uBright: { value: 0.8 } }),
  }));
  const whole = () => ({ uSide: { value: 0 }, uCut: { value: 0 } });
  const cube = new THREE.BoxGeometry(0.26, 0.26, 0.26);

  return {
    top,
    rock,
    route,
    halves,
    dataPoints,
    mapCurves,
    mapRoutes,
    mapRouteMat: additive(drawVertex, drawFragment, { ...whole(), uDraw: { value: 0 }, uTime: { value: 0 }, uColor: { value: CYAN.clone() }, uBright: { value: 1 } }),
    scanMat: additive(flatVertex, scanFragment, { uAmount: { value: 0 }, uColor: { value: CYAN.clone() } }),
    coneMat: additive(flatVertex, coneFragment, { uAmount: { value: 0 }, uColor: { value: CYAN.clone() } }),
    roots,
    rootMat: additive(drawVertex, drawFragment, { ...whole(), uDraw: { value: 0 }, uTime: { value: 0 }, uColor: { value: LIME.clone() }, uBright: { value: 1.2 } }),
    buildGrid,
    gridMat: additive(drawVertex, drawFragment, { ...whole(), uDraw: { value: 0 }, uTime: { value: 0 }, uColor: { value: CYAN.clone() }, uBright: { value: 1 } }),
    blocks,
    cube,
    cubeEdges: new THREE.EdgesGeometry(cube),
    edgeMat: new THREE.LineBasicMaterial({ color: CYAN.clone(), transparent: true, opacity: 0.95 }),
    fillMat: new THREE.MeshBasicMaterial({ color: new THREE.Color(0.05, 0.07, 0.085), transparent: true, opacity: 0.9 }),
    tick,
    tickMat: new THREE.LineBasicMaterial({ color: LIME.clone(), transparent: true, opacity: 0 }),
    halos: STATIONS.map(() => additive(glowVertex, glowFragment, { uColor: { value: CYAN.clone() }, uOpacity: { value: 0.6 }, uRing: { value: 0 } })),
    pointMat: new THREE.MeshBasicMaterial({ color: CYAN.clone(), transparent: true, opacity: 0 }),
  };
}

type Built = ReturnType<typeof buildIsland>;

function disposeAll(b: Built) {
  const seen = new Set<unknown>();
  const visit = (v: unknown) => {
    if (!v || typeof v !== "object" || seen.has(v)) return;
    seen.add(v);
    if (Array.isArray(v)) return v.forEach(visit);
    if (v instanceof THREE.BufferGeometry || v instanceof THREE.Material) return v.dispose();
    Object.values(v).forEach(visit);
  };
  visit(b);
}

/** Per-station close-up: distance, elevation, azimuth. */
const SHOTS = [
  { dist: 5.6, el: 0.55, az: -0.75 },
  { dist: 5.2, el: 0.78, az: -0.35 },
  { dist: 5.0, el: 0.38, az: 0.08 }, // from the front, low: look straight into the split
  { dist: 5.3, el: 0.5, az: 0.4 },
  { dist: 8.4, el: 0.9, az: 0.65 }, // pull back to see waves cross the whole island
];
const ISLAND_CENTRE = new THREE.Vector3(0.4, 0.2, 0);

/* ------------------------------------------------------------------ */
/* The island                                                         */
/* ------------------------------------------------------------------ */

export function ProcessIsland({ tier }: { tier: Tier }) {
  const built = useMemo(() => buildIsland(tier), [tier]);
  const builtRef = useRef(built);
  useEffect(() => {
    builtRef.current = built;
  }, [built]);
  useEffect(() => () => disposeAll(built), [built]);

  const root = useRef<THREE.Group>(null);
  const halfGroups = useRef<(THREE.Group | null)[]>([]);
  const markers = useRef<(THREE.Mesh | null)[]>([]);
  const stationGroups = useRef<(THREE.Group | null)[]>([]);
  const cone = useRef<THREE.Group>(null);
  const dataMesh = useRef<THREE.InstancedMesh>(null);
  const arrows = useRef<THREE.InstancedMesh>(null);
  const blockGroups = useRef<(THREE.Group | null)[]>([]);
  const ticks = useRef<(THREE.Group | null)[]>([]);
  const haloMeshes = useRef<(THREE.Mesh | null)[]>([]);
  const found = useRef<number[]>([]);

  const live = useRef({ p: 0, amounts: [0, 0, 0, 0, 0], camPos: new THREE.Vector3(), camTarget: new THREE.Vector3(), init: false });
  const tmp = useRef({
    a: new THREE.Vector3(),
    b: new THREE.Vector3(),
    v: new THREE.Vector3(),
    m: new THREE.Matrix4(),
    q: new THREE.Quaternion(),
    s: new THREE.Vector3(),
    up: new THREE.Vector3(0, 1, 0),
    tan: new THREE.Vector3(),
  });

  useFrame((state, delta) => {
    if (!viewVisible.island) return;
    const b = builtRef.current;
    const dt = Math.min(delta, 1 / 20);
    const t = state.clock.elapsedTime;
    const L = live.current;
    const T = tmp.current;
    L.p = THREE.MathUtils.damp(L.p, islandState.progress, 2.4, dt);
    L.amounts = L.amounts.map((a, i) => THREE.MathUtils.damp(a, Math.max(0, 1 - Math.abs(L.p - i) * 1.4), 5, dt));
    const [aObs, aMap, aUnd, aBuild, aVal] = L.amounts;

    /* Camera: close-ups at each station, pulling out between them. */
    const i0 = Math.min(Math.floor(L.p), 3);
    const f = THREE.MathUtils.smootherstep(L.p - i0, 0, 1);
    const transit = Math.sin(f * Math.PI);
    const s0 = SHOTS[i0];
    const s1 = SHOTS[i0 + 1];
    const mix = (x: number, y: number) => x + (y - x) * f;
    T.a.copy(stationPos(i0, 0.3)).lerp(stationPos(i0 + 1, 0.3), f);
    T.a.lerp(ISLAND_CENTRE, THREE.MathUtils.smoothstep(L.p, 3.5, 4));
    const az = mix(s0.az, s1.az) + state.pointer.x * 0.1;
    const el = mix(s0.el, s1.el) + transit * 0.25 + state.pointer.y * 0.04;
    const dist = mix(s0.dist, s1.dist) + transit * 2.6;
    T.b.set(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)).multiplyScalar(dist).add(T.a);
    if (!L.init) {
      L.camPos.copy(T.b);
      L.camTarget.copy(T.a);
      L.init = true;
    }
    L.camPos.lerp(T.b, 1 - Math.exp(-3 * dt));
    L.camTarget.lerp(T.a, 1 - Math.exp(-3.4 * dt));
    const cam = state.camera as THREE.PerspectiveCamera;
    cam.position.copy(L.camPos);
    cam.lookAt(L.camTarget);
    // Frame the island right of the text card on wide screens, above it on tall ones.
    const rect = viewRects.island;
    if (rect && rect.w > 0 && rect.h > 0) {
      const wide = rect.w / rect.h > 1.1;
      cam.setViewOffset(rect.w, rect.h, wide ? -rect.w * 0.17 : 0, wide ? 0 : rect.h * 0.17, rect.w, rect.h);
    }

    if (root.current) root.current.position.y = Math.sin(t * 0.6) * 0.04;

    /* Split for "Understand": halves part, stations ride on their half. */
    const gap = aUnd * 0.6;
    halfGroups.current.forEach((g, k) => {
      if (g) g.position.x = (k === 0 ? -1 : 1) * gap;
    });
    stationGroups.current.forEach((g, i) => {
      if (g) g.position.x = Math.sign(STATIONS[i][0] - CUT) * gap;
    });

    b.halves.forEach((h) => {
      h.topMat.uniforms.uFocus.value.copy(L.camTarget);
      h.topMat.uniforms.uTime.value = t;
      h.topMat.uniforms.uWave.value = aVal;
      h.topMat.uniforms.uWaveT.value = t;
      h.routeMat.uniforms.uDraw.value = Math.min(1, (L.p + 0.25) / 4);
      h.routeMat.uniforms.uTime.value = t;
    });

    /* 01 Observe — the beam sweeps; points light when found and stay found. */
    const sweep = t * 1.3;
    if (cone.current) cone.current.rotation.y = -sweep;
    b.coneMat.uniforms.uAmount.value = 0.25 + aObs * 0.9;
    if (dataMesh.current) {
      const beamAngle = Math.PI / 2 + sweep; // ground-plane angle the beam points at
      b.dataPoints.forEach((d, i) => {
        const diff = Math.abs(((((beamAngle - d.a) % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
        const hit = Math.exp(-diff * 5) * aObs;
        const prev = found.current[i] ?? 0;
        found.current[i] = aObs > 0.05 ? Math.max(prev, hit > 0.5 ? 1 : 0) : prev * 0.98;
        T.s.setScalar((0.35 + found.current[i] * 0.65 + hit * 0.9) * Math.max(0.15, aObs));
        T.m.compose(d.p, T.q.identity(), T.s);
        dataMesh.current!.setMatrixAt(i, T.m);
      });
      dataMesh.current.instanceMatrix.needsUpdate = true;
      b.pointMat.opacity = 0.35 + aObs * 0.65;
    }

    /* 02 Map — scan grid unfolds; routes trace out; arrows flow. */
    b.scanMat.uniforms.uAmount.value = aMap;
    b.mapRouteMat.uniforms.uDraw.value = aMap * 1.001;
    b.mapRouteMat.uniforms.uTime.value = t;
    if (arrows.current) {
      for (let i = 0; i < 9; i++) {
        const c = b.mapCurves[i % 3];
        const u = ((t * 0.18 + i / 9) % 1) * Math.min(1, aMap * 1.2);
        c.getPointAt(u, T.v);
        c.getTangentAt(u, T.tan);
        T.q.setFromUnitVectors(T.up, T.tan);
        T.s.setScalar(aMap > 0.05 ? 1 : 0.0001);
        T.m.compose(T.v, T.q, T.s);
        arrows.current.setMatrixAt(i, T.m);
      }
      arrows.current.instanceMatrix.needsUpdate = true;
    }

    /* 03 Understand — roots grow down through the gap. */
    b.rootMat.uniforms.uDraw.value = THREE.MathUtils.smoothstep(aUnd, 0.15, 1) * 1.001;
    b.rootMat.uniforms.uTime.value = t;

    /* 04 Build — grid lights, then blocks land one by one. */
    b.gridMat.uniforms.uDraw.value = Math.min(1, aBuild * 2) * 1.001;
    b.gridMat.uniforms.uTime.value = t;
    blockGroups.current.forEach((g, k) => {
      if (!g) return;
      const land = THREE.MathUtils.clamp((aBuild - 0.3) * 1.6 * b.blocks.length - k, 0, 1);
      const e = 1 - Math.pow(1 - land, 3);
      const blk = b.blocks[k];
      g.position.set(blk.x, 0.13 + blk.level * 0.27 + (1 - e) * 1.4, blk.z);
      g.visible = land > 0.01;
      g.rotation.y = (1 - e) * 1.2;
    });

    /* 05 Validate — waves (surface shader) and ticks over every station. */
    b.tickMat.opacity = aVal;
    ticks.current.forEach((g, i) => {
      if (!g) return;
      const k = THREE.MathUtils.clamp(aVal * 6 - i * 0.5, 0, 1);
      g.position.y = 0.78 - (1 - k) * 0.25 + Math.sin(t * 2 + i) * 0.02;
      g.scale.setScalar(Math.max(0.001, k * 1.6));
      g.quaternion.copy(cam.quaternion);
    });

    /* Markers and halos */
    STATIONS.forEach((_, i) => {
      const a = L.amounts[i];
      const halo = b.halos[i];
      const hm = haloMeshes.current[i];
      if (hm) hm.quaternion.copy(cam.quaternion);
      halo.uniforms.uRing.value = (t * 0.4 + i * 0.2) % 1;
      halo.uniforms.uOpacity.value = 0.35 + a * 0.9;
      (halo.uniforms.uColor.value as THREE.Color).copy(CYAN).lerp(LIME, a);
      const m = markers.current[i];
      if (m) {
        m.rotation.y = t * 0.8 + i;
        m.position.y = 0.48 + Math.sin(t * 1.5 + i) * 0.03 + a * 0.08;
        m.scale.setScalar(1 + a * 0.45);
        ((m.material as THREE.MeshBasicMaterial).color as THREE.Color).copy(CYAN).lerp(LIME, a);
      }
    });

    /* Pin DOM labels to the markers. */
    if (rect) {
      STATIONS.forEach((_, i) => {
        const el = islandState.labels[i];
        if (!el) return;
        T.v.copy(stationPos(i, 0.85));
        const g = stationGroups.current[i];
        if (g) T.v.x += g.position.x;
        if (root.current) T.v.y += root.current.position.y;
        T.v.project(cam);
        const visible = T.v.z < 1 && Math.abs(T.v.x) < 1.05 && Math.abs(T.v.y) < 1.05;
        el.style.transform = `translate3d(${((T.v.x * 0.5 + 0.5) * rect.w).toFixed(1)}px, ${((-T.v.y * 0.5 + 0.5) * rect.h).toFixed(1)}px, 0)`;
        el.style.opacity = visible ? String(0.5 + L.amounts[i] * 0.5) : "0";
        el.dataset.active = L.amounts[i] > 0.6 ? "true" : "false";
      });
    }
  });

  return (
    <group ref={root}>
      {/* The island, as two halves that part during "Understand". */}
      {built.halves.map((h, k) => (
        <group
          key={h.side}
          ref={(g) => {
            halfGroups.current[k] = g;
          }}
        >
          <mesh geometry={built.top} material={h.topMat} />
          <mesh geometry={built.rock} material={h.rockMat} />
          <lineSegments geometry={built.route} material={h.routeMat} renderOrder={2} />
        </group>
      ))}

      {/* Understand: roots in the gap */}
      <lineSegments geometry={built.roots} material={built.rootMat} renderOrder={3} />

      {STATIONS.map(([x, z], i) => (
        <group
          key={i}
          ref={(g) => {
            stationGroups.current[i] = g;
          }}
        >
          <group position={[x, islandHeight(x, z), z]}>
            <mesh position={[0, 0.24, 0]}>
              <cylinderGeometry args={[0.004, 0.004, 0.48, 4]} />
              <meshBasicMaterial color={SLATE} transparent opacity={0.45} />
            </mesh>
            <mesh
              ref={(m) => {
                markers.current[i] = m;
              }}
              position={[0, 0.48, 0]}
            >
              <octahedronGeometry args={[0.05, 0]} />
              <meshBasicMaterial color={CYAN.clone()} />
            </mesh>
            <mesh
              position={[0, 0.48, 0]}
              material={built.halos[i]}
              renderOrder={3}
              ref={(m) => {
                haloMeshes.current[i] = m;
              }}
            >
              <planeGeometry args={[0.55, 0.55]} />
            </mesh>
            <group
              ref={(g) => {
                ticks.current[i] = g;
              }}
            >
              <lineSegments geometry={built.tick} material={built.tickMat} />
            </group>
          </group>

          {i === 0 && (
            <>
              {/* 01 Observe — survey tower with a rotating beam, and data points */}
              <group position={stationPos(0)}>
                <mesh position={[0, 0.55, 0]}>
                  <cylinderGeometry args={[0.012, 0.02, 1.1, 6]} />
                  <meshBasicMaterial color={SLATE} transparent opacity={0.6} />
                </mesh>
                <group ref={cone} position={[0, 1.08, 0]}>
                  <mesh position={[0, -0.5, 0.62]} rotation-x={-1.05} material={built.coneMat} renderOrder={4}>
                    <planeGeometry args={[0.55, 1.45]} />
                  </mesh>
                </group>
              </group>
              <instancedMesh ref={dataMesh} args={[undefined, undefined, built.dataPoints.length]} material={built.pointMat} frustumCulled={false}>
                <octahedronGeometry args={[0.03, 0]} />
              </instancedMesh>
            </>
          )}

          {i === 1 && (
            <>
              {/* 02 Map — scan grid, traced routes, flowing arrows */}
              <mesh position={stationPos(1, 0.04)} rotation-x={-Math.PI / 2} rotation-z={0.3} material={built.scanMat} renderOrder={2}>
                <planeGeometry args={[1.6, 1.6]} />
              </mesh>
              <lineSegments geometry={built.mapRoutes} material={built.mapRouteMat} renderOrder={3} />
              <instancedMesh ref={arrows} args={[undefined, undefined, 9]} frustumCulled={false}>
                <coneGeometry args={[0.022, 0.07, 4]} />
                <meshBasicMaterial color={LIME.clone()} />
              </instancedMesh>
            </>
          )}

          {i === 3 && (
            <>
              {/* 04 Build — grid + blocks */}
              <lineSegments geometry={built.buildGrid} material={built.gridMat} renderOrder={3} />
              <group position={stationPos(3)}>
                {built.blocks.map((_, k) => (
                  <group
                    key={k}
                    ref={(g) => {
                      blockGroups.current[k] = g;
                    }}
                  >
                    <mesh geometry={built.cube} material={built.fillMat} />
                    <lineSegments geometry={built.cubeEdges} material={built.edgeMat} />
                  </group>
                ))}
              </group>
            </>
          )}
        </group>
      ))}
    </group>
  );
}
