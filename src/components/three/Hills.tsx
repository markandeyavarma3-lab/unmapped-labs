"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { HILLS, HILL_FIELDS, RIVER_CITY, RIVER_END, ROAD_END, VILLAGES, hillHeight, riverWidth, riverX, riverY, roadX, roadY } from "./hill-terrain";
import { RING_X, RIVER_CITY_W, SCALE, SETS, TREE_TINT, ROOF_HOUSE, type AnyModel, type Placement } from "./city-layout";
import { createBatch, createDynamicBatch, createPaletteMaterial, releaseBatch, useModels } from "./models";
import { mulberry32, simplex2 } from "./terrain-math";
import type { Tier } from "./Scene";

/**
 * Two ranges of low-poly hills: north of the city, where the visit begins on
 * the ridge, and south of it, where the journey leaves the city behind.
 * The northern valley carries a river down into the city and out to the sea,
 * and a road with traffic climbs beside it past small villages and their
 * fields. Clouds drift over the ridges; birds wheel over the valley.
 */

const MEADOW = new THREE.Color("#9cc463");
const MEADOW_2 = new THREE.Color("#86b552");
const GOLD = new THREE.Color("#d2bf6a");
const DRY = new THREE.Color("#c7a467");
const ROCK = new THREE.Color("#a98f72");
const CREST = new THREE.Color("#e6d2a6");
const BANK = new THREE.Color("#8c9a5a");
const CROPS = ["#e3c56a", "#a9c95a", "#c49a68", "#d9b85a"].map((c) => new THREE.Color(c));

function terrain(z0: number, z1: number, segX: number, segZ: number) {
  const g = new THREE.PlaneGeometry(HILLS.x1 - HILLS.x0, Math.abs(z1 - z0), segX, segZ);
  g.rotateX(-Math.PI / 2);
  g.translate((HILLS.x0 + HILLS.x1) / 2, 0, (z0 + z1) / 2);
  const pos = g.attributes.position as THREE.BufferAttribute;
  const col = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const h = hillHeight(x, z);
    pos.setY(i, h - 0.03);
    const e = 1.2;
    const slope = Math.hypot(hillHeight(x + e, z) - hillHeight(x - e, z), hillHeight(x, z + e) - hillHeight(x, z - e)) / (2 * e);
    const n = simplex2(x * 0.06, z * 0.06) * 0.5 + 0.5;
    c.copy(MEADOW).lerp(MEADOW_2, n);
    c.lerp(GOLD, THREE.MathUtils.smoothstep(h, 5, 16) * (0.55 + 0.45 * n));
    c.lerp(DRY, THREE.MathUtils.smoothstep(h, 14, 26) * 0.7);
    c.lerp(ROCK, THREE.MathUtils.smoothstep(slope, 0.55, 1.1));
    c.lerp(CREST, THREE.MathUtils.smoothstep(h, 24, 34) * 0.75);
    // darker, lusher banks along the river
    const d = z - HILLS.north.z0;
    if (d > 0 && d < RIVER_END) c.lerp(BANK, 1 - THREE.MathUtils.smoothstep(Math.abs(x - riverX(d)), 2, 7));
    col.set([c.r, c.g, c.b], i * 3);
  }
  g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  g.computeVertexNormals();
  g.computeBoundingBox();
  g.computeBoundingSphere();
  return g;
}

/** A strip along a path that follows the ground: `aT` = distance along, `aS` = −1 … 1 across. */
function strip(points: [number, number, number][], widths: number[]) {
  const pos: number[] = [], t: number[] = [], side: number[] = [], idx: number[] = [];
  let run = 0;
  for (let i = 0; i < points.length; i++) {
    const [x, y, z] = points[i];
    const [px, , pz] = points[Math.max(0, i - 1)];
    const [nx, , nz] = points[Math.min(points.length - 1, i + 1)];
    const dx = nx - px, dz = nz - pz;
    const len = Math.hypot(dx, dz) || 1;
    const ox = (-dz / len) * widths[i] * 0.5, oz = (dx / len) * widths[i] * 0.5;
    if (i > 0) run += Math.hypot(x - points[i - 1][0], z - points[i - 1][2]);
    pos.push(x + ox, y, z + oz, x - ox, y, z - oz);
    t.push(run, run);
    side.push(1, -1);
    if (i > 0) {
      const b = (i - 1) * 2;
      idx.push(b, b + 2, b + 1, b + 1, b + 2, b + 3); // counter-clockwise seen from above
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(new Array(pos.length).fill(0).map((_, k) => (k % 3 === 1 ? 1 : 0)), 3));
  g.setAttribute("aT", new THREE.Float32BufferAttribute(t, 1));
  g.setAttribute("aS", new THREE.Float32BufferAttribute(side, 1));
  g.setIndex(idx);
  g.computeBoundingSphere();
  return { geometry: g, length: run };
}

/** Lit, fogged material with a custom colour from the strip's coordinates. */
function stripMaterial(body: string, uniforms: Record<string, THREE.IUniform>, opts: THREE.MeshStandardMaterialParameters = {}) {
  const mat = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.9, ...opts });
  mat.onBeforeCompile = (s) => {
    Object.assign(s.uniforms, uniforms);
    const decl = Object.keys(uniforms).map((k) => `uniform float ${k};`).join("\n");
    s.vertexShader = s.vertexShader
      .replace("#include <common>", "#include <common>\nattribute float aT; attribute float aS; varying float vT; varying float vS;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvT = aT; vS = aS;");
    s.fragmentShader = s.fragmentShader
      .replace("#include <common>", `#include <common>\nvarying float vT; varying float vS;\n${decl}`)
      .replace("#include <color_fragment>", `#include <color_fragment>\n{\n${body}\n}`);
  };
  return mat;
}

const RIVER_BODY = /* glsl */ `
  float across = abs(vS);
  vec3 deep = vec3(0.13, 0.44, 0.6);
  vec3 shallow = vec3(0.36, 0.7, 0.74);
  vec3 col = mix(deep, shallow, smoothstep(0.2, 0.95, across));
  // streaks flowing downstream (aT runs from the source down to the sea)
  float flow = sin(vT * 1.6 - uTime * 3.0 + sin(vS * 3.0 + vT * 0.4) * 1.5);
  flow = pow(max(flow, 0.0), 10.0);
  col += vec3(0.35, 0.38, 0.36) * flow * (1.0 - across) * 0.7;
  col = mix(col, vec3(0.95, 0.96, 0.92), smoothstep(0.86, 0.98, across) * 0.55);
  diffuseColor.rgb = col;
`;
const ROAD_BODY = /* glsl */ `
  float across = abs(vS);
  vec3 col = vec3(0.13, 0.135, 0.15);
  float dash = step(fract(vT / 0.9), 0.5) * (1.0 - smoothstep(0.04, 0.08, across));
  float edge = smoothstep(0.8, 0.84, across) * (1.0 - smoothstep(0.9, 0.94, across));
  col = mix(col, vec3(0.9, 0.88, 0.82), max(dash, edge));
  col = mix(col, vec3(0.62, 0.56, 0.45), smoothstep(0.96, 1.0, across));
  diffuseColor.rgb = col;
`;

/* Road traffic on the hill road */
const CARS: AnyModel[] = ["car-sedan", "car-hatchback-sports", "car-suv", "car-taxi", "car-van", "car-delivery", "car-truck"];

export function Hills({ tier }: { tier: Tier }) {
  const geos = useModels();

  const built = useMemo(() => {
    const hi = tier === "high";
    const north = terrain(HILLS.north.z0, HILLS.north.z1, hi ? 170 : 100, hi ? 140 : 80);
    const south = terrain(HILLS.south.z0, HILLS.south.z1, hi ? 150 : 90, hi ? 110 : 66);
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true });
    const rand = mulberry32(808);

    // The river: from its source high in the valley, down to the city, across it to the sea.
    const rpts: [number, number, number][] = [];
    const rw: number[] = [];
    for (let d = RIVER_END; d > 0.5; d -= 1.5) {
      rpts.push([riverX(d), riverY(d), HILLS.north.z0 + d]);
      rw.push(riverWidth(d));
    }
    for (let i = 0; i < RIVER_CITY.length; i++) {
      const [x, z] = RIVER_CITY[i];
      rpts.push([x, 0.03, z]);
      rw.push(RIVER_CITY_W);
    }
    const river = strip(rpts, rw);
    const riverU = { uTime: { value: 0 } };
    const riverMat = stripMaterial(RIVER_BODY, riverU, { roughness: 0.25, metalness: 0.05 });

    // The road: from the end of the east ring road up the valley.
    const dpts: [number, number, number][] = [];
    for (let d = 0; d <= ROAD_END; d += 1.2) dpts.push([roadX(d), roadY(d) + 0.05, HILLS.north.z0 + d]);
    const road = strip(dpts, dpts.map(() => 1.05));
    const roadMat = stripMaterial(ROAD_BODY, {}, { roughness: 0.95 });

    // The bridge where the ring road crosses the river.
    const bz = RIVER_CITY.find(([x]) => Math.abs(x - RING_X) < 0.1)?.[1] ?? 79.4;
    const deck = new THREE.BoxGeometry(1.5, 0.05, RIVER_CITY_W + 1.2);
    deck.translate(RING_X, 0.05, bz);
    const railL = new THREE.BoxGeometry(0.08, 0.16, RIVER_CITY_W + 1.2);
    railL.translate(RING_X - 0.72, 0.13, bz);
    const railR = railL.clone();
    railR.translate(1.44, 0, 0);
    const bridge = mergeGeometries([deck, railL, railR])!;
    [deck, railL, railR].forEach((g) => g.dispose());
    const bridgeMat = new THREE.MeshStandardMaterial({ color: "#d9cfbe", roughness: 0.9 });

    // Fields beside the villages: strips that follow the ground, with furrows.
    const fieldParts = HILL_FIELDS.map((f) => {
      const g = new THREE.PlaneGeometry(f.x1 - f.x0, Math.abs(f.z1 - f.z0), 6, 6);
      g.rotateX(-Math.PI / 2);
      g.translate((f.x0 + f.x1) / 2, 0, (f.z0 + f.z1) / 2);
      const p = g.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < p.count; i++) p.setY(i, hillHeight(p.getX(i), p.getZ(i)) + 0.04);
      const c = CROPS[f.tint];
      g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(p.count * 3).map((_, k) => [c.r, c.g, c.b][k % 3]), 3));
      g.deleteAttribute("uv");
      g.computeVertexNormals();
      return g;
    });
    const fieldGeo = mergeGeometries(fieldParts)!;
    fieldParts.forEach((g) => g.dispose());
    const fieldMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true });
    fieldMat.onBeforeCompile = (s) => {
      s.vertexShader = s.vertexShader
        .replace("#include <common>", "#include <common>\nvarying vec3 vFW;")
        .replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\nvFW = (modelMatrix * vec4(transformed, 1.0)).xyz;");
      s.fragmentShader = s.fragmentShader
        .replace("#include <common>", "#include <common>\nvarying vec3 vFW;")
        .replace("#include <color_fragment>", "#include <color_fragment>\ndiffuseColor.rgb *= 0.86 + 0.14 * step(0.5, fract(vFW.x / 0.45));");
    };

    // Villages, and pine woods on the gentler slopes.
    const nearPath = (x: number, z: number) => {
      const d = z - HILLS.north.z0;
      if (d <= 0) return false;
      return (d < RIVER_END + 4 && Math.abs(x - riverX(d)) < 3.5) || (d < ROAD_END + 4 && Math.abs(x - roadX(d)) < 2.6);
    };
    const statics: Placement[] = [];
    for (const v of VILLAGES) {
      const r = mulberry32(v.seed * 97);
      for (let k = 0; k < v.houses * 3 && statics.filter((p) => (p as Placement & { v?: number }).v === v.seed).length < v.houses; k++) {
        const a = r() * Math.PI * 2, rad = 1.2 + r() * 4.2;
        const x = v.x + Math.cos(a) * rad, z = v.z + Math.sin(a) * rad;
        if (nearPath(x, z)) continue;
        if (statics.some((p) => Math.hypot(p.x - x, p.z - z) < 1.4)) continue;
        statics.push(Object.assign({ m: SETS.house[Math.floor(r() * SETS.house.length)], x, z, y: hillHeight(x, z) - 0.06, ry: Math.floor(r() * 4) * (Math.PI / 2), s: SCALE.house, tint: ROOF_HOUSE[Math.floor(r() * ROOF_HOUSE.length)] }, { v: v.seed }));
      }
      for (let k = 0; k < 6; k++) {
        const x = v.x + (r() - 0.5) * 12, z = v.z + (r() - 0.5) * 12;
        if (!nearPath(x, z) && !statics.some((p) => Math.hypot(p.x - x, p.z - z) < 1.0)) statics.push({ m: SETS.tree[Math.floor(r() * SETS.tree.length)], x, z, y: hillHeight(x, z) - 0.05, ry: r() * 6.28, s: SCALE.tree * (0.8 + r() * 0.5), tint: TREE_TINT[Math.floor(r() * TREE_TINT.length)] });
      }
    }
    const want = hi ? 1500 : 600;
    let trees = 0;
    for (let k = 0; k < want * 4 && trees < want; k++) {
      const isNorth = rand() < 0.5;
      const range = HILLS[isNorth ? "north" : "south"];
      const d = Math.pow(rand(), 1.6) * 170 + 2;
      const z = isNorth ? range.z0 + d : range.z0 - d;
      const x = HILLS.x0 + 20 + rand() * (HILLS.x1 - HILLS.x0 - 40);
      if (x > 30 && x < 34) continue; // the shore
      if (nearPath(x, z) || VILLAGES.some((v) => Math.hypot(v.x - x, v.z - z) < 9)) continue;
      const h = hillHeight(x, z);
      if (h > 22) continue;
      const clump = simplex2(x * 0.035 + 3, z * 0.035);
      if (clump < 0.05 && rand() < 0.9) continue;
      const big = 1.3 + d / 70;
      statics.push({ m: SETS.pine[Math.floor(rand() * SETS.pine.length)], x, z, y: h - 0.05, ry: rand() * 6.28, s: 0.55 * big * (0.75 + rand() * 0.5), tint: TREE_TINT[Math.floor(rand() * TREE_TINT.length)] });
      trees++;
    }
    const palette = createPaletteMaterial(tier);
    const batch = createBatch(geos, statics, palette);
    batch.mesh.receiveShadow = false;

    // Traffic on the hill road, both ways (keeping left).
    const roadLen = road.length;
    const carCount = hi ? 12 : 7;
    const traffic = createDynamicBatch(geos, CARS, carCount, createPaletteMaterial(tier));
    const cars = Array.from({ length: carCount }, (_, i) => ({ id: traffic.add(CARS[i % CARS.length], [0xffffff, 0xffe0d0, 0xd0e4ff, 0xfff4c0][i % 4]), u: (i / carCount) * roadLen, dir: i % 2 ? 1 : -1, v: 1.6 + rand() * 0.8 }));
    const roadCum = [0];
    for (let i = 1; i < dpts.length; i++) roadCum.push(roadCum[i - 1] + Math.hypot(dpts[i][0] - dpts[i - 1][0], dpts[i][2] - dpts[i - 1][2]));

    // Clouds: a few low-poly shapes, instanced over both ranges.
    const shapes = [0, 1, 2].map((k) => {
      const r = mulberry32(300 + k);
      const parts: THREE.BufferGeometry[] = [];
      const n = 5 + k;
      for (let i = 0; i < n; i++) {
        const g = new THREE.IcosahedronGeometry(1 + r() * 0.8, 1);
        g.scale(1, 0.62, 1);
        g.translate((i - n / 2) * 1.2 + (r() - 0.5) * 0.6, (r() - 0.3) * 0.5, (r() - 0.5) * 1.4);
        g.deleteAttribute("uv");
        parts.push(g);
      }
      const g = mergeGeometries(parts)!;
      parts.forEach((p) => p.dispose());
      return g;
    });
    const cloudMat = new THREE.MeshLambertMaterial({ color: "#ffffff", emissive: "#fff3e4", emissiveIntensity: 0.35, flatShading: true });
    const cloudSpots = Array.from({ length: hi ? 30 : 16 }, (_, i) => {
      const isNorth = i % 2 === 0;
      return {
        shape: i % 3,
        x: -170 + rand() * 340,
        y: 32 + rand() * 16,
        z: isNorth ? HILLS.north.z0 + 30 + rand() * 230 : HILLS.south.z0 - 30 - rand() * 230,
        s: 3 + rand() * 3,
        sp: 0.5 + rand() * 0.6,
      };
    });
    const clouds = shapes.map((g, k) => {
      const mesh = new THREE.InstancedMesh(g, cloudMat, cloudSpots.filter((c) => c.shape === k).length);
      mesh.frustumCulled = false;
      return mesh;
    });

    // Birds over the valleys.
    const flocks = [
      { x: 8, y: 13, z: HILLS.north.z0 + 40, r: 7, sp: 0.22 },
      { x: -12, y: 17, z: HILLS.north.z0 + 78, r: 10, sp: -0.17 },
      { x: -20, y: 24, z: HILLS.south.z0 - 95, r: 12, sp: 0.19 },
    ];
    const per = hi ? 10 : 6;
    const birdOffsets = Array.from({ length: flocks.length * per }, () => new THREE.Vector3((rand() - 0.5) * 3, (rand() - 0.5) * 1, (rand() - 0.5) * 3));
    const birds = new THREE.InstancedMesh(geos["proc-bird"], new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }), birdOffsets.length);
    birds.frustumCulled = false;

    return { north, south, mat, river, riverU, riverMat, road, roadMat, bridge, bridgeMat, fieldGeo, fieldMat, palette, batch, traffic, cars, dpts, roadCum, shapes, cloudMat, cloudSpots, clouds, flocks, per, birdOffsets, birds };
  }, [geos, tier]);

  useEffect(
    () => () => {
      const b = built;
      [b.north, b.south, b.river.geometry, b.road.geometry, b.bridge, b.fieldGeo, ...b.shapes].forEach((g) => g.dispose());
      [b.mat, b.riverMat, b.roadMat, b.bridgeMat, b.fieldMat, b.palette, b.cloudMat, b.birds.material as THREE.Material, b.traffic.mesh.material as THREE.Material].forEach((m) => m.dispose());
      releaseBatch(b.batch.mesh);
      releaseBatch(b.traffic.mesh);
      b.clouds.forEach((c) => c.dispose());
      b.birds.dispose();
    },
    [built],
  );

  const T = useRef({ m: new THREE.Matrix4(), q: new THREE.Quaternion(), p: new THREE.Vector3(), s: new THREE.Vector3(), e: new THREE.Euler(), y: new THREE.Vector3(0, 1, 0) }).current;

  useFrame((state, delta) => {
    const b = built;
    const t = state.clock.elapsedTime;
    const dt = Math.min(delta, 1 / 20);
    b.riverU.uTime.value = t;

    // Traffic: each car runs the road one way, then turns round at the end.
    const pts = b.dpts, cum = b.roadCum, L = cum[cum.length - 1];
    for (const c of b.cars) {
      c.u += c.v * dt * c.dir;
      if (c.u > L) {
        c.u = L;
        c.dir = -1;
      } else if (c.u < 0) {
        c.u = 0;
        c.dir = 1;
      }
      let i = 1;
      while (i < cum.length - 1 && cum[i] < c.u) i++;
      const k = (c.u - cum[i - 1]) / Math.max(1e-5, cum[i] - cum[i - 1]);
      const [ax, ay, az] = pts[i - 1], [bx, by, bz] = pts[i];
      const hx = bx - ax, hz = bz - az;
      const len = Math.hypot(hx, hz) || 1;
      // keep left of the direction of travel
      const side = 0.26 * c.dir;
      const x = ax + hx * k + (hz / len) * side, z = az + hz * k - (hx / len) * side;
      const heading = Math.atan2(hx, hz) + (c.dir < 0 ? Math.PI : 0);
      const fade = THREE.MathUtils.clamp(Math.min(c.u, L - c.u) / 1.5, 0, 1);
      T.q.setFromAxisAngle(T.y, heading);
      b.traffic.mesh.setMatrixAt(c.id, T.m.compose(T.p.set(x, ay + (by - ay) * k - 0.04, z), T.q, T.s.setScalar(SCALE.car * fade)));
    }

    // Clouds drift east, wrapping round.
    const counters = [0, 0, 0];
    for (const c of b.cloudSpots) {
      const x = ((c.x + t * c.sp + 170) % 340 + 340) % 340 - 170;
      const mesh = b.clouds[c.shape];
      T.q.setFromAxisAngle(T.y, c.shape * 0.7);
      mesh.setMatrixAt(counters[c.shape]++, T.m.compose(T.p.set(x, c.y, c.z), T.q, T.s.set(c.s, c.s, c.s)));
    }
    b.clouds.forEach((m) => (m.instanceMatrix.needsUpdate = true));

    // Birds
    let k = 0;
    b.flocks.forEach((f, fi) => {
      const a = t * f.sp + fi * 2;
      const cx = f.x + Math.cos(a) * f.r, cz = f.z + Math.sin(a) * f.r;
      const heading = Math.atan2(-Math.sin(a) * f.sp, Math.cos(a) * f.sp);
      for (let i = 0; i < b.per; i++, k++) {
        const o = b.birdOffsets[k];
        const flap = Math.sin(t * 9 + k * 1.7);
        T.q.setFromAxisAngle(T.y, heading + Math.PI / 2);
        b.birds.setMatrixAt(k, T.m.compose(T.p.set(cx + o.x, f.y + o.y + Math.sin(t * 0.7 + k) * 0.25, cz + o.z), T.q, T.s.set(1.6, 1.6 * flap, 1.6)));
      }
    });
    b.birds.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      <mesh geometry={built.north} material={built.mat} receiveShadow />
      <mesh geometry={built.south} material={built.mat} receiveShadow />
      <mesh geometry={built.fieldGeo} material={built.fieldMat} receiveShadow />
      <mesh geometry={built.river.geometry} material={built.riverMat} receiveShadow />
      <mesh geometry={built.road.geometry} material={built.roadMat} receiveShadow />
      <mesh geometry={built.bridge} material={built.bridgeMat} castShadow receiveShadow />
      <primitive object={built.batch.mesh} />
      <primitive object={built.traffic.mesh} />
      {built.clouds.map((c, i) => (
        <primitive key={i} object={c} />
      ))}
      <primitive object={built.birds} />
    </group>
  );
}
