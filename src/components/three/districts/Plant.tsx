"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { DISTRICTS, SETS, TREE_TINT, type Placement } from "../city-layout";
import { MODELS, type ModelName } from "../models.generated";
import { createBatch, createPaletteMaterial, releaseBatch, useModels } from "../models";
import { PYLON_ATTACH } from "../procedural";
import { mulberry32 } from "../terrain-math";
import { caseState } from "../city-state";
import { pointScale } from "../fx";
import { CHIMNEYS, LEAKS, PLANT, TURBINES } from "./layout";
import { LIME, RED, TEAM_SHIRT, createChart, createCrew, createPuffs, lerp, smooth, walk, type BarTone } from "./kit";
import { narrator } from "./copy";
import type { Tier } from "../Scene";

/**
 * An industrial plant, and two problems it really has:
 *   leaks — compressed air hisses out of the lines; an ultrasonic survey tags
 *           every leak, repairs and a flow meter follow, one compressor rests
 *   peak  — every furnace starts at 6 am and that spike sets the demand
 *           charge; a logger finds it, a staggered start keeps under the limit
 */

/** Air flow per hour (24 h): the night shows the leaks. Limit line: 10% of daytime flow. */
const AIR_BEFORE = Array.from({ length: 24 }, (_, h) => (h >= 7 && h <= 18 ? 0.82 + 0.06 * Math.sin(h) : 0.34 + 0.02 * Math.sin(h * 2)));
const AIR_AFTER = Array.from({ length: 24 }, (_, h) => (h >= 7 && h <= 18 ? 0.66 + 0.06 * Math.sin(h) : 0.07));
const AIR_LIMIT = 0.1;
/** Demand in 15-minute intervals, 5 – 9 am. Limit: the contract demand. */
const DEM_BEFORE = [0.24, 0.24, 0.25, 0.26, 0.96, 0.92, 0.74, 0.66, 0.64, 0.63, 0.62, 0.62, 0.63, 0.62, 0.61, 0.62];
const DEM_AFTER = [0.24, 0.24, 0.25, 0.26, 0.4, 0.52, 0.62, 0.68, 0.66, 0.64, 0.63, 0.62, 0.63, 0.62, 0.61, 0.62];
const DEM_LIMIT = 0.78;

const lampFragment = /* glsl */ `
  uniform vec3 uColor; uniform float uOpacity; varying vec2 vUv;
  void main() {
    float d = length(vUv - 0.5) * 2.0;
    float a = pow(max(0.0, 1.0 - d), 1.8) * uOpacity;
    if (a < 0.01) discard;
    gl_FragColor = vec4(uColor * a, a);
    #include <colorspace_fragment>
  }
`;

export function Plant({ tier }: { tier: Tier }) {
  const geos = useModels();

  const built = useMemo(() => {
    const rand = mulberry32(503);
    const material = createPaletteMaterial(tier);
    const E = DISTRICTS.energy;

    const flat = (x0: number, x1: number, z0: number, z1: number, y = 0.016) => {
      const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0);
      g.rotateX(-Math.PI / 2);
      g.translate((x0 + x1) / 2, y, (z0 + z1) / 2);
      return g;
    };
    const gravel = new THREE.MeshStandardMaterial({ color: "#d4cab6", roughness: 1 });
    const asphalt = new THREE.MeshStandardMaterial({ color: "#3a3d44", roughness: 0.9 });
    const ground = flat(E.x0 + 0.2, E.x1 - 0.2, E.z0 + 0.2, E.z1 - 0.2, 0.012);
    const roads = [flat(E.x0 + 1.5, 23.0, -22.45, -21.55, 0.02), flat(15.2, 16.0, -39.4, -10.6, 0.02)];

    /* Buildings and kit. */
    const P: Placement[] = [];
    for (const h of PLANT.halls) P.push({ m: h.m as ModelName, x: h.at[0], z: h.at[1], ry: 0, s: h.s, tint: 0xf1ede6 });
    const furnaceH = MODELS["ind-building-h"].size[1] * 0.9;
    PLANT.furnaces.forEach(([x, z]) => {
      P.push({ m: "ind-building-h", x, z, ry: -Math.PI / 2, s: 0.9, tint: 0xf3d6c4 });
      P.push({ m: "ind-chimney-small", x: x + 0.2, z, y: furnaceH, ry: 0, s: 0.9, tint: 0xf3efe8 });
    });
    P.push({ m: "ind-building-f", x: PLANT.compressorHouse[0], z: PLANT.compressorHouse[1], ry: 0, s: 1.0, tint: 0xe8f1fa });
    PLANT.compressors.forEach(([x, z]) => P.push({ m: "ind-detail-tank", x, z, ry: Math.PI / 2, s: 0.75, tint: 0xdfe6ec }));
    P.push({ m: "ind-building-i", x: PLANT.panel[0], z: PLANT.panel[1], ry: Math.PI / 2, s: 0.7, tint: 0xfff4e0 });
    for (let i = 0; i < 4; i++) P.push({ m: "proc-transformer", x: PLANT.incomer[0] + (i % 2) * 0.9, z: PLANT.incomer[1] + Math.floor(i / 2) * 0.8, ry: 0, s: 1.6 });
    for (const [x, z] of PLANT.pylons) P.push({ m: "proc-pylon", x, z, ry: 0, s: 1 });
    P.push({ m: "ind-chimney-large", x: CHIMNEYS[0][0], z: CHIMNEYS[0][2], ry: 0, s: 1.9, tint: 0xf3efe8 });
    P.push({ m: "ind-chimney-large", x: CHIMNEYS[1][0], z: CHIMNEYS[1][2], ry: 0, s: 1.6, tint: 0xf3efe8 });
    P.push({ m: "ind-detail-tank-large", x: 18.0, z: -37.6, ry: 0, s: 0.9 }, { m: "ind-detail-tank-large", x: 19.8, z: -37.6, ry: 0, s: 0.9 });
    for (const t of TURBINES) P.push({ m: "ind-windmill", x: t.x, z: t.z, ry: 0, s: t.s, tint: 0xfaf8f4 });
    for (let i = 0; i < 12; i++) P.push({ m: SETS.tree[Math.floor(rand() * SETS.tree.length)], x: E.x0 + 0.5 + rand() * 0.6, z: E.z0 + 1 + i * 2.5, ry: rand() * 6.28, s: 0.55, tint: TREE_TINT[i % TREE_TINT.length] });
    const batch = createBatch(geos, P, material);

    /* Turbine blades (each spins about its hub). */
    const pivot = MODELS["ind-windmill-blades"].pivot;
    const blades = new THREE.InstancedMesh(geos["ind-windmill-blades"], material, TURBINES.length);
    blades.castShadow = true;

    /* Lines: pylons → incomer; the compressed-air header and branches on a pipe rack. */
    const tubes: THREE.BufferGeometry[] = [];
    const catenary = (a: THREE.Vector3, b2: THREE.Vector3, sag: number) => {
      const pts: THREE.Vector3[] = [];
      for (let k = 0; k <= 12; k++) {
        const u = k / 12;
        pts.push(new THREE.Vector3().lerpVectors(a, b2, u).add(new THREE.Vector3(0, -Math.sin(u * Math.PI) * sag, 0)));
      }
      tubes.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 14, 0.012, 4, false));
    };
    for (let i = 0; i < PLANT.pylons.length; i++) {
      const [ax, az] = PLANT.pylons[i];
      const [bx, bz] = PLANT.pylons[i + 1] ?? [PLANT.incomer[0] + 0.4, PLANT.incomer[1] + 0.4];
      for (const [ox, oy] of PYLON_ATTACH) catenary(new THREE.Vector3(ax + ox, oy, az), new THREE.Vector3(bx + (i + 1 < PLANT.pylons.length ? ox : ox * 0.4), i + 1 < PLANT.pylons.length ? oy : 0.7, bz), 0.26);
    }
    const cables = mergeGeometries(tubes.map((g) => g.toNonIndexed()), false)!;
    tubes.forEach((g) => g.dispose());
    const cableMat = new THREE.MeshStandardMaterial({ color: "#3c4148", roughness: 0.6 });
    const pipeParts: THREE.BufferGeometry[] = [];
    const pipe = (x0: number, z0: number, x1: number, z1: number) => {
      const len = Math.hypot(x1 - x0, z1 - z0);
      const g = new THREE.CylinderGeometry(0.06, 0.06, len, 8);
      g.rotateX(Math.PI / 2);
      g.rotateY(Math.atan2(x1 - x0, z1 - z0));
      g.translate((x0 + x1) / 2, PLANT.pipeY, (z0 + z1) / 2);
      pipeParts.push(g);
      // rack posts
      for (let u = 0; u <= len; u += 1.4) {
        const post = new THREE.BoxGeometry(0.05, PLANT.pipeY, 0.05);
        post.translate(x0 + ((x1 - x0) * u) / len, PLANT.pipeY / 2, z0 + ((z1 - z0) * u) / len);
        pipeParts.push(post);
      }
    };
    const Hd = PLANT.header;
    pipe(PLANT.compressorHouse[0] + 0.9, Hd.z, Hd.x1, Hd.z);
    for (const x of PLANT.branches) pipe(x, Hd.z, x, PLANT.branchTo);
    const pipes = mergeGeometries(pipeParts.map((g) => (g.index ? g.toNonIndexed() : g)), false)!;
    pipeParts.forEach((g) => g.dispose());
    const pipeMat = new THREE.MeshStandardMaterial({ color: "#5d87b0", roughness: 0.45, metalness: 0.2 });

    /* Story props: leak puffs and tags, the flow meter, lamps on compressors and furnaces. */
    const puffs = createPuffs(LEAKS.map((at, i) => ({ at, dir: [Math.sin(i * 2.1) * 0.4, 0.6, Math.cos(i * 1.7) * 0.4] as [number, number, number] })), 18, "#a9c6d8");
    const tagGeo = new THREE.BoxGeometry(0.08, 0.12, 0.012);
    tagGeo.translate(0, -0.1, 0);
    const tags = new THREE.InstancedMesh(tagGeo, new THREE.MeshBasicMaterial({ color: "#ffffff", toneMapped: false }), LEAKS.length);
    tags.setColorAt(0, new THREE.Color());
    tags.frustumCulled = false;
    const meter = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.035, 8, 16), new THREE.MeshBasicMaterial({ color: LIME, toneMapped: false }));
    meter.rotation.y = Math.PI / 2;
    const lampMat = (c: THREE.Color) =>
      new THREE.ShaderMaterial({
        vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: lampFragment,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
        uniforms: { uColor: { value: c.clone() }, uOpacity: { value: 0 } },
      });
    const compLamps = PLANT.compressors.map(() => lampMat(new THREE.Color("#5fe03a")));
    const furnaceGlow = PLANT.furnaces.map(() => lampMat(new THREE.Color("#ff7a2a")));
    const spikeMat = lampMat(RED);
    const alarmMat = lampMat(new THREE.Color("#ffb020"));

    const shirts = [TEAM_SHIRT, TEAM_SHIRT, TEAM_SHIRT, TEAM_SHIRT, 0xf08a2a, 0x37474f, 0xf28c1e];
    const crew = createCrew(geos, shirts.length, shirts, createPaletteMaterial(tier));
    const charts = { leaks: createChart(AIR_BEFORE.length, 3.8, 1.5, { limit: AIR_LIMIT }), peak: createChart(DEM_BEFORE.length, 3.4, 1.6, { limit: DEM_LIMIT }) };

    // the detector's walk: along the header, then up and down each branch
    const route: [number, number][] = [[Hd.x0, Hd.z - 0.35]];
    for (const x of PLANT.branches) route.push([x - 0.35, Hd.z - 0.35], [x - 0.35, PLANT.branchTo + 0.4], [x + 0.35, PLANT.branchTo + 0.4], [x + 0.35, Hd.z - 0.35]);
    route.push([Hd.x1, Hd.z - 0.35]);

    return { material, gravel, asphalt, ground, roads, batch, blades, pivot, cables, cableMat, pipes, pipeMat, puffs, tagGeo, tags, meter, compLamps, furnaceGlow, spikeMat, alarmMat, crew, charts, route };
  }, [geos, tier]);

  useEffect(
    () => () => {
      const b = built;
      releaseBatch(b.batch.mesh);
      [b.ground, ...b.roads, b.cables, b.pipes, b.puffs.geometry, b.tagGeo, b.meter.geometry].forEach((g) => g.dispose());
      [b.material, b.gravel, b.asphalt, b.cableMat, b.pipeMat, b.puffs.material, b.tags.material as THREE.Material, b.meter.material as THREE.Material, ...b.compLamps, ...b.furnaceGlow, b.spikeMat, b.alarmMat, b.crew.people.material as THREE.Material].forEach((m) => m.dispose());
      [b.blades, b.tags].forEach((m) => m.dispose());
      b.crew.dispose();
      Object.values(b.charts).forEach((c) => c.dispose());
    },
    [built],
  );

  const R = useRef<{ comp: (THREE.Mesh | null)[]; furn: (THREE.Mesh | null)[]; spike: THREE.Mesh | null; alarm: THREE.Mesh | null }>({ comp: [], furn: [], spike: null, alarm: null });
  const T = useRef({ m: new THREE.Matrix4(), q: new THREE.Quaternion(), p: new THREE.Vector3(), s: new THREE.Vector3(), e: new THREE.Euler(), c: new THREE.Color(), v: new THREE.Vector3(), hide: new THREE.Matrix4().makeScale(0, 0, 0) }).current;
  const say = useMemo(() => ({ leaks: narrator("leaks"), peak: narrator("peak") }), []);

  useFrame((state) => {
    const b = built;
    const t = state.clock.elapsedTime;
    const cam = state.camera;
    const L = caseState.leaks, Pk = caseState.peak;
    const crew = b.crew;
    const N = R.current;

    /* Turbines spin. */
    TURBINES.forEach((tb, i) => {
      T.e.set((t * (1.1 + (i % 3) * 0.15) + i) % (Math.PI * 2), 0, 0);
      T.q.setFromEuler(T.e);
      T.p.set(tb.x + b.pivot[0] * tb.s, b.pivot[1] * tb.s, tb.z + b.pivot[2] * tb.s);
      b.blades.setMatrixAt(i, T.m.compose(T.p, T.q, T.s.setScalar(tb.s)));
    });
    b.blades.instanceMatrix.needsUpdate = true;

    /* ---------------- Leaks ---------------- */
    {
      const s = L.s;
      b.puffs.material.uniforms.uTime.value = t;
      b.puffs.material.uniforms.uScale.value = pointScale(state);
      // survey: the detector walks the route; each leak is tagged as it passes
      const survey = smooth(0.27, 0.48, s);
      let routeLen = 0;
      for (let i = 1; i < b.route.length; i++) routeLen += Math.hypot(b.route[i][0] - b.route[i - 1][0], b.route[i][1] - b.route[i - 1][1]);
      const w = walk(b.route, survey * routeLen, false);
      const team = L.near * smooth(0.22, 0.3, s) * (1 - smooth(0.92, 0.98, s));
      crew.set(0, w.x, w.z, w.heading, team, "detector", Math.abs(Math.sin(t * 8)) * 0.01 * (survey > 0 && survey < 1 ? 1 : 0));
      crew.set(1, w.x - Math.sin(w.heading) * 0.5, w.z - Math.cos(w.heading) * 0.5, w.heading, team, "clipboard");
      LEAKS.forEach(([x, y, z], i) => {
        const tagged = Math.hypot(w.x - x, w.z - z) < 0.9 || i / LEAKS.length < survey - 0.08 || s > 0.5;
        const repaired = smooth(0.52 + i * 0.012, 0.56 + i * 0.012, s);
        b.puffs.on[i] = (1 - repaired) * Math.max(L.near, 0.35);
        const show = L.near * (tagged || survey >= 1 ? 1 : 0) * (1 - smooth(0.9, 0.97, s));
        b.tags.setMatrixAt(i, show > 0.01 ? T.m.compose(T.p.set(x, y - 0.06, z + 0.07), T.q.identity(), T.s.setScalar(show * 1.6)) : T.hide);
        b.tags.setColorAt(i, T.c.copy(RED).lerp(LIME, repaired));
      });
      b.tags.instanceMatrix.needsUpdate = true;
      if (b.tags.instanceColor) b.tags.instanceColor.needsUpdate = true;
      // the flow meter on the header
      const fm = Math.max(0.001, smooth(0.6, 0.68, s));
      b.meter.position.set(PLANT.header.x0 + 0.5, PLANT.pipeY, PLANT.header.z);
      b.meter.scale.setScalar(fm);
      // compressors: all three loading before; one rests once the leaks are fixed
      const rest = smooth(0.76, 0.84, s);
      b.compLamps.forEach((m, i) => {
        const off = i === 2 ? rest : 0;
        m.uniforms.uColor.value.set(off > 0.5 ? "#7d8790" : "#5fe03a");
        m.uniforms.uOpacity.value = (0.55 + 0.45 * Math.sin(t * 6 + i)) * (1 - off * 0.85);
        const lamp = N.comp[i];
        if (lamp) {
          lamp.position.set(PLANT.compressors[i][0], 0.72, PLANT.compressors[i][1]);
          lamp.quaternion.copy(cam.quaternion);
        }
      });
      b.charts.leaks.update({
        opacity: L.near * smooth(0.3, 0.36, s) * (1 - smooth(0.93, 0.99, s)),
        grow: smooth(0.32, 0.44, s),
        values: (i) => lerp(AIR_BEFORE[i], AIR_AFTER[i], smooth(0.6, 0.76, s)),
        tone: (i): BarTone => (s > 0.7 ? "lime" : i < 7 || i > 18 ? "red" : "teal"),
        limit: AIR_LIMIT,
        camera: cam,
        at: T.v.set(18.8, 3.1, -35.4),
      });
      const ch = b.charts.leaks;
      say.leaks.line(0, "red", [PLANT.compressors[1][0], 1.25, PLANT.compressors[1][1]]);
      say.leaks.line(1, "red", [w.x, 0.9, w.z]);
      say.leaks.say("chart", say.leaks.chartTitle, "teal", ch.at(0.5, 1.15), ch.group.visible ? smooth(0.34, 0.4, s) * (1 - smooth(0.93, 0.99, s)) : 0);
      say.leaks.line(2, "lime", [PLANT.header.x0 + 0.5, 1.4, PLANT.header.z]);
      say.leaks.line(3, "lime", ch.at(0.12, 0.35));
    }

    /* ---------------- Peak demand ---------------- */
    {
      const s = Pk.s;
      const staggered = s > 0.6;
      // a looping shift start: before, all four furnaces come on together; after, one by one
      const cyc = (t % 9) / 9;
      let total = 0;
      PLANT.furnaces.forEach(([x, z], i) => {
        const start = staggered ? 0.2 + i * 0.12 : 0.2;
        const on = smooth(start, start + 0.03, cyc) * (1 - smooth(0.92, 0.97, cyc));
        // inrush: a burst of load at switch-on
        const inrush = Math.exp(-Math.pow((cyc - start - 0.02) / 0.025, 2));
        total += on * 0.2 + inrush * 0.25;
        const g = b.furnaceGlow[i];
        g.uniforms.uOpacity.value = on * (0.7 + 0.3 * Math.sin(t * 9 + i)) * Math.max(Pk.near, 0.3);
        const m = N.furn[i];
        if (m) {
          m.position.set(x, 1.15, z);
          m.quaternion.copy(cam.quaternion);
        }
      });
      // the spike flashes red at the incomer when it crosses the limit; the alarm warns after the fix
      b.spikeMat.uniforms.uOpacity.value = Pk.near * Math.max(0, total - 0.75) * 2.2 * (staggered ? 0 : 1);
      if (N.spike) {
        N.spike.position.set(PLANT.incomer[0] + 0.45, 0.9, PLANT.incomer[1] + 0.4);
        N.spike.quaternion.copy(cam.quaternion);
      }
      b.alarmMat.uniforms.uOpacity.value = Pk.near * smooth(0.58, 0.64, s) * (total > 0.6 ? 0.5 + 0.5 * Math.sin(t * 12) : 0.15);
      if (N.alarm) {
        N.alarm.position.set(PLANT.panel[0], 1.1, PLANT.panel[1]);
        N.alarm.quaternion.copy(cam.quaternion);
      }
      const team = Pk.near * smooth(0.22, 0.3, s) * (1 - smooth(0.92, 0.98, s));
      crew.set(2, PLANT.panel[0] + 0.7, PLANT.panel[1] + 0.6, Math.PI, team, "laptop");
      crew.set(3, PLANT.incomer[0] - 0.4, PLANT.incomer[1] - 0.4, 0.6, team, "meter");
      // operators by the furnaces
      const any = Pk.near > 0.01 || L.near > 0.01 ? 1 : 0;
      crew.set(4, PLANT.furnaces[1][0] - 1.0, PLANT.furnaces[1][1], Math.PI / 2, any);
      crew.set(5, PLANT.furnaces[3][0] - 1.0, PLANT.furnaces[3][1], Math.PI / 2, any);
      crew.set(6, PLANT.compressorHouse[0] + 1.3, PLANT.compressorHouse[1] + 0.9, -Math.PI / 2, any);
      b.charts.peak.update({
        opacity: Pk.near * smooth(0.3, 0.36, s) * (1 - smooth(0.93, 0.99, s)),
        grow: smooth(0.32, 0.44, s),
        values: (i) => lerp(DEM_BEFORE[i], DEM_AFTER[i], smooth(0.6, 0.74, s)),
        tone: (i): BarTone => (s > 0.68 ? "lime" : DEM_BEFORE[i] > DEM_LIMIT ? "red" : "teal"),
        limit: DEM_LIMIT,
        camera: cam,
        at: T.v.set(13.6, 3.6, -22.4),
      });
      const ch = b.charts.peak;
      say.peak.line(0, "red", [PLANT.panel[0], 1.4, PLANT.panel[1]]);
      say.peak.line(1, "red", [PLANT.incomer[0] + 0.4, 1.4, PLANT.incomer[1] + 0.4]);
      say.peak.say("chart", say.peak.chartTitle, "teal", ch.at(0.5, 1.15), ch.group.visible ? smooth(0.34, 0.4, s) * (1 - smooth(0.93, 0.99, s)) : 0);
      say.peak.line(2, "lime", [PLANT.furnaces[1][0], 1.7, PLANT.furnaces[1][1]]);
      say.peak.line(3, "lime", ch.at(0.5, DEM_LIMIT + 0.08));
    }

    crew.commit();
  });

  const B = built;
  return (
    <group>
      <mesh geometry={B.ground} material={B.gravel} receiveShadow />
      {B.roads.map((g, i) => (
        <mesh key={i} geometry={g} material={B.asphalt} receiveShadow />
      ))}
      <primitive object={B.batch.mesh} />
      <primitive object={B.blades} />
      <mesh geometry={B.cables} material={B.cableMat} castShadow />
      <mesh geometry={B.pipes} material={B.pipeMat} castShadow receiveShadow />
      <primitive object={B.puffs.points} />
      <primitive object={B.tags} />
      <primitive object={B.meter} />
      {B.compLamps.map((m, i) => (
        <mesh key={`c${i}`} ref={(x) => void (R.current.comp[i] = x)} material={m} renderOrder={8}>
          <planeGeometry args={[0.45, 0.45]} />
        </mesh>
      ))}
      {B.furnaceGlow.map((m, i) => (
        <mesh key={`f${i}`} ref={(x) => void (R.current.furn[i] = x)} material={m} renderOrder={8}>
          <planeGeometry args={[1.3, 1.3]} />
        </mesh>
      ))}
      <mesh ref={(x) => void (R.current.spike = x)} material={B.spikeMat} renderOrder={8}>
        <planeGeometry args={[2.6, 2.6]} />
      </mesh>
      <mesh ref={(x) => void (R.current.alarm = x)} material={B.alarmMat} renderOrder={8}>
        <planeGeometry args={[0.7, 0.7]} />
      </mesh>
      <primitive object={B.crew.people} />
      <primitive object={B.crew.tools} />
      <primitive object={B.charts.leaks.group} />
      <primitive object={B.charts.peak.group} />
    </group>
  );
}
