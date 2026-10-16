"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { GROUND, LETTER_TINT, RAIL_X, ROADS, buildCity, type CityData, type Road } from "./city-layout";
import { MODELS } from "./models.generated";
import { createBatch, createPaletteMaterial, useModels, type Geometries, releaseBatch } from "./models";
import { paintGround } from "./ground-paint";
import { frame } from "./frame-state";
import type { Tier } from "./Scene";

/**
 * The miniature city: painted ground, roads with crisp markings, every
 * static model in one BatchedMesh, and the downtown towers that spell the
 * name before settling into the skyline.
 */

/* ------------------------------------------------------------------ */
/* Roads                                                              */
/* ------------------------------------------------------------------ */

const KIND_CODE: Record<Road[5], number> = { avenue: 0, street: 1, lane: 2 };

/** Splits roads at their crossings: marked segments plus plain junction squares. */
function buildRoadGeometry() {
  const pos: number[] = [], uv: number[] = [], info: number[] = [], idx: number[] = [];
  const quad = (x0: number, z0: number, x1: number, z1: number, horizontal: boolean, w: number, len: number, kind: number) => {
    const b = pos.length / 3;
    const y = 0.02;
    pos.push(x0, y, z0, x1, y, z0, x1, y, z1, x0, y, z1);
    // uv.x runs across the road (0..1), uv.y along it in world units
    if (horizontal) uv.push(0, 0, 0, len, 1, len, 1, 0);
    else uv.push(0, 0, 1, 0, 1, len, 0, len);
    for (let k = 0; k < 4; k++) info.push(w, len, kind);
    idx.push(b, b + 2, b + 1, b, b + 3, b + 2);
  };

  const junctions = new Set<string>();
  for (const r of ROADS) {
    const [x1, z1, x2, z2, w, kind] = r;
    const horizontal = z1 === z2;
    const a0 = horizontal ? Math.min(x1, x2) : Math.min(z1, z2);
    const a1 = horizontal ? Math.max(x1, x2) : Math.max(z1, z2);
    const c = horizontal ? z1 : x1;
    // where perpendicular roads cross this one
    const cuts: [number, number][] = [];
    for (const o of ROADS) {
      if (o === r) continue;
      const oh = o[1] === o[3];
      if (oh === horizontal) continue;
      const oc = oh ? o[1] : o[0];
      const o0 = oh ? Math.min(o[0], o[2]) : Math.min(o[1], o[3]);
      const o1 = oh ? Math.max(o[0], o[2]) : Math.max(o[1], o[3]);
      if (oc < a0 - 0.01 || oc > a1 + 0.01 || c < o0 - o[4] / 2 || c > o1 + o[4] / 2) continue;
      cuts.push([oc - o[4] / 2, oc + o[4] / 2]);
      const key = horizontal ? `${oc},${c}` : `${c},${oc}`;
      if (!junctions.has(key)) {
        junctions.add(key);
        const jx = horizontal ? oc : c, jz = horizontal ? c : oc;
        const hw = (horizontal ? o[4] : w) / 2, hd = (horizontal ? w : o[4]) / 2;
        quad(jx - hw, jz - hd, jx + hw, jz + hd, true, 1, 1, 9);
      }
    }
    cuts.sort((p, q) => p[0] - q[0]);
    let s = a0;
    const spans: [number, number][] = [];
    for (const [c0, c1] of cuts) {
      if (c0 > s + 0.05) spans.push([s, c0]);
      s = Math.max(s, c1);
    }
    if (a1 > s + 0.05) spans.push([s, a1]);
    for (const [s0, s1] of spans) {
      const len = s1 - s0;
      if (horizontal) quad(s0, c - w / 2, s1, c + w / 2, true, w, len, KIND_CODE[kind]);
      else quad(c - w / 2, s0, c + w / 2, s1, false, w, len, KIND_CODE[kind]);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(new Array(pos.length).fill(0).map((_, i) => (i % 3 === 1 ? 1 : 0)), 3));
  g.setAttribute("aRoadUv", new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute("aRoad", new THREE.Float32BufferAttribute(info, 3));
  g.setIndex(idx);
  return g;
}

function roadMaterial() {
  const mat = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.92 });
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nattribute vec2 aRoadUv; attribute vec3 aRoad; varying vec2 vRoadUv; varying vec3 vRoad;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvRoadUv = aRoadUv; vRoad = aRoad;");
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
        varying vec2 vRoadUv; varying vec3 vRoad;
        float band(float x, float c, float hw) { float aa = fwidth(x) * 0.75; return 1.0 - smoothstep(hw - aa, hw + aa, abs(x - c)); }`,
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
        {
          float w = vRoad.x, len = vRoad.y, kind = vRoad.z;
          vec3 asphalt = vec3(0.105, 0.11, 0.122);
          vec3 paint = vec3(0.86, 0.84, 0.8);
          vec3 yellow = vec3(0.95, 0.62, 0.12);
          vec3 col = asphalt;
          if (kind < 8.5) {
            float ax = vRoadUv.x * w;
            float al = vRoadUv.y;
            float endD = min(al, len - al);
            float mid = step(0.55, endD);
            // fine grain
            col *= 0.94 + 0.06 * fract(sin(dot(floor(vec2(ax, al) * 24.0), vec2(12.9898, 78.233))) * 43758.5453);
            if (kind < 0.5) {
              // avenue: double yellow centre, dashed lane lines, edge lines
              col = mix(col, yellow, (band(ax, w * 0.5 - 0.035, 0.012) + band(ax, w * 0.5 + 0.035, 0.012)) * mid);
              float dash = step(fract(al / 0.6), 0.5) * mid;
              col = mix(col, paint, (band(ax, w * 0.25, 0.012) + band(ax, w * 0.75, 0.012)) * dash);
              col = mix(col, paint, (band(ax, 0.06, 0.01) + band(ax, w - 0.06, 0.01)) * mid);
            } else if (kind < 1.5) {
              float dash = step(fract(al / 0.5), 0.5) * mid;
              col = mix(col, paint, band(ax, w * 0.5, 0.013) * dash);
              col = mix(col, paint, (band(ax, 0.05, 0.009) + band(ax, w - 0.05, 0.009)) * mid);
            }
            if (kind < 1.5) {
              // zebra crossings at every junction
              float zebra = step(0.06, endD) * step(endD, 0.36) * step(fract(ax / 0.11), 0.55) * step(0.05, ax) * step(ax, w - 0.05);
              col = mix(col, paint, zebra);
            }
          }
          diffuseColor.rgb = col;
        }`,
      );
  };
  return mat;
}

/* ------------------------------------------------------------------ */
/* Title towers                                                       */
/* ------------------------------------------------------------------ */

function buildTowers(geos: Geometries, data: CityData, material: THREE.Material) {
  const placements = data.towers.map((t) => ({ m: t.m, x: t.x, z: t.z, ry: t.ry, s: 1, sy: 0.02, tint: t.tint }));
  const batch = createBatch(geos, placements, material);
  return batch;
}

export function City({ tier }: { tier: Tier }) {
  const geos = useModels();
  const gl = useThree((s) => s.gl);
  // Buildings mount a frame after the ground, so neither build is one long task.
  const [blocks, setBlocks] = useState(false);
  useFrame(() => {
    if (!blocks) setBlocks(true);
  });

  const built = useMemo(() => {
    const layout = window.innerWidth / window.innerHeight < 0.9 ? "stacked" : "line";
    const data = buildCity(layout, tier === "high" ? 1 : 0.55);
    const material = createPaletteMaterial(tier);

    const canvas = paintGround(data.title, tier === "high" ? 1 : 0.75, tier === "high" ? 2600 : 900);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy());
    const groundGeo = new THREE.PlaneGeometry(GROUND.maxX - GROUND.minX, GROUND.maxZ - GROUND.minZ);
    groundGeo.rotateX(-Math.PI / 2);
    groundGeo.translate((GROUND.minX + GROUND.maxX) / 2, 0, (GROUND.minZ + GROUND.maxZ) / 2);
    const groundMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 1 });
    // Beyond the painted ground: plain fields fading into the haze.
    const farGeo = new THREE.PlaneGeometry(900, 900);
    farGeo.rotateX(-Math.PI / 2);
    farGeo.translate(-150, -0.02, 0);
    const farMat = new THREE.MeshStandardMaterial({ color: "#a3c46a", roughness: 1 });

    const roadGeo = buildRoadGeometry();
    const roadMat = roadMaterial();

    // Railway: two rails and sleepers along the western line.
    const railLen = GROUND.maxZ - GROUND.minZ + 200;
    const railGeo = new THREE.BoxGeometry(0.04, 0.04, railLen);
    const railMat = new THREE.MeshStandardMaterial({ color: "#6d6660", roughness: 0.5, metalness: 0.4 });
    const sleeperCount = Math.floor(railLen / 0.3);
    const sleepers = new THREE.InstancedMesh(new THREE.BoxGeometry(0.62, 0.03, 0.1), new THREE.MeshStandardMaterial({ color: "#7a5b40", roughness: 1 }), sleeperCount);
    const m4 = new THREE.Matrix4();
    for (let i = 0; i < sleeperCount; i++) sleepers.setMatrixAt(i, m4.makeTranslation(RAIL_X, 0.02, GROUND.maxZ + 100 - i * 0.3));
    sleepers.receiveShadow = true;

    return { data, material, tex, groundGeo, groundMat, farGeo, farMat, roadGeo, roadMat, railGeo, railMat, sleepers, railLen };
  }, [gl, tier]);

  useEffect(
    () => () => {
      const b = built;
      b.material.dispose();
      b.tex.dispose();
      b.groundGeo.dispose();
      b.groundMat.dispose();
      b.farGeo.dispose();
      b.farMat.dispose();
      b.roadGeo.dispose();
      b.roadMat.dispose();
      b.railGeo.dispose();
      b.railMat.dispose();
      b.sleepers.geometry.dispose();
      (b.sleepers.material as THREE.Material).dispose();
      b.sleepers.dispose();
    },
    [built],
  );

  return (
    <group>
      <mesh geometry={built.farGeo} material={built.farMat} receiveShadow />
      <mesh geometry={built.groundGeo} material={built.groundMat} receiveShadow />
      <mesh geometry={built.roadGeo} material={built.roadMat} receiveShadow />
      <mesh geometry={built.railGeo} material={built.railMat} position={[RAIL_X - 0.22, 0.05, (GROUND.maxZ + GROUND.minZ) / 2]} />
      <mesh geometry={built.railGeo} material={built.railMat} position={[RAIL_X + 0.22, 0.05, (GROUND.maxZ + GROUND.minZ) / 2]} />
      <primitive object={built.sleepers} />
      {blocks && <CityBlocks geos={geos} data={built.data} material={built.material} />}
    </group>
  );
}

/** Every static building, tree and lamp, plus the towers that spell the name. */
function CityBlocks({ geos, data, material }: { geos: Geometries; data: CityData; material: THREE.Material }) {
  const built = useMemo(() => ({ stat: createBatch(geos, data.placements, material), towers: buildTowers(geos, data, material) }), [geos, data, material]);

  useEffect(
    () => () => {
      releaseBatch(built.stat.mesh);
      releaseBatch(built.towers.mesh);
    },
    [built],
  );

  const ref = useRef(built);
  useEffect(() => {
    ref.current = built;
  }, [built]);
  const anim = useRef({ rise: -1, title: -1, c: new THREE.Color(), letter: new THREE.Color(LETTER_TINT), m: new THREE.Matrix4(), q: new THREE.Quaternion(), p: new THREE.Vector3(), s: new THREE.Vector3(), y: new THREE.Vector3(0, 1, 0) });

  useFrame(() => {
    const b = ref.current;
    const A = anim.current;
    // The name rises out of the city as the camera dives in from the hills, then melts back into the skyline.
    const loaded = THREE.MathUtils.clamp((frame.time - 0.25) / 2.6, 0, 1);
    const arrived = THREE.MathUtils.clamp((frame.chapter + 0.4) / 0.36, 0, 1);
    const rise = 1 - Math.pow(1 - Math.min(loaded, arrived), 3);
    const title = 1 - THREE.MathUtils.smoothstep(frame.chapter, 1.15, 1.95);
    if (Math.abs(rise - A.rise) < 1e-4 && Math.abs(title - A.title) < 1e-4) return;
    A.rise = rise;
    A.title = title;
    const towers = data.towers;
    for (let i = 0; i < towers.length; i++) {
      const t = towers[i];
      // ripple outward from the centre as they rise
      const delay = Math.min(0.5, Math.hypot(t.x, (t.z - 47) * 1.6) / 40);
      const r = THREE.MathUtils.clamp((rise - delay) / (1 - delay), 0, 1);
      const h = (t.letter ? THREE.MathUtils.lerp(t.h, t.letterH, title) : t.h) * Math.max(0.02, r);
      const modelH = MODELS[t.m].size[1];
      A.q.setFromAxisAngle(A.y, t.ry);
      A.p.set(t.x, 0, t.z);
      A.s.set(1, Math.max(0.01, h / modelH), 1);
      b.towers.mesh.setMatrixAt(b.towers.instances[i], A.m.compose(A.p, A.q, A.s));
      // letters glow teal while they spell the name
      if (t.letter) b.towers.mesh.setColorAt(b.towers.instances[i], A.c.setHex(t.tint).lerp(A.letter, title));
    }
  });

  return (
    <>
      <primitive object={built.stat.mesh} />
      <primitive object={built.towers.mesh} />
    </>
  );
}
