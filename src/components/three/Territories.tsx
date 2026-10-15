"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { CHAPTER, TERRITORIES, type Territory } from "./landmarks";
import { mulberry32, terrainHeight } from "./terrain-math";
import { frame } from "./frame-state";

/**
 * Small "settlements" drawn on the ground at each focus territory. Built from
 * survey lines; they draw in when the territory is first surveyed, stay
 * mapped afterwards, and animate fully only while you're there.
 */

const CYAN = new THREE.Color("#65e4e8");
const LIME = new THREE.Color("#c7f36b");
const LINE = new THREE.Color("#9fb3c4");

const lineVertex = /* glsl */ `
  attribute float aT;
  varying float vT;
  varying float vDist;
  void main() {
    vT = aT;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vDist = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;
const lineFragment = /* glsl */ `
  uniform float uDraw;
  uniform float uGlow;
  uniform vec3 uColor;
  varying float vT;
  varying float vDist;
  void main() {
    if (vT > uDraw) discard;
    float head = smoothstep(uDraw - 0.06, uDraw, vT) * step(uDraw, 0.999);
    float a = (0.28 + 0.72 * uGlow + head) * (1.0 - smoothstep(30.0, 70.0, vDist));
    gl_FragColor = vec4(uColor * a, a);
  }
`;

export const lineMaterial = (color: THREE.Color) =>
  new THREE.ShaderMaterial({
    vertexShader: lineVertex,
    fragmentShader: lineFragment,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uDraw: { value: 0 }, uGlow: { value: 0 }, uColor: { value: color.clone() } },
  });

/** Ground-hugging polylines → one LineSegments geometry; aT orders the draw-in. */
export function groundLines(polys: [number, number][][], lift = 0.06, sampleStep = 0.25) {
  const pos: number[] = [];
  const t: number[] = [];
  polys.forEach((poly, pi) => {
    const pts: [number, number, number][] = [];
    for (let i = 0; i < poly.length - 1; i++) {
      const [ax, az] = poly[i];
      const [bx, bz] = poly[i + 1];
      const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / sampleStep));
      for (let k = 0; k < n; k++) {
        const x = ax + ((bx - ax) * k) / n;
        const z = az + ((bz - az) * k) / n;
        pts.push([x, terrainHeight(x, z) + lift, z]);
      }
    }
    const [lx, lz] = poly[poly.length - 1];
    pts.push([lx, terrainHeight(lx, lz) + lift, lz]);
    for (let i = 0; i < pts.length - 1; i++) {
      pos.push(...pts[i], ...pts[i + 1]);
      const base = pi / polys.length;
      const span = 1 / polys.length;
      t.push(base + (span * i) / pts.length, base + (span * (i + 1)) / pts.length);
    }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("aT", new THREE.Float32BufferAttribute(t, 1));
  return g;
}

const rot = (t: Territory, dx: number, dz: number, a = 0.35): [number, number] => {
  const c = Math.cos(a), s = Math.sin(a);
  return [t.x + dx * c - dz * s, t.z + dx * s + dz * c];
};

type Built = {
  lines: THREE.BufferGeometry;
  lineMat: THREE.ShaderMaterial;
  movers?: { curves: THREE.CatmullRomCurve3[]; count: number };
  dots?: Float32Array; // static accent points (crops, nodes, pylons)
  dotMat?: THREE.PointsMaterial;
  dotGeo?: THREE.BufferGeometry;
};

function buildSettlement(t: Territory): Built {
  const rand = mulberry32(t.id.length * 101 + Math.round(t.z));
  if (t.id === "agriculture") {
    // Furrows across a gently rotated field, plus the field boundary.
    const rows: [number, number][][] = [];
    for (let i = 0; i < 13; i++) {
      const dz = -2.6 + i * 0.42;
      rows.push([rot(t, -3.6, dz), rot(t, 3.6, dz + Math.sin(i) * 0.1)]);
    }
    rows.push([rot(t, -3.9, -2.9), rot(t, 3.9, -2.9), rot(t, 3.9, 2.6), rot(t, -3.9, 2.6), rot(t, -3.9, -2.9)]);
    const crops: number[] = [];
    for (let i = 0; i < 260; i++) {
      const row = Math.floor(rand() * 13);
      const [x, z] = rot(t, -3.4 + rand() * 6.8, -2.6 + row * 0.42);
      crops.push(x, terrainHeight(x, z) + 0.12, z);
    }
    return { lines: groundLines(rows), lineMat: lineMaterial(LINE), dots: new Float32Array(crops) };
  }
  if (t.id === "logistics") {
    const depots: [number, number][] = [rot(t, -4, -2), rot(t, -0.5, 2.5), rot(t, 3.5, -1.5), rot(t, 1.2, -3.5), rot(t, 4.5, 2.6)];
    const links: [number, number][] = [[0, 1], [1, 4], [0, 3], [3, 2], [2, 4], [1, 2]];
    const polys = links.map(([a, b]) => {
      const [ax, az] = depots[a];
      const [bx, bz] = depots[b];
      const mx = (ax + bx) / 2 + (rand() - 0.5) * 1.6;
      const mz = (az + bz) / 2 + (rand() - 0.5) * 1.6;
      return [depots[a], [mx, mz] as [number, number], depots[b]];
    });
    const curves = polys.map(
      (p) => new THREE.CatmullRomCurve3(p.map(([x, z]) => new THREE.Vector3(x, terrainHeight(x, z) + 0.18, z))),
    );
    const dots = depots.flatMap(([x, z]) => [x, terrainHeight(x, z) + 0.2, z]);
    return { lines: groundLines(polys), lineMat: lineMaterial(CYAN), movers: { curves, count: 14 }, dots: new Float32Array(dots) };
  }
  if (t.id === "healthcare") {
    const nodes: [number, number][] = [];
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + rand() * 0.4;
      const r = i === 0 ? 0 : 2.4 + rand() * 1.4;
      nodes.push(i === 0 ? [t.x, t.z] : [t.x + Math.cos(a) * r, t.z + Math.sin(a) * r]);
    }
    const polys: [number, number][][] = [];
    for (let i = 1; i < nodes.length; i++) {
      polys.push([nodes[0], nodes[i]]);
      polys.push([nodes[i], nodes[i === nodes.length - 1 ? 1 : i + 1]]);
    }
    // a ring around each node
    nodes.forEach(([x, z]) => {
      const ring: [number, number][] = [];
      for (let k = 0; k <= 18; k++) ring.push([x + Math.cos((k / 18) * Math.PI * 2) * 0.45, z + Math.sin((k / 18) * Math.PI * 2) * 0.45]);
      polys.push(ring);
    });
    const curves = polys.slice(0, 12).map(
      (p) => new THREE.CatmullRomCurve3(p.map(([x, z]) => new THREE.Vector3(x, terrainHeight(x, z) + 0.12, z))),
    );
    const dots = nodes.flatMap(([x, z]) => [x, terrainHeight(x, z) + 0.15, z]);
    return { lines: groundLines(polys), lineMat: lineMaterial(CYAN), movers: { curves, count: 12 }, dots: new Float32Array(dots) };
  }
  if (t.id === "energy") {
    // Pylons along a line; sagging cables between their tops.
    const pylons = Array.from({ length: 6 }, (_, i) => rot(t, -4.5 + i * 1.8, Math.sin(i * 1.3) * 0.6, 1.15));
    const H = 1.6;
    const pos: number[] = [];
    const tt: number[] = [];
    const cables: THREE.CatmullRomCurve3[] = [];
    pylons.forEach(([x, z], i) => {
      const y = terrainHeight(x, z);
      const segs: [number, number, number, number, number, number][] = [
        [x, y, z, x, y + H, z],
        [x - 0.35, y + H - 0.25, z, x + 0.35, y + H - 0.25, z],
      ];
      segs.forEach((sg) => {
        pos.push(...sg);
        tt.push(i / pylons.length, i / pylons.length + 0.02);
      });
      if (i < pylons.length - 1) {
        const [bx, bz] = pylons[i + 1];
        const by = terrainHeight(bx, bz);
        const pts: THREE.Vector3[] = [];
        for (let k = 0; k <= 16; k++) {
          const f = k / 16;
          const sag = Math.sin(f * Math.PI) * 0.35;
          pts.push(new THREE.Vector3(x + (bx - x) * f, y + H - 0.25 + (by - y) * f - sag, z + (bz - z) * f));
        }
        for (let k = 0; k < 16; k++) {
          pos.push(pts[k].x, pts[k].y, pts[k].z, pts[k + 1].x, pts[k + 1].y, pts[k + 1].z);
          tt.push(i / pylons.length + (k / 16) / pylons.length, i / pylons.length + ((k + 1) / 16) / pylons.length);
        }
        cables.push(new THREE.CatmullRomCurve3(pts));
      }
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("aT", new THREE.Float32BufferAttribute(tt, 1));
    return { lines: g, lineMat: lineMaterial(CYAN), movers: { curves: cables, count: 10 } };
  }
  // open — almost nothing: a faint dashed boundary where the map stops.
  const ring: [number, number][] = [];
  for (let k = 0; k <= 40; k++) if (k % 2 === 0) ring.push([t.x + Math.cos((k / 40) * Math.PI * 2) * 5, t.z + Math.sin((k / 40) * Math.PI * 2) * 5]);
  return { lines: groundLines([ring], 0.08), lineMat: lineMaterial(LINE) };
}

function Settlement({ t, index }: { t: Territory; index: number }) {
  const built = useMemo(() => {
    const b = buildSettlement(t);
    if (b.dots) {
      b.dotGeo = new THREE.BufferGeometry();
      b.dotGeo.setAttribute("position", new THREE.BufferAttribute(b.dots, 3));
      b.dotMat = new THREE.PointsMaterial({
        color: t.id === "agriculture" ? LIME.clone() : CYAN.clone(),
        size: t.id === "agriculture" ? 0.07 : 0.22,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
    }
    return b;
  }, [t]);

  const moverMesh = useRef<THREE.InstancedMesh>(null);
  const lineRef = useRef<THREE.LineSegments<THREE.BufferGeometry, THREE.ShaderMaterial>>(null);
  const dotRef = useRef<THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial>>(null);
  const beacon = useRef<THREE.Group>(null);
  const tmp = useRef({ m: new THREE.Matrix4(), p: new THREE.Vector3(), q: new THREE.Quaternion(), s: new THREE.Vector3() });
  const chapter = CHAPTER.territoryA + index;

  useEffect(
    () => () => {
      built.lines.dispose();
      built.lineMat.dispose();
      built.dotGeo?.dispose();
      built.dotMat?.dispose();
    },
    [built],
  );

  useFrame((state) => {
    const c = frame.chapter;
    const time = state.clock.elapsedTime;
    const present = THREE.MathUtils.smoothstep(c, chapter - 0.7, chapter - 0.05);
    const active = Math.max(0, 1 - Math.abs(c - chapter) * 1.3);
    if (lineRef.current) {
      lineRef.current.material.uniforms.uDraw.value = present * 1.001;
      lineRef.current.material.uniforms.uGlow.value = active;
    }
    if (dotRef.current) {
      dotRef.current.material.opacity = present * (0.35 + 0.65 * active) * (t.id === "agriculture" ? 0.5 + 0.5 * Math.sin(time * 1.5) ** 2 : 1);
    }
    const mm = moverMesh.current;
    if (mm && built.movers) {
      const { curves, count } = built.movers;
      const T = tmp.current;
      for (let i = 0; i < count; i++) {
        const curve = curves[i % curves.length];
        const f = (time * (0.08 + (i % 3) * 0.03) + i * 0.37) % 1;
        curve.getPointAt(f, T.p);
        const scale = present * (0.4 + 0.6 * active);
        T.s.setScalar(scale);
        T.m.compose(T.p, T.q, T.s);
        mm.setMatrixAt(i, T.m);
      }
      mm.instanceMatrix.needsUpdate = true;
    }
    if (beacon.current) {
      beacon.current.position.y = terrainHeight(t.x, t.z) + 1.4 + Math.sin(time * 1.2) * 0.15;
      beacon.current.rotation.y = time * 0.6;
      beacon.current.scale.setScalar(0.6 + active * 0.6);
    }
  });

  return (
    <group>
      <lineSegments ref={lineRef} geometry={built.lines} material={built.lineMat} frustumCulled={false} renderOrder={3} />
      {built.dotGeo && built.dotMat && <points ref={dotRef} geometry={built.dotGeo} material={built.dotMat} frustumCulled={false} renderOrder={3} />}
      {built.movers && (
        <instancedMesh ref={moverMesh} args={[undefined, undefined, built.movers.count]} frustumCulled={false} renderOrder={3}>
          <boxGeometry args={[0.16, 0.16, 0.16]} />
          <meshBasicMaterial color={t.id === "energy" ? "#c7f36b" : "#65e4e8"} transparent opacity={0.95} />
        </instancedMesh>
      )}
      {t.id === "open" && (
        <group ref={beacon} position={[t.x, 0, t.z]}>
          <mesh>
            <octahedronGeometry args={[0.32, 0]} />
            <meshBasicMaterial color="#9fb3c4" wireframe transparent opacity={0.8} />
          </mesh>
        </group>
      )}
    </group>
  );
}

export function Territories() {
  return (
    <>
      {TERRITORIES.map((t, i) => (
        <Settlement key={t.id} t={t} index={i} />
      ))}
    </>
  );
}
