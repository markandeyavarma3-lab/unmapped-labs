"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { CHAPTER, WORK_SITES, type WorkSite } from "./landmarks";
import { mulberry32, terrainHeight } from "./terrain-math";
import { frame } from "./frame-state";
import { groundLines, lineMaterial } from "./Territories";

/**
 * The two case studies as places on the map.
 * FlowMatch — a borewell field: pumps push water along channels to crops,
 *   one pump (the match) glows lime.
 * Deal Lens — a data skyline: one column per slice of deals, a survey sweep
 *   reading across them, participant links lighting up.
 */

const CYAN = new THREE.Color("#65e4e8");
const LIME = new THREE.Color("#c7f36b");
const SLATE = new THREE.Color("#9fb3c4");

function rotXZ(w: WorkSite, dx: number, dz: number, a: number): [number, number] {
  const c = Math.cos(a), s = Math.sin(a);
  return [w.x + dx * c - dz * s, w.z + dx * s + dz * c];
}

/* ------------------------------------------------------------------ */
/* FlowMatch                                                          */
/* ------------------------------------------------------------------ */

function FlowMatchSite({ w }: { w: WorkSite }) {
  const built = useMemo(() => {
    const a = 0.5;
    const pumps: [number, number][] = [];
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) pumps.push(rotXZ(w, -3 + c * 3, -2.4 + r * 2.4, a));
    const match = 4; // the centre pump is "the match"
    // channels from each pump to its field strip
    const channels = pumps.map(([x, z], i) => {
      const [fx, fz] = rotXZ(w, -3 + (i % 3) * 3 + 1.4, -2.4 + Math.floor(i / 3) * 2.4, a);
      return [[x, z], [(x + fx) / 2, (z + fz) / 2 + 0.2], [fx, fz]] as [number, number][];
    });
    // field strips (short furrows) beside each pump
    const furrows: [number, number][][] = [];
    pumps.forEach((_, i) => {
      for (let k = 0; k < 4; k++) {
        const ox = -3 + (i % 3) * 3 + 1.3;
        const oz = -2.4 + Math.floor(i / 3) * 2.4 - 0.45 + k * 0.3;
        furrows.push([rotXZ(w, ox, oz, a), rotXZ(w, ox + 1.1, oz, a)]);
      }
    });
    const curves = channels.map((c) => new THREE.CatmullRomCurve3(c.map(([x, z]) => new THREE.Vector3(x, terrainHeight(x, z) + 0.12, z))));
    return {
      pumps,
      match,
      channelGeo: groundLines(channels, 0.06, 0.15),
      channelMat: lineMaterial(CYAN),
      furrowGeo: groundLines(furrows, 0.05, 0.2),
      furrowMat: lineMaterial(SLATE),
      curves,
    };
  }, [w]);

  useEffect(
    () => () => {
      built.channelGeo.dispose();
      built.channelMat.dispose();
      built.furrowGeo.dispose();
      built.furrowMat.dispose();
    },
    [built],
  );

  const drops = useRef<THREE.InstancedMesh>(null);
  const ring = useRef<THREE.Mesh>(null);
  const pumpRefs = useRef<(THREE.Mesh | null)[]>([]);
  const tmp = useRef({ m: new THREE.Matrix4(), p: new THREE.Vector3(), q: new THREE.Quaternion(), s: new THREE.Vector3() });
  const builtRef = useRef(built);
  useEffect(() => {
    builtRef.current = built;
  }, [built]);

  useFrame((state) => {
    const b = builtRef.current;
    const c = frame.chapter;
    const t = state.clock.elapsedTime;
    const present = THREE.MathUtils.smoothstep(c, CHAPTER.workA - 0.7, CHAPTER.workA - 0.05);
    const active = Math.max(0, 1 - Math.abs(c - CHAPTER.workA) * 1.3);
    b.channelMat.uniforms.uDraw.value = present * 1.001;
    b.channelMat.uniforms.uGlow.value = active;
    b.furrowMat.uniforms.uDraw.value = present * 1.001;
    b.furrowMat.uniforms.uGlow.value = active * 0.6;
    // water drops travelling pump → field
    if (drops.current) {
      const T = tmp.current;
      const n = 27;
      for (let i = 0; i < n; i++) {
        const curve = b.curves[i % b.curves.length];
        const f = (t * 0.35 + Math.floor(i / b.curves.length) / 3) % 1;
        curve.getPointAt(f, T.p);
        T.s.setScalar(present * (0.5 + 0.5 * active) * (i % b.curves.length === b.match ? 1.3 : 1));
        T.m.compose(T.p, T.q, T.s);
        drops.current.setMatrixAt(i, T.m);
      }
      drops.current.instanceMatrix.needsUpdate = true;
    }
    pumpRefs.current.forEach((m, i) => {
      if (!m) return;
      m.scale.set(1, present * (i === b.match ? 1.25 : 1), 1);
    });
    if (ring.current) {
      const k = (t * 0.6) % 1;
      ring.current.scale.setScalar(0.4 + k * 1.6);
      (ring.current.material as THREE.MeshBasicMaterial).opacity = (1 - k) * active;
    }
  });

  const [mx, mz] = built.pumps[built.match];
  return (
    <group>
      <lineSegments geometry={built.channelGeo} material={built.channelMat} frustumCulled={false} renderOrder={3} />
      <lineSegments geometry={built.furrowGeo} material={built.furrowMat} frustumCulled={false} renderOrder={3} />
      {built.pumps.map(([x, z], i) => (
        <mesh
          key={i}
          ref={(m) => {
            pumpRefs.current[i] = m;
          }}
          position={[x, terrainHeight(x, z) + 0.25, z]}
        >
          <cylinderGeometry args={[0.09, 0.12, 0.5, 8]} />
          <meshBasicMaterial color={i === built.match ? LIME : CYAN} transparent opacity={0.9} />
        </mesh>
      ))}
      <mesh ref={ring} position={[mx, terrainHeight(mx, mz) + 0.05, mz]} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[0.45, 0.5, 40]} />
        <meshBasicMaterial color={LIME} transparent opacity={0} depthWrite={false} />
      </mesh>
      <instancedMesh ref={drops} args={[undefined, undefined, 27]} frustumCulled={false} renderOrder={3}>
        <sphereGeometry args={[0.06, 6, 6]} />
        <meshBasicMaterial color={CYAN} />
      </instancedMesh>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Deal Lens                                                          */
/* ------------------------------------------------------------------ */

const COLS = 12;
const ROWS = 8;

function DealLensSite({ w }: { w: WorkSite }) {
  const built = useMemo(() => {
    const rand = mulberry32(2005);
    const a = -0.35;
    const cells = Array.from({ length: COLS * ROWS }, (_, i) => {
      const c = i % COLS;
      const r = Math.floor(i / COLS);
      const [x, z] = rotXZ(w, -4.4 + c * 0.8, -2.8 + r * 0.8, a);
      // A deterministic "volume" profile: a broad swell with spikes (round-trip bursts).
      const swell = Math.sin((c / COLS) * Math.PI) * 0.7 + Math.cos((r / ROWS) * Math.PI * 1.3) * 0.2;
      const spike = rand() < 0.12 ? 1.2 + rand() : 0;
      return { x, z, y: terrainHeight(x, z), h: 0.25 + Math.max(0, swell) * 1.4 + spike, c };
    });
    // participant links between a few tall columns
    const tall = cells.filter((k) => k.h > 1.4);
    const links: [number, number][][] = [];
    for (let i = 0; i < tall.length - 1; i += 1) {
      const p = tall[i], q = tall[(i * 3 + 5) % tall.length];
      if (p === q) continue;
      links.push([[p.x, p.z], [(p.x + q.x) / 2, (p.z + q.z) / 2 + 0.6], [q.x, q.z]]);
    }
    return { cells, linkGeo: groundLines(links, 0.08, 0.2), linkMat: lineMaterial(LIME) };
  }, [w]);

  useEffect(
    () => () => {
      built.linkGeo.dispose();
      built.linkMat.dispose();
    },
    [built],
  );

  const cols = useRef<THREE.InstancedMesh>(null);
  const tmp = useRef({ m: new THREE.Matrix4(), p: new THREE.Vector3(), q: new THREE.Quaternion(), s: new THREE.Vector3(), col: new THREE.Color() });
  const builtRef = useRef(built);
  useEffect(() => {
    builtRef.current = built;
  }, [built]);

  useFrame((state) => {
    const b = builtRef.current;
    const c = frame.chapter;
    const t = state.clock.elapsedTime;
    const present = THREE.MathUtils.smoothstep(c, CHAPTER.workB - 0.7, CHAPTER.workB - 0.05);
    const active = Math.max(0, 1 - Math.abs(c - CHAPTER.workB) * 1.3);
    b.linkMat.uniforms.uDraw.value = present * active * 1.001;
    b.linkMat.uniforms.uGlow.value = active;
    const mesh = cols.current;
    if (!mesh) return;
    const T = tmp.current;
    const sweep = (t * 0.25) % 1; // survey sweep across the columns
    b.cells.forEach((k, i) => {
      const rise = THREE.MathUtils.clamp(present * 1.6 - (k.c / COLS) * 0.6, 0, 1);
      const h = k.h * rise;
      T.p.set(k.x, k.y + h / 2, k.z);
      T.s.set(1, Math.max(0.001, h), 1);
      T.m.compose(T.p, T.q, T.s);
      mesh.setMatrixAt(i, T.m);
      const near = Math.max(0, 1 - Math.abs(k.c / (COLS - 1) - sweep) * 6);
      T.col.copy(CYAN).multiplyScalar(0.35 + 0.65 * active).lerp(LIME, near * active);
      mesh.setColorAt(i, T.col);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return (
    <group>
      <instancedMesh ref={cols} args={[undefined, undefined, COLS * ROWS]} frustumCulled={false} renderOrder={3}>
        <boxGeometry args={[0.32, 1, 0.32]} />
        <meshBasicMaterial transparent opacity={0.85} />
      </instancedMesh>
      <lineSegments geometry={built.linkGeo} material={built.linkMat} frustumCulled={false} renderOrder={3} />
    </group>
  );
}

export function WorkSites() {
  return (
    <>
      <FlowMatchSite w={WORK_SITES[0]} />
      <DealLensSite w={WORK_SITES[1]} />
    </>
  );
}
