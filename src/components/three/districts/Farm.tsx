"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { DISTRICTS, SCALE, SETS, TREE_TINT, type Placement } from "../city-layout";
import { createBatch, createPaletteMaterial, releaseBatch, useModels } from "../models";
import { mulberry32 } from "../terrain-math";
import { caseState } from "../city-state";
import { pointScale } from "../fx";
import { FARM } from "./layout";
import { TEAM_SHIRT, createChart, createCrew, lerp, smooth, walk, type BarTone } from "./kit";
import { narrator } from "./copy";
import type { Tier } from "../Scene";

/**
 * A large commercial farm, and three problems it really has:
 *   harvest    — crates wait in the sun at the packhouse; a pre-cooler and picking in waves
 *   irrigation — the far ends of long drip lines go dry; regulators and moisture sensors
 *   pumps      — pump sets burning power; matched pumps fill the reservoir
 * Our team (teal) measures each one on site.
 */

const Fm = DISTRICTS.farms;
const ROW_SPACING = 0.3;

/** Drip blocks: soil wetness falls away from the manifold (east edge) until the fix evens it out. */
function blockSoil(uniforms: { uEven: THREE.IUniform }) {
  const mat = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 1 });
  mat.onBeforeCompile = (s) => {
    s.uniforms.uEven = uniforms.uEven;
    s.vertexShader = s.vertexShader
      .replace("#include <common>", "#include <common>\nattribute vec2 aSpan; varying vec3 vFW; varying vec2 vSpan;")
      .replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\nvFW = (modelMatrix * vec4(transformed, 1.0)).xyz; vSpan = aSpan;");
    s.fragmentShader = s.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vFW; varying vec2 vSpan; uniform float uEven;")
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
        {
          float far = clamp((vSpan.y - vFW.x) / (vSpan.y - vSpan.x), 0.0, 1.0); // 0 at the manifold, 1 at the far end
          float rows = abs(fract(vFW.z / ${FARM.rowGap.toFixed(2)}) - 0.5) * 2.0;
          float wet = mix(1.15 - far * 0.95, 0.8, uEven);
          vec3 dry = mix(vec3(0.66, 0.5, 0.3), vec3(0.74, 0.58, 0.34), rows);
          vec3 moist = mix(vec3(0.33, 0.24, 0.15), vec3(0.42, 0.31, 0.19), rows);
          vec3 col = mix(dry, moist, clamp(wet, 0.0, 1.0));
          // standing water by the manifold, before the fix
          float puddle = smoothstep(0.12, 0.0, far) * (1.0 - uEven) * step(0.6, fract(sin(dot(floor(vFW.xz * 3.0), vec2(12.9, 78.2))) * 437.5));
          col = mix(col, vec3(0.32, 0.5, 0.58), puddle * 0.7);
          // the drip line along each row
          col = mix(col, vec3(0.12, 0.13, 0.14), (1.0 - smoothstep(0.0, 0.08, 1.0 - rows)) * 0.8);
          diffuseColor.rgb = col;
        }`,
      );
  };
  return mat;
}

/* Water into the reservoir from each well's delivery pipe: a dribble before, a strong stream after. */
const jetVertex = /* glsl */ `
  attribute float aPhase; attribute vec3 aOrigin;
  uniform float uTime; uniform float uPower; uniform float uScale;
  varying float vAlpha;
  void main() {
    float age = fract(uTime * (0.7 + uPower * 0.8) + aPhase);
    vec3 v = vec3(sin(aPhase * 40.0) * 0.12, 0.35, -1.0) * mix(0.25, 1.0, uPower);
    vec3 p = aOrigin + v * age + vec3(0.0, -1.6 * age * age, 0.0);
    p.y = max(p.y, 0.0);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = (0.05 + 0.03 * uPower) * uScale / -mv.z;
    vAlpha = (1.0 - age) * mix(0.4, 0.9, uPower);
  }
`;
const jetFragment = /* glsl */ `
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = (1.0 - smoothstep(0.2, 0.5, d)) * vAlpha;
    if (a < 0.02) discard;
    gl_FragColor = vec4(0.55, 0.85, 1.0, a);
    #include <colorspace_fragment>
  }
`;
/* Heat haze over an overworked motor. */
const glowFragment = /* glsl */ `
  uniform vec3 uColor; uniform float uOpacity; varying vec2 vUv;
  void main() {
    float d = length(vUv - 0.5) * 2.0;
    float a = pow(max(0.0, 1.0 - d), 2.0) * uOpacity;
    if (a < 0.01) discard;
    gl_FragColor = vec4(uColor * a, a);
    #include <colorspace_fragment>
  }
`;

/* Chart data (shares of the board's height). */
/** Minutes waiting before cooling, per batch through the day; the limit line is 1 hour. */
const WAIT_BEFORE = [0.18, 0.3, 0.42, 0.55, 0.7, 0.82, 0.88, 0.8, 0.66, 0.5];
const WAIT_AFTER = [0.14, 0.18, 0.2, 0.17, 0.19, 0.21, 0.18, 0.2, 0.17, 0.15];
const WAIT_LIMIT = 0.25;
/** Water caught in cans along one row, manifold → far end; two clogged emitters. */
const CANS_BEFORE = [1.0, 0.95, 0.9, 0.82, 0.76, 0.38, 0.66, 0.6, 0.3, 0.55];
const CANS_AFTER = [0.95, 0.96, 0.94, 0.95, 0.93, 0.94, 0.95, 0.92, 0.94, 0.93];
/** Overall pumping efficiency, three pump sets; the line marks 35% (an efficient set). */
const EFF_BEFORE = [0.26, 0.28, 0.31];
const EFF_AFTER = [0.55, 0.58, 0.6];
const EFF_LIMIT = 0.35;

export function Farm({ tier }: { tier: Tier }) {
  const geos = useModels();

  const built = useMemo(() => {
    const hi = tier === "high";
    const rand = mulberry32(611);
    const material = createPaletteMaterial(tier);

    /* Ground: roads, the field, the apron, the reservoir. */
    const flat = (x0: number, x1: number, z0: number, z1: number, y = 0.018) => {
      const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0);
      g.rotateX(-Math.PI / 2);
      g.translate((x0 + x1) / 2, y, (z0 + z1) / 2);
      return g;
    };
    const R = FARM.road, T = FARM.track, A = FARM.apron, W = FARM.reservoir, Fd = FARM.field;
    const dirt = new THREE.MeshStandardMaterial({ color: "#c9b087", roughness: 1 });
    const concrete = new THREE.MeshStandardMaterial({ color: "#d9d2c4", roughness: 0.95 });
    const roads = [flat(R.x0, R.x1, R.z - R.w / 2, R.z + R.w / 2), flat(T.x - T.w / 2, T.x + T.w / 2, T.z0, T.z1)];
    const apron = flat(A.x0 - 0.3, A.x1 + 0.4, A.z0 - 0.3, A.z1 + 1.0, 0.02);
    const fieldSoil = new THREE.MeshStandardMaterial({ color: "#8a6a45", roughness: 1 });
    const field = flat(Fd.x0, Fd.x1, Fd.z0, Fd.z1, 0.014);
    const bank = flat(W.x0 - 0.25, W.x1 + 0.25, W.z0 - 0.25, W.z1 + 0.25, 0.016);
    const bankMat = new THREE.MeshStandardMaterial({ color: "#a89a7c", roughness: 1 });
    const waterMat = new THREE.MeshStandardMaterial({ color: "#3d8fae", roughness: 0.2, metalness: 0.05 });
    const water = flat(W.x0, W.x1, W.z0, W.z1, 0);

    /* Drip blocks: soil with a wetness gradient, and the crop on every row. */
    const even = { uEven: { value: 0 } };
    const soilMat = blockSoil(even);
    const soils = FARM.blocks.map((b) => {
      const g = flat(b.x0, b.x1, b.z0, b.z1, 0.016);
      const n = g.attributes.position.count;
      g.setAttribute("aSpan", new THREE.BufferAttribute(new Float32Array(n * 2).map((_, k) => (k % 2 === 0 ? b.x0 : b.x1)), 2));
      return g;
    });
    const plants: { x: number; z: number; far: number; r: number }[] = [];
    for (const b of FARM.blocks)
      for (let z = b.z0 + 0.25; z < b.z1 - 0.1; z += FARM.rowGap)
        for (let x = b.x1 - 0.25; x > b.x0 + 0.1; x -= hi ? ROW_SPACING : ROW_SPACING * 1.6) plants.push({ x, z, far: (b.x1 - x) / (b.x1 - b.x0), r: rand() });
    const plantMat = createPaletteMaterial(tier);
    // the drip blocks' crop takes its colour per plant (straw when dry, green when watered), so no vertex colours
    const dripMat = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.8 });
    const crops = new THREE.InstancedMesh(geos["nat-crops_leafsStageB"], dripMat, plants.length);
    crops.setColorAt(0, new THREE.Color());
    crops.castShadow = true;

    /* The harvest field: a mature crop. */
    const fieldPlants: { x: number; z: number; r: number }[] = [];
    for (let z = Fd.z0 + 0.3; z < Fd.z1 - 0.2; z += 0.5) for (let x = Fd.x0 + 0.3; x < Fd.x1 - 0.2; x += hi ? 0.32 : 0.5) fieldPlants.push({ x, z, r: rand() });
    const fieldCrop = new THREE.InstancedMesh(geos["nat-crops_cornStageB"], plantMat, fieldPlants.length);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), sc = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), c = new THREE.Color();
    fieldPlants.forEach((f, i) => {
      q.setFromAxisAngle(up, f.r * 6.28);
      fieldCrop.setMatrixAt(i, m4.compose(p.set(f.x, 0, f.z), q, sc.setScalar(0.42 + f.r * 0.08)));
      fieldCrop.setColorAt(i, c.setRGB(1.3, 1.1, 0.55));
    });
    fieldCrop.castShadow = true;

    /* Buildings, wells, trees. */
    const P: (Placement & { tag?: string })[] = [];
    P.push({ m: "ind-building-q", x: FARM.packhouse[0], z: FARM.packhouse[1], ry: Math.PI, s: 1.6, tint: 0xf4efe6 });
    P.push({ m: "ind-building-c", x: FARM.precooler[0], z: FARM.precooler[1], ry: Math.PI, s: 0.85, tint: 0xd6ecff, tag: "precooler" });
    P.push({ m: "ind-building-i", x: FARM.pumpHouse[0], z: FARM.pumpHouse[1], ry: -Math.PI / 2, s: 0.75, tint: 0xfff4e0 });
    FARM.wells.forEach(([x, z]) => P.push({ m: "proc-borewell", x, z, ry: Math.PI / 2, s: 1, tag: "well" }));
    P.push({ m: "ind-water-tower", x: -24.6, z: 9.0, ry: 0.3, s: 0.7, tint: 0xd9ecff });
    P.push({ m: "sub-building-type-c", x: -12.6, z: 26.4, ry: -Math.PI / 2, s: 0.85, tint: 0xffe0c4 });
    P.push({ m: "ind-building-h", x: -24.4, z: 6.0, ry: 0, s: 0.9, tint: 0xff8f7a });
    P.push({ m: "ind-chimney-medium", x: -22.6, z: 9.3, ry: 0, s: 0.8, tint: 0xfff6e8 });
    P.push({ m: "ind-chimney-medium", x: -21.9, z: 9.3, ry: 0, s: 0.72, tint: 0xfff6e8 });
    // shelter belts along the farm's edges
    for (let z = Fm.z0 + 0.6; z < Fm.z1 - 0.4; z += 1.1) P.push({ m: SETS.tree[Math.floor(rand() * SETS.tree.length)], x: Fm.x0 + 0.35, z, ry: rand() * 6.28, s: SCALE.tree * (0.8 + rand() * 0.35), tint: TREE_TINT[Math.floor(rand() * TREE_TINT.length)] });
    for (let x = Fm.x0 + 1.4; x < Fm.x1 - 0.6; x += 1.2) P.push({ m: SETS.tree[Math.floor(rand() * SETS.tree.length)], x, z: Fm.z1 - 0.3, ry: rand() * 6.28, s: SCALE.tree * (0.75 + rand() * 0.35), tint: TREE_TINT[Math.floor(rand() * TREE_TINT.length)] });
    // a tractor with a trailer of crates, between the field and the packhouse
    P.push({ m: "car-tractor", x: -18.0, z: 3.0, ry: Math.PI / 2, s: SCALE.car, tag: "tractor" });
    const batch = createBatch(geos, P, material);
    const tagged = (tag: string) => P.map((pl, i) => (pl.tag === tag ? { p: pl, id: batch.instances[i] } : null)).filter(Boolean) as { p: Placement; id: number }[];

    /* Pipes: the main up the track, and a manifold along each block's east edge. */
    const pipeMat = new THREE.MeshStandardMaterial({ color: "#3a76b8", roughness: 0.5 });
    const pipes: THREE.BufferGeometry[] = [];
    const run = (x0: number, z0: number, x1: number, z1: number, r = 0.045) => {
      const len = Math.hypot(x1 - x0, z1 - z0);
      const g = new THREE.CylinderGeometry(r, r, len, 6);
      g.rotateX(Math.PI / 2);
      g.rotateY(Math.atan2(x1 - x0, z1 - z0));
      g.translate((x0 + x1) / 2, r, (z0 + z1) / 2);
      pipes.push(g);
    };
    run(FARM.main.x, FARM.main.z0, FARM.main.x, FARM.main.z1, 0.06);
    for (const b of FARM.blocks) {
      run(b.x1 + 0.12, b.z0, b.x1 + 0.12, b.z1);
      run(b.x1 + 0.12, (b.z0 + b.z1) / 2, FARM.main.x, (b.z0 + b.z1) / 2);
    }

    /* Story props. */
    const unit = new THREE.BoxGeometry(1, 1, 1);
    // crates on the apron (up to 3 high), and four moving into the pre-cooler
    const crateSlots: THREE.Vector3[] = [];
    for (let t = 0; t < 3; t++) for (let z = A.z0 + 0.12; z < A.z1; z += 0.26) for (let x = A.x0 + 0.1; x < A.x1; x += 0.34) crateSlots.push(new THREE.Vector3(x, 0.035 + t * 0.075, z));
    const crateMat = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.8 });
    const crates = new THREE.InstancedMesh(unit, crateMat, crateSlots.length + 8);
    for (let i = 0; i < crates.count; i++) crates.setColorAt(i, c.setHex(i % 5 === 0 ? 0xc96f22 : 0xd9822b));
    crates.castShadow = true;
    crates.frustumCulled = false;
    // catch cans along the test row, regulators at each block inlet, moisture sensors in each block
    const cans = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.05, 0.04, 0.09, 10), new THREE.MeshStandardMaterial({ color: "#f4f1ea", roughness: 0.6 }), CANS_BEFORE.length);
    cans.frustumCulled = false;
    const regulators = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.1, 0.1, 0.22, 12), new THREE.MeshStandardMaterial({ color: "#2f74c8", roughness: 0.4 }), FARM.blocks.length);
    regulators.frustumCulled = false;
    const sensorGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.42, 6);
    sensorGeo.translate(0, 0.21, 0);
    const sensors = new THREE.InstancedMesh(sensorGeo, new THREE.MeshBasicMaterial({ color: "#9bdc28", toneMapped: false }), FARM.blocks.length * 2);
    sensors.frustumCulled = false;
    // water from the wells, and heat over their motors
    const jetN = hi ? 60 : 36;
    const jetPhase = new Float32Array(FARM.wells.length * jetN), jetOrigin = new Float32Array(FARM.wells.length * jetN * 3);
    FARM.wells.forEach(([x, z], k) => {
      for (let i = 0; i < jetN; i++) {
        jetPhase[k * jetN + i] = rand();
        jetOrigin.set([x, 0.08, z - 0.8], (k * jetN + i) * 3);
      }
    });
    const jetGeo = new THREE.BufferGeometry();
    jetGeo.setAttribute("position", new THREE.BufferAttribute(jetOrigin.slice(), 3));
    jetGeo.setAttribute("aOrigin", new THREE.BufferAttribute(jetOrigin, 3));
    jetGeo.setAttribute("aPhase", new THREE.BufferAttribute(jetPhase, 1));
    const jetMat = new THREE.ShaderMaterial({ vertexShader: jetVertex, fragmentShader: jetFragment, transparent: true, depthWrite: false, uniforms: { uTime: { value: 0 }, uPower: { value: 0 }, uScale: { value: 1 } } });
    const jets = new THREE.Points(jetGeo, jetMat);
    jets.frustumCulled = false;
    const heatMat = new THREE.ShaderMaterial({
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: glowFragment,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
      uniforms: { uColor: { value: new THREE.Color("#ff5a2a") }, uOpacity: { value: 0 } },
    });

    /* People: our team (teal) for each case, pickers, packhouse hands, the pump operator. */
    // slots: 0–1 team (harvest, pumps) · 2–7 pickers · 8 spare · 9–10 team (irrigation)
    const shirts = [TEAM_SHIRT, TEAM_SHIRT, 0xe4483c, 0x2f74c8, 0xf2b33d, 0x3b9c6a, 0x8e5ac8, 0xff8a5c, 0xf4f1ea, TEAM_SHIRT, TEAM_SHIRT];
    const crew = createCrew(geos, shirts.length, shirts, createPaletteMaterial(tier));

    const charts = {
      harvest: createChart(WAIT_BEFORE.length, 3.2, 1.6, { limit: WAIT_LIMIT }),
      irrigation: createChart(CANS_BEFORE.length, 3.2, 1.6),
      pumps: createChart(EFF_BEFORE.length, 2.2, 1.6, { limit: EFF_LIMIT }),
    };

    return {
      material, dripMat, dirt, concrete, roads, apron, fieldSoil, field, bank, bankMat, waterMat, water, even, soilMat, soils, plants, plantMat, crops, fieldCrop,
      batch, precooler: tagged("precooler"), wells: tagged("well"), tractor: tagged("tractor")[0], pipeMat, pipes, unit, crateSlots, crateMat, crates, cans, regulators, sensors, jetGeo, jetMat, jets, heatMat, crew, charts,
    };
  }, [geos, tier]);

  useEffect(
    () => () => {
      const b = built;
      releaseBatch(b.batch.mesh);
      [...b.roads, b.apron, b.field, b.bank, b.water, ...b.soils, ...b.pipes, b.unit, b.jetGeo, b.cans.geometry, b.regulators.geometry, b.sensors.geometry].forEach((g) => g.dispose());
      [b.material, b.dripMat, b.dirt, b.concrete, b.fieldSoil, b.bankMat, b.waterMat, b.soilMat, b.plantMat, b.pipeMat, b.crateMat, b.jetMat, b.heatMat, b.cans.material as THREE.Material, b.regulators.material as THREE.Material, b.sensors.material as THREE.Material, b.crew.people.material as THREE.Material].forEach((m) => m.dispose());
      [b.crops, b.fieldCrop, b.crates, b.cans, b.regulators, b.sensors].forEach((m) => m.dispose());
      b.crew.dispose();
      Object.values(b.charts).forEach((ch) => ch.dispose());
    },
    [built],
  );

  const heat = useRef<(THREE.Mesh | null)[]>([]);
  const waterRef = useRef<THREE.Mesh>(null);
  const T = useRef({ m: new THREE.Matrix4(), q: new THREE.Quaternion(), p: new THREE.Vector3(), s: new THREE.Vector3(), c: new THREE.Color(), up: new THREE.Vector3(0, 1, 0), v: new THREE.Vector3(), lastEven: -1, hide: new THREE.Matrix4().makeScale(0, 0, 0) }).current;
  const say = useMemo(() => ({ harvest: narrator("harvest"), irrigation: narrator("irrigation"), pumps: narrator("pumps") }), []);

  useFrame((state) => {
    const b = built;
    const t = state.clock.elapsedTime;
    const cam = state.camera;
    const H = caseState.harvest, I = caseState.irrigation, Pm = caseState.pumps;
    const crew = b.crew;
    const A = FARM.apron;

    /* ---------------- Harvest ---------------- */
    {
      const s = H.s;
      // The pile grows through the problem, the pre-cooler goes up in the fix, the pile clears.
      const pile = s < 0.5 ? 0.55 + smooth(0, 0.3, s) * 0.45 : 1 - smooth(0.55, 0.8, s) * 0.88;
      const n = Math.round(b.crateSlots.length * Math.max(0.12, pile));
      for (let i = 0; i < b.crateSlots.length; i++) {
        const sl = b.crateSlots[i];
        if (i < n) b.crates.setMatrixAt(i, T.m.compose(sl, T.q.identity(), T.s.set(0.3, 0.07, 0.22)));
        else b.crates.setMatrixAt(i, T.hide);
      }
      // after the fix: crates ride into the pre-cooler
      const flow = smooth(0.62, 0.72, s);
      for (let k = 0; k < 8; k++) {
        const u = (t * 0.25 + k / 8) % 1;
        T.p.set(lerp(A.x1 - 0.2, FARM.precooler[0] - 0.2, u), 0.04, A.z1 + 0.55);
        b.crates.setMatrixAt(b.crateSlots.length + k, flow > 0.01 ? T.m.compose(T.p, T.q.identity(), T.s.set(0.3 * flow, 0.07, 0.22)) : T.hide);
      }
      b.crates.instanceMatrix.needsUpdate = true;
      for (const { p, id } of b.precooler) {
        const k = Math.max(0.001, smooth(0.5, 0.62, s));
        T.q.setFromAxisAngle(T.up, p.ry);
        b.batch.mesh.setMatrixAt(id, T.m.compose(T.p.set(p.x, 0, p.z), T.q, T.s.set(p.s, p.s * k, p.s)));
      }
      // the tractor shuttles field → packhouse
      if (b.tractor) {
        const u = (t * 0.09) % 1;
        const back = u > 0.5;
        const k = back ? (1 - u) * 2 : u * 2;
        const x = lerp(FARM.field.x1 + 0.4, A.x0 - 0.2, smooth(0, 1, k));
        T.q.setFromAxisAngle(T.up, back ? -Math.PI / 2 : Math.PI / 2);
        b.batch.mesh.setMatrixAt(b.tractor.id, T.m.compose(T.p.set(x, 0, 4.6), T.q, T.s.setScalar(SCALE.car)));
      }
      const team = H.near * smooth(0.22, 0.3, s) * (1 - smooth(0.92, 0.98, s));
      // one logs crates at the apron, one probes pulp temperature
      crew.set(0, A.x0 + 0.9, A.z0 - 0.35, 0, team, "clipboard");
      const probeAt = walk([[A.x0 + 1.6, A.z0 - 0.3], [A.x1 - 0.4, A.z0 - 0.3]], (t * 0.25) % 2.4, false);
      crew.set(1, probeAt.x, probeAt.z, 0, team, "probe", Math.abs(Math.sin(t * 8)) * 0.01);
      // pickers in the field, carrying crates out to the edge
      for (let k = 0; k < 6; k++) {
        const row = FARM.field.z0 + 1.0 + k * 1.6;
        const w = walk([[FARM.field.x0 + 0.8, row], [FARM.field.x1 - 0.3, row]], (t * 0.3 + k * 1.3) % 13, false);
        crew.set(2 + k, w.x, w.z, w.heading, H.near > 0.01 || I.near > 0.01 || Pm.near > 0.01 ? 1 : 0, k % 2 ? "crate" : "none", Math.abs(Math.sin(t * 7 + k)) * 0.01);
      }
      b.charts.harvest.update({
        opacity: H.near * smooth(0.3, 0.36, s) * (1 - smooth(0.93, 0.99, s)),
        grow: smooth(0.32, 0.44, s),
        values: (i) => lerp(WAIT_BEFORE[i], WAIT_AFTER[i], smooth(0.62, 0.74, s)),
        tone: (i): BarTone => (s > 0.7 ? "lime" : WAIT_BEFORE[i] > WAIT_LIMIT ? "red" : "teal"),
        limit: WAIT_LIMIT,
        camera: cam,
        at: T.v.set(-20.2, 2.5, 2.6),
      });
      const ch = b.charts.harvest;
      say.harvest.line(0, "red", [(A.x0 + A.x1) / 2, 0.7, A.z0 + 0.4]);
      say.harvest.line(1, "red", [A.x0 + 1.4, 0.55, A.z0 - 0.3]);
      say.harvest.say("chart", say.harvest.chartTitle, "teal", ch.at(0.5, 1.12), ch.group.visible ? smooth(0.34, 0.4, s) * (1 - smooth(0.93, 0.99, s)) : 0);
      say.harvest.line(2, "lime", [FARM.precooler[0], 1.5, FARM.precooler[1]]);
      say.harvest.line(3, "lime", [FARM.precooler[0], 1.5, FARM.precooler[1]]);
    }

    /* ---------------- Irrigation ---------------- */
    {
      const s = I.s;
      const ev = smooth(0.62, 0.8, s);
      b.even.uEven.value = ev;
      if (Math.abs(ev - T.lastEven) > 0.003) {
        T.lastEven = ev;
        b.plants.forEach((pl, i) => {
          // water reaching this plant: falls away down the line, a dip where emitters clog
          const reach = 1.15 - pl.far * 1.05 - (Math.sin(pl.far * 23 + pl.z * 3.1) > 0.92 ? 0.3 : 0);
          const w = lerp(THREE.MathUtils.clamp(reach, 0.05, 1), 0.95, ev);
          const k = 0.2 + 0.4 * w + pl.r * 0.04;
          T.q.setFromAxisAngle(T.up, pl.r * 6.28);
          b.crops.setMatrixAt(i, T.m.compose(T.p.set(pl.x, 0.01, pl.z), T.q, T.s.set(k, k * (0.6 + w * 0.6), k)));
          // dry: wilted straw; watered: fresh green
          b.crops.setColorAt(i, T.c.setRGB(lerp(0.82, 0.3, w), lerp(0.62, 0.66, w), lerp(0.26, 0.2, w)));
        });
        b.crops.instanceMatrix.needsUpdate = true;
        if (b.crops.instanceColor) b.crops.instanceColor.needsUpdate = true;
      }
      // catch cans set out along the test row as the team walks it
      const blk = FARM.blocks[0];
      const lay = smooth(0.27, 0.44, s);
      const cansOn = I.near * (1 - smooth(0.6, 0.66, s));
      for (let i = 0; i < b.cans.count; i++) {
        const x = blk.x1 - 0.4 - (i / (b.cans.count - 1)) * (blk.x1 - blk.x0 - 0.8);
        const show = cansOn * THREE.MathUtils.clamp(lay * b.cans.count - i, 0, 1);
        b.cans.setMatrixAt(i, show > 0.01 ? T.m.compose(T.p.set(x, 0.045, FARM.testRow + 0.12), T.q.identity(), T.s.setScalar(show)) : T.hide);
      }
      b.cans.instanceMatrix.needsUpdate = true;
      // the fix: regulators at each inlet, then moisture sensors in each block
      FARM.blocks.forEach((bk, k) => {
        const g = Math.max(0.001, smooth(0.5 + k * 0.025, 0.58 + k * 0.025, s)) * (I.near > 0.01 || s > 0.5 ? 1 : 0);
        b.regulators.setMatrixAt(k, T.m.compose(T.p.set(bk.x1 + 0.12, 0.11 * g, (bk.z0 + bk.z1) / 2), T.q.identity(), T.s.setScalar(g)));
        for (let j = 0; j < 2; j++) {
          const sg = Math.max(0.001, smooth(0.58 + k * 0.02 + j * 0.01, 0.64 + k * 0.02 + j * 0.01, s));
          b.sensors.setMatrixAt(k * 2 + j, T.m.compose(T.p.set(bk.x0 + (bk.x1 - bk.x0) * (j ? 0.25 : 0.7), 0, bk.z0 + (bk.z1 - bk.z0) * (j ? 0.7 : 0.3)), T.q.identity(), T.s.set(1, sg, 1)));
        }
      });
      b.regulators.instanceMatrix.needsUpdate = true;
      b.sensors.instanceMatrix.needsUpdate = true;
      const team = I.near * smooth(0.22, 0.3, s) * (1 - smooth(0.92, 0.98, s));
      crew.set(9, blk.x1 + 0.45, FARM.testRow - 0.3, -Math.PI / 2, team, "meter");
      const along = blk.x1 - 0.4 - lay * (blk.x1 - blk.x0 - 0.8);
      crew.set(10, along, FARM.testRow - 0.3, -Math.PI / 2, team, s < 0.62 ? "clipboard" : "tablet", Math.abs(Math.sin(t * 8)) * 0.01 * (lay < 1 ? 1 : 0));
      b.charts.irrigation.update({
        opacity: I.near * smooth(0.32, 0.38, s) * (1 - smooth(0.93, 0.99, s)),
        grow: smooth(0.33, 0.45, s),
        values: (i) => lerp(CANS_BEFORE[i], CANS_AFTER[i], smooth(0.64, 0.78, s)),
        tone: (i): BarTone => (s > 0.72 ? "lime" : CANS_BEFORE[i] < 0.7 ? "red" : "teal"),
        camera: cam,
        at: T.v.set(-16.0, 2.7, 23.0),
      });
      const ch = b.charts.irrigation;
      say.irrigation.line(0, "red", [blk.x0 + 0.8, 0.6, FARM.testRow]);
      say.irrigation.line(1, "teal", [blk.x1 + 0.4, 0.75, FARM.testRow - 0.3]);
      say.irrigation.say("chart", say.irrigation.chartTitle, "teal", ch.at(0.5, 1.12), ch.group.visible ? smooth(0.36, 0.42, s) * (1 - smooth(0.93, 0.99, s)) : 0);
      say.irrigation.line(2, "lime", [blk.x1 + 0.12, 0.6, (blk.z0 + blk.z1) / 2]);
      say.irrigation.line(3, "lime", [(blk.x0 + blk.x1) / 2, 0.7, blk.z1 - 1.5]);
    }

    /* ---------------- Pumps ---------------- */
    {
      const s = Pm.s;
      const swapped = smooth(0.6, 0.68, s);
      b.jetMat.uniforms.uTime.value = t;
      b.jetMat.uniforms.uPower.value = swapped;
      b.jetMat.uniforms.uScale.value = pointScale(state);
      // the reservoir fills once the right pumps are in
      // low and shrunken before; full once the right pumps are in
      const full = smooth(0.66, 0.9, s);
      if (waterRef.current) {
        const [cx, cz] = [(FARM.reservoir.x0 + FARM.reservoir.x1) / 2, (FARM.reservoir.z0 + FARM.reservoir.z1) / 2];
        const k = lerp(0.55, 1, full);
        waterRef.current.position.set(cx * (1 - k), 0.024 + full * 0.01, cz * (1 - k));
        waterRef.current.scale.set(k, 1, k);
      }
      // overworked motors: heat haze, until they're swapped
      const hot = (1 - swapped) * (0.6 + 0.4 * Math.sin(t * 5));
      b.heatMat.uniforms.uOpacity.value = hot * Math.max(Pm.near, 0.25) * (Pm.near > 0.01 ? 1 : 0.4);
      heat.current.forEach((h, i) => {
        if (!h) return;
        const [x, z] = FARM.wells[i];
        h.position.set(x, 0.42 + Math.sin(t * 3 + i) * 0.03, z);
        h.quaternion.copy(cam.quaternion);
      });
      // the swap: each pump head pops and turns lime
      b.wells.forEach(({ p, id }, i) => {
        const k = smooth(0.58 + i * 0.03, 0.64 + i * 0.03, s);
        const pop = 1 + Math.sin(k * Math.PI) * 0.35;
        T.q.setFromAxisAngle(T.up, p.ry);
        b.batch.mesh.setMatrixAt(id, T.m.compose(T.p.set(p.x, 0, p.z), T.q, T.s.setScalar(pop)));
        b.batch.mesh.setColorAt(id, T.c.setRGB(1, 1, 1).lerp(new THREE.Color(0.8, 1.35, 0.55), k));
      });
      const team = Pm.near * smooth(0.22, 0.3, s) * (1 - smooth(0.92, 0.98, s));
      // clamp meter at the pump-house panel; flow readings at the wells
      const [hx, hz] = FARM.pumpHouse;
      if (Pm.near > 0.01) {
        crew.set(0, hx - 0.55, hz + 0.2, -Math.PI / 2, team, "meter");
        crew.set(1, FARM.wells[1][0] + 0.35, FARM.wells[1][1] + 0.4, Math.PI, team, "tablet");
      }
      b.charts.pumps.update({
        opacity: Pm.near * smooth(0.3, 0.36, s) * (1 - smooth(0.93, 0.99, s)),
        grow: smooth(0.32, 0.44, s),
        values: (i) => lerp(EFF_BEFORE[i], EFF_AFTER[i], swapped),
        tone: (): BarTone => (s > 0.66 ? "lime" : "red"),
        limit: EFF_LIMIT,
        camera: cam,
        at: T.v.set(-19.2, 2.3, -1.2),
      });
      const ch = b.charts.pumps;
      say.pumps.line(0, "red", [FARM.wells[1][0], 0.85, FARM.wells[1][1]]);
      say.pumps.line(1, "red", [hx, 1.2, hz]);
      say.pumps.say("chart", say.pumps.chartTitle, "teal", ch.at(0.5, 1.12), ch.group.visible ? smooth(0.34, 0.4, s) * (1 - smooth(0.93, 0.99, s)) : 0);
      say.pumps.line(2, "lime", [FARM.wells[1][0], 0.85, FARM.wells[1][1]]);
      say.pumps.line(3, "lime", [(FARM.reservoir.x0 + FARM.reservoir.x1) / 2, 0.5, FARM.reservoir.z0 + 0.6]);
    }

    crew.commit();
  });

  const B = built;
  return (
    <group>
      {B.roads.map((g, i) => (
        <mesh key={i} geometry={g} material={B.dirt} receiveShadow />
      ))}
      <mesh geometry={B.apron} material={B.concrete} receiveShadow />
      <mesh geometry={B.field} material={B.fieldSoil} receiveShadow />
      <mesh geometry={B.bank} material={B.bankMat} receiveShadow />
      <mesh ref={waterRef} geometry={B.water} material={B.waterMat} receiveShadow />
      {B.soils.map((g, i) => (
        <mesh key={i} geometry={g} material={B.soilMat} receiveShadow />
      ))}
      <primitive object={B.crops} />
      <primitive object={B.fieldCrop} />
      <primitive object={B.batch.mesh} />
      {B.pipes.map((g, i) => (
        <mesh key={i} geometry={g} material={B.pipeMat} castShadow />
      ))}
      <primitive object={B.crates} />
      <primitive object={B.cans} />
      <primitive object={B.regulators} />
      <primitive object={B.sensors} />
      <primitive object={B.jets} />
      {FARM.wells.map((_, i) => (
        <mesh key={i} ref={(m) => void (heat.current[i] = m)} material={B.heatMat} renderOrder={8}>
          <planeGeometry args={[0.9, 0.9]} />
        </mesh>
      ))}
      <primitive object={B.crew.people} />
      <primitive object={B.crew.tools} />
      <primitive object={B.charts.harvest.group} />
      <primitive object={B.charts.irrigation.group} />
      <primitive object={B.charts.pumps.group} />
    </group>
  );
}
