"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { AVENUE_PATH, DISTRICT_LIST, FLOW_PATHS, GROUND, LOGISTICS_BYPASS, ROADS, buildCity, type FlowKind } from "./city-layout";
import { cityState } from "./city-state";
import { frame } from "./frame-state";
import type { Tier } from "./Scene";

/**
 * The city at night: a dark ground with a faint survey grid, roads, every
 * building in one instanced draw, and flows of goods / water / energy / data
 * / people that queue at a district's bottleneck until its fix lands.
 */

const INK: [number, number, number] = [8 / 255, 11 / 255, 14 / 255];
const FOG: [number, number] = [26, 92];

/* ------------------------------------------------------------------ */
/* Buildings                                                          */
/* ------------------------------------------------------------------ */

const buildingVertex = /* glsl */ `
  attribute float aH;
  attribute float aLetterH;
  attribute float aLetter;
  attribute float aWake;
  attribute float aSeed;
  uniform float uTitle;
  uniform float uRise;
  uniform float uChapter;
  uniform float uFinale;
  varying vec3 vN;
  varying vec2 vUv;
  varying vec3 vWorld;
  varying float vLit;
  varying float vLetter;
  varying float vSeed;
  varying float vHeight;
  void main() {
    // Letters stand tall while they spell the name, then settle into the skyline.
    float letter = aLetter * uTitle;
    float h = mix(aH, aLetterH, letter) * mix(0.02, 1.0, uRise);
    vec3 p = position;
    p.y *= h;
    vec4 w = modelMatrix * instanceMatrix * vec4(p, 1.0);
    vWorld = w.xyz;
    vUv = uv;
    vN = normalize(mat3(modelMatrix * instanceMatrix) * normal);
    float wake = aWake > 90.0 ? 0.0 : smoothstep(aWake - 0.6, aWake, uChapter);
    vLit = max(wake, aWake > 90.0 ? 0.0 : uFinale);
    vLetter = letter;
    vSeed = aSeed;
    vHeight = h;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;

const buildingFragment = /* glsl */ `
  uniform vec3 uBg;
  uniform vec2 uFog;
  varying vec3 vN;
  varying vec2 vUv;
  varying vec3 vWorld;
  varying float vLit;
  varying float vLetter;
  varying float vSeed;
  varying float vHeight;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  void main() {
    vec3 N = normalize(vN);
    float top = step(0.5, N.y);
    vec3 cyan = vec3(0.4, 0.89, 0.91);
    float key = max(dot(N, normalize(vec3(0.4, 0.8, 0.3))), 0.0);
    vec3 col = mix(vec3(0.043, 0.055, 0.068), vec3(0.075, 0.09, 0.105), top) * (0.7 + 0.5 * key);

    // Crisp edges, constant width on screen.
    vec2 e = min(vUv, 1.0 - vUv) / max(fwidth(vUv), vec2(1e-4));
    float edge = 1.0 - clamp(min(e.x, e.y) / 1.3, 0.0, 1.0);
    col += cyan * edge * (0.11 + 0.34 * vLit + 0.85 * vLetter);

    // Windows on the sides: a lit grid, some rooms dark.
    if (top < 0.5) {
      float along = abs(N.x) > 0.5 ? vWorld.z : vWorld.x;
      vec2 g = vec2(along * 3.4, vWorld.y * 3.8);
      vec2 f = fract(g);
      float win = step(0.28, f.x) * step(f.x, 0.72) * step(0.3, f.y) * step(f.y, 0.74);
      float on = step(0.52, hash(floor(g) + vSeed * 17.0));
      float rows = step(0.3, vWorld.y) * step(vWorld.y, vHeight - 0.12);
      col += vec3(0.74, 0.88, 0.93) * win * on * rows * (0.06 + vLit * 0.5);
    }
    // Letter roofs glow while they spell the name.
    col += cyan * top * vLetter * 0.85;

    float fog = smoothstep(uFog.x, uFog.y, length(cameraPosition - vWorld));
    gl_FragColor = vec4(mix(col, uBg, fog), 1.0);
  }
`;

/* ------------------------------------------------------------------ */
/* Ground & roads                                                     */
/* ------------------------------------------------------------------ */

const groundVertex = /* glsl */ `
  varying vec3 vWorld;
  void main() { vec4 w = modelMatrix * vec4(position, 1.0); vWorld = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }
`;
const groundFragment = /* glsl */ `
  uniform vec3 uBg; uniform vec2 uFog;
  uniform vec4 uPools[6]; // district (x, z, r, lit)
  varying vec3 vWorld;
  void main() {
    vec2 xz = vWorld.xz;
    vec3 col = vec3(0.028, 0.036, 0.045);
    vec2 g = abs(fract(xz / 1.7 - 0.5) - 0.5) / max(fwidth(xz / 1.7), vec2(1e-4));
    col += vec3(0.62, 0.7, 0.77) * (1.0 - clamp(min(g.x, g.y), 0.0, 1.0)) * 0.035;
    for (int i = 0; i < 6; i++) {
      vec4 p = uPools[i];
      float d = length(xz - p.xy);
      col += vec3(0.4, 0.89, 0.91) * (1.0 - smoothstep(p.z * 0.3, p.z * 1.15, d)) * 0.05 * p.w;
      col += vec3(0.4, 0.89, 0.91) * (1.0 - smoothstep(0.0, 0.06, abs(d - p.z))) * 0.18 * p.w;
    }
    float fog = smoothstep(uFog.x, uFog.y, length(cameraPosition - vWorld));
    gl_FragColor = vec4(mix(col, uBg, fog), 1.0);
  }
`;
const roadFragment = /* glsl */ `
  uniform vec3 uBg; uniform vec2 uFog; uniform float uLit;
  varying vec2 vUv; varying vec3 vWorld;
  void main() {
    vec3 col = vec3(0.05, 0.062, 0.075);
    float center = (1.0 - smoothstep(0.0, 0.04, abs(vUv.x - 0.5))) * step(0.5, fract(vUv.y * 0.9));
    float kerb = 1.0 - smoothstep(0.0, 0.03, min(vUv.x, 1.0 - vUv.x));
    col += vec3(0.62, 0.7, 0.77) * (center * 0.25 + kerb * 0.12) * (0.4 + 0.6 * uLit);
    float fog = smoothstep(uFog.x, uFog.y, length(cameraPosition - vWorld));
    gl_FragColor = vec4(mix(col, uBg, fog), 1.0);
  }
`;
const roadVertex = /* glsl */ `
  varying vec2 vUv; varying vec3 vWorld;
  void main() { vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vWorld = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }
`;

/* ------------------------------------------------------------------ */
/* Flows                                                              */
/* ------------------------------------------------------------------ */

const KIND_COLOR: Record<FlowKind, THREE.Color> = {
  goods: new THREE.Color("#9fe9ec"),
  water: new THREE.Color("#65e4e8"),
  energy: new THREE.Color("#c7f36b"),
  data: new THREE.Color("#e8f6f7"),
  people: new THREE.Color("#b9d4dc"),
};
const JAM_RED = new THREE.Color("#ff6b5e");

type Path = { curve: THREE.CurvePath<THREE.Vector3>; length: number };
const toPath = (pts: [number, number][], y = 0.14): Path => {
  const curve = new THREE.CurvePath<THREE.Vector3>();
  for (let i = 0; i < pts.length - 1; i++) {
    curve.add(new THREE.LineCurve3(new THREE.Vector3(pts[i][0], y, pts[i][1]), new THREE.Vector3(pts[i + 1][0], y, pts[i + 1][1])));
  }
  return { curve, length: curve.getLength() };
};

export function City({ tier, introDelay }: { tier: Tier; introDelay: number }) {
  /* buildings */
  const buildings = useMemo(() => {
    const layout = window.innerWidth / window.innerHeight < 0.9 ? "stacked" : "line";
    const { buildings: list } = buildCity(layout);
    const geo = new THREE.BoxGeometry(1, 1, 1);
    geo.translate(0, 0.5, 0);
    const mat = new THREE.ShaderMaterial({
      vertexShader: buildingVertex,
      fragmentShader: buildingFragment,
      uniforms: {
        uTitle: { value: 1 },
        uRise: { value: 0 },
        uChapter: { value: 0 },
        uFinale: { value: 0 },
        uBg: { value: new THREE.Vector3(...INK) },
        uFog: { value: new THREE.Vector2(...FOG) },
      },
    });
    const mesh = new THREE.InstancedMesh(geo, mat, list.length);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const attrs = { aH: new Float32Array(list.length), aLetterH: new Float32Array(list.length), aLetter: new Float32Array(list.length), aWake: new Float32Array(list.length), aSeed: new Float32Array(list.length) };
    list.forEach((b, i) => {
      m.compose(new THREE.Vector3(b.x, 0, b.z), q, new THREE.Vector3(b.w, 1, b.d));
      mesh.setMatrixAt(i, m);
      attrs.aH[i] = b.h;
      attrs.aLetterH[i] = b.letterH;
      attrs.aLetter[i] = b.letter ? 1 : 0;
      attrs.aWake[i] = b.wake;
      attrs.aSeed[i] = b.seed;
    });
    for (const [k, v] of Object.entries(attrs)) geo.setAttribute(k, new THREE.InstancedBufferAttribute(v, 1));
    mesh.frustumCulled = false;
    return { mesh, geo, mat };
  }, []);

  /* ground + roads */
  const ground = useMemo(() => {
    const geo = new THREE.PlaneGeometry(GROUND.maxX - GROUND.minX, GROUND.maxZ - GROUND.minZ);
    geo.rotateX(-Math.PI / 2);
    geo.translate((GROUND.minX + GROUND.maxX) / 2, 0, (GROUND.minZ + GROUND.maxZ) / 2);
    const mat = new THREE.ShaderMaterial({
      vertexShader: groundVertex,
      fragmentShader: groundFragment,
      uniforms: {
        uBg: { value: new THREE.Vector3(...INK) },
        uFog: { value: new THREE.Vector2(...FOG) },
        uPools: { value: DISTRICT_LIST.map((d) => new THREE.Vector4(d.x, d.z, d.r, 0)) },
      },
    });
    const roadMat = new THREE.ShaderMaterial({
      vertexShader: roadVertex,
      fragmentShader: roadFragment,
      uniforms: { uBg: { value: new THREE.Vector3(...INK) }, uFog: { value: new THREE.Vector2(...FOG) }, uLit: { value: 0 } },
    });
    const roads = ROADS.map(([x1, z1, x2, z2, w]) => {
      const len = Math.hypot(x2 - x1, z2 - z1);
      const g = new THREE.PlaneGeometry(w, len);
      // uv.y runs along the road in world units for the dashes
      const uv = g.attributes.uv as THREE.BufferAttribute;
      for (let i = 0; i < uv.count; i++) uv.setY(i, uv.getY(i) * len);
      g.rotateX(-Math.PI / 2);
      g.rotateY(-Math.atan2(x2 - x1, z2 - z1) + Math.PI);
      g.translate((x1 + x2) / 2, 0.01, (z1 + z2) / 2);
      return g;
    });
    return { geo, mat, roadMat, roads };
  }, []);

  /* flows */
  const flows = useMemo(() => {
    const per = tier === "high" ? 18 : 11;
    const paths = FLOW_PATHS.map((f) => ({ ...f, path: toPath(f.points), alt: f.district === "logistics" ? toPath(LOGISTICS_BYPASS) : null }));
    const avenue = toPath(AVENUE_PATH, 0.12);
    const avenueCount = tier === "high" ? 26 : 14;
    const total = paths.length * per + avenueCount;
    const geo = new THREE.BoxGeometry(0.2, 0.12, 0.2);
    const mat = new THREE.MeshBasicMaterial({ color: "#ffffff" });
    const mesh = new THREE.InstancedMesh(geo, mat, total);
    mesh.frustumCulled = false;
    mesh.setColorAt(0, new THREE.Color());
    const u = new Float32Array(total).map((_, i) => (i * 0.6180339) % 1);
    return { paths, avenue, per, avenueCount, total, geo, mat, mesh, u };
  }, [tier]);

  useEffect(
    () => () => {
      buildings.geo.dispose();
      buildings.mat.dispose();
      buildings.mesh.dispose();
      ground.geo.dispose();
      ground.mat.dispose();
      ground.roadMat.dispose();
      ground.roads.forEach((g) => g.dispose());
      flows.geo.dispose();
      flows.mat.dispose();
      flows.mesh.dispose();
    },
    [buildings, ground, flows],
  );

  const refs = useRef({ buildings, ground, flows });
  useEffect(() => {
    refs.current = { buildings, ground, flows };
  }, [buildings, ground, flows]);
  const tmp = useRef({ m: new THREE.Matrix4(), p: new THREE.Vector3(), q: new THREE.Quaternion(), s: new THREE.Vector3(1, 1, 1), c: new THREE.Color() });

  useFrame((state, delta) => {
    const { buildings: B, ground: G, flows: F } = refs.current;
    const dt = Math.min(delta, 1 / 20);
    const t = state.clock.elapsedTime;
    const c = frame.chapter;

    // Opening: the name rises out of the dark grid, then melts back into the skyline.
    const u = B.mat.uniforms;
    u.uRise.value = 1 - Math.pow(1 - Math.min(1, Math.max(0, (t - introDelay - 0.2) / 2.4)), 3);
    u.uTitle.value = 1 - THREE.MathUtils.smoothstep(c, 1.15, 1.95);
    u.uChapter.value = c;
    u.uFinale.value = frame.finale;

    DISTRICT_LIST.forEach((d, i) => {
      (G.mat.uniforms.uPools.value as THREE.Vector4[])[i].w = cityState[d.id].lit;
    });
    G.roadMat.uniforms.uLit.value = Math.min(1, c / 2);

    // Flows: each district's stream queues at its entrance while the problem stands.
    const T = tmp.current;
    let n = 0;
    F.paths.forEach((p) => {
      const s = cityState[p.district];
      const jam = s.problem > 0.15 ? s.problem : 0;
      const base = KIND_COLOR[p.kind];
      // queue order: the furthest-along particles take the front slots
      const idx = Array.from({ length: F.per }, (_, k) => n + k).sort((a, b) => F.u[b] - F.u[a]);
      idx.forEach((i, rank) => {
        const speed = (0.035 + (i % 5) * 0.004) * (60 / Math.max(20, p.path.length));
        let next = F.u[i] + speed * dt * 4;
        // queue behind the bottleneck; anything already past its slot simply waits
        if (jam > 0) next = Math.min(next, Math.max(F.u[i], 0.9 - rank * 0.022));
        if (next >= 1) next -= 1;
        F.u[i] = next;
        const useAlt = p.alt && s.fixed > 0.5 && i % 2 === 0;
        (useAlt ? p.alt! : p.path).curve.getPointAt(next, T.p);
        T.m.compose(T.p, T.q, T.s);
        F.mesh.setMatrixAt(i, T.m);
        const queued = jam > 0 && next > 0.9 - F.per * 0.022 - 0.01;
        T.c.copy(base).lerp(JAM_RED, queued ? jam : 0).multiplyScalar(0.55 + 0.45 * Math.max(s.lit, 0.35));
        F.mesh.setColorAt(i, T.c);
      });
      n += F.per;
    });
    for (let k = 0; k < F.avenueCount; k++, n++) {
      F.u[n] = (F.u[n] + 0.02 * dt * (k % 2 ? 1 : -1) + 1) % 1;
      F.avenue.curve.getPointAt(F.u[n], T.p);
      T.p.x += k % 2 ? 0.35 : -0.35;
      T.m.compose(T.p, T.q, T.s);
      F.mesh.setMatrixAt(n, T.m);
      F.mesh.setColorAt(n, T.c.copy(KIND_COLOR.goods).multiplyScalar(0.5 + 0.3 * Math.sin(t + k)));
    }
    F.mesh.instanceMatrix.needsUpdate = true;
    if (F.mesh.instanceColor) F.mesh.instanceColor.needsUpdate = true;
  });

  return (
    <group>
      <mesh geometry={ground.geo} material={ground.mat} frustumCulled={false} />
      {ground.roads.map((g, i) => (
        <mesh key={i} geometry={g} material={ground.roadMat} frustumCulled={false} />
      ))}
      <primitive object={buildings.mesh} />
      <primitive object={flows.mesh} />
    </group>
  );
}
