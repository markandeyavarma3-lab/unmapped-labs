"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { BOULEVARD_Z, COAST_X, LANE, PROCESS_BLOCK, RAIL_X, ROADS, SIDE_X, SIDEWALK, inDistrict, type AnyModel } from "./city-layout";
import { CHIMNEYS, HELIPAD } from "./districts/layout";
import { frame } from "./frame-state";
import { MAIN_GREEN, islandState } from "./views";
import { createDynamicBatch, createPaletteMaterial, useModels, releaseBatch } from "./models";
import { mulberry32 } from "./terrain-math";
import type { Tier } from "./Scene";

/**
 * Everything that moves in the city at large: traffic that keeps left and
 * waits at the lights, a helicopter on the hospital's roof, the train, boats,
 * birds, people on the sidewalks and smoke from the plant. (Each large site
 * moves its own trucks, patients and crews: districts/*.)
 */

const CAR_MODELS: AnyModel[] = ["car-sedan", "car-sedan-sports", "car-hatchback-sports", "car-suv", "car-suv-luxury", "car-taxi", "car-taxi", "car-van", "car-delivery", "car-police", "car-truck", "car-garbage-truck"];
const SHIRTS = [0xe4483c, 0x2f74c8, 0xf2b33d, 0x3b9c6a, 0xf4f1ea, 0x8e5ac8, 0xff8a5c, 0x37474f, 0x1fb5b0];

/* ------------------------------------------------------------------ */
/* Signals                                                            */
/* ------------------------------------------------------------------ */

/** True while traffic along this axis has green at the junction (x, z). Exported for the process block. */
export function signalGreen(vertical: boolean, x: number, z: number, t: number) {
  if (frame.process > 0.2 && Math.abs(x - PROCESS_BLOCK.junction[0]) < 0.1 && Math.abs(z - PROCESS_BLOCK.junction[1]) < 0.1) {
    // The process block's junction: the main road (vertical) gets a quarter of the cycle until it's re-timed.
    const main = islandState.progress > MAIN_GREEN.retimedAt ? MAIN_GREEN.after : MAIN_GREEN.before;
    const cycle = (t % 12) / 12;
    return vertical ? cycle < main : cycle > main + 0.04;
  }
  // A slow green wave down the avenue.
  const cycle = (t + x * 0.13 + z * 0.09) % 12;
  return vertical ? cycle < 6 : cycle >= 6;
}

type Junction = { at: number; half: number; x: number; z: number };
type Lane = { h: boolean; c: number; a0: number; a1: number; dir: 1 | -1; vmax: number; len: number; junctions: Junction[]; cars: { u: number; v: number; id: number; s: number }[] };

function buildLanes(rand: () => number, density: number) {
  const lanes: Lane[] = [];
  for (const r of ROADS) {
    const [x1, z1, x2, z2, w, kind] = r;
    const h = z1 === z2;
    // District access streets carry the story traffic instead.
    if (kind === "lane" && (inDistrict(x1, z1, -0.5) || inDistrict(x2, z2, -0.5))) continue;
    const a0 = h ? Math.min(x1, x2) : Math.min(z1, z2);
    const a1 = h ? Math.max(x1, x2) : Math.max(z1, z2);
    const c = h ? z1 : x1;
    const junctions: Junction[] = [];
    for (const o of ROADS) {
      if (o === r || (o[1] === o[3]) === h) continue;
      const oc = o[1] === o[3] ? o[1] : o[0];
      const o0 = o[1] === o[3] ? Math.min(o[0], o[2]) : Math.min(o[1], o[3]);
      const o1 = o[1] === o[3] ? Math.max(o[0], o[2]) : Math.max(o[1], o[3]);
      if (oc < a0 + 0.3 || oc > a1 - 0.3 || c < o0 - 0.1 || c > o1 + 0.1) continue;
      junctions.push({ at: oc, half: o[4] / 2, x: h ? oc : c, z: h ? c : oc });
    }
    const off = kind === "avenue" ? LANE : w / 4;
    const vmax = kind === "avenue" ? 1.15 : kind === "street" ? 0.8 : 0.55;
    const spacing = (kind === "avenue" ? 2.6 : kind === "street" ? 4.2 : 7) / density;
    for (const dir of [1, -1] as const) {
      // Keep left: +x traffic on the −z side, +z traffic on the +x side.
      const laneC = h ? c - dir * off : c + dir * off;
      // The logistics trucks own the east side avenue's inbound lane (they queue on it).
      if (!h && c === SIDE_X && dir === -1) continue;
      const len = a1 - a0;
      const n = Math.max(1, Math.floor(len / spacing));
      const cars = Array.from({ length: n }, (_, i) => ({ u: ((i + rand() * 0.5) / n) * len, v: vmax * 0.5, id: -1, s: 0.19 + rand() * 0.03 }));
      lanes.push({ h, c: laneC, a0, a1, dir, vmax, len, junctions, cars });
    }
  }
  return lanes;
}

/* ------------------------------------------------------------------ */
/* Smoke                                                              */
/* ------------------------------------------------------------------ */

const smokeVertex = /* glsl */ `
  attribute float aPhase; attribute vec3 aOrigin;
  uniform float uTime; uniform float uScale;
  varying float vAlpha;
  void main() {
    float age = fract(uTime * 0.09 + aPhase);
    vec3 p = aOrigin + vec3(age * 2.6 + sin(aPhase * 40.0 + uTime * 0.5) * 0.15 * age, age * 3.2, -age * 1.1 + cos(aPhase * 30.0) * 0.2 * age);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = (0.35 + age * 1.3) * uScale / -mv.z;
    vAlpha = smoothstep(0.0, 0.08, age) * (1.0 - age) * 0.5;
  }
`;
const smokeFragment = /* glsl */ `
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = (1.0 - smoothstep(0.15, 0.5, d)) * vAlpha;
    if (a < 0.01) discard;
    gl_FragColor = vec4(vec3(0.98, 0.95, 0.9), a);
    #include <colorspace_fragment>
  }
`;

/* ------------------------------------------------------------------ */

export function Life({ tier }: { tier: Tier }) {
  const geos = useModels();

  const built = useMemo(() => {
    const rand = mulberry32(2024);
    const density = tier === "high" ? 1 : 0.55;
    const lanes = buildLanes(rand, density);
    const carCount = lanes.reduce((n, l) => n + l.cars.length, 0);

    const models: AnyModel[] = [...CAR_MODELS, "proc-heli", "proc-rotor", "proc-loco", "proc-coach", "proc-wagon0", "proc-wagon1", "proc-wagon2", "proc-boat0", "proc-boat1", "proc-boat2", "proc-boat3"];
    const trainLen = 8;
    const boatCount = tier === "high" ? 10 : 6;
    const material = createPaletteMaterial(tier);
    const batch = createDynamicBatch(geos, models, carCount + 2 + trainLen + boatCount, material);
    for (const lane of lanes) for (const c of lane.cars) c.id = batch.add(CAR_MODELS[Math.floor(rand() * CAR_MODELS.length)]);
    const heli = batch.add("proc-heli");
    const rotor = batch.add("proc-rotor");
    const train = Array.from({ length: trainLen }, (_, i) => batch.add(i === 0 ? "proc-loco" : i < 4 ? "proc-coach" : (`proc-wagon${i % 3}` as AnyModel)));
    const boats = Array.from({ length: boatCount }, (_, i) => ({ id: batch.add(`proc-boat${i % 4}` as AnyModel), x: COAST_X + 4 + (i % 5) * 3.5 + rand() * 2, z: -70 + i * 13 + rand() * 6, r: 2 + rand() * 4, sp: 0.04 + rand() * 0.05, ph: rand() * 6.28 }));

    // People on the sidewalks of the core.
    const walkers: { h: boolean; c: number; a0: number; a1: number; u: number; v: number }[] = [];
    for (const [x1, z1, x2, z2, w, kind] of ROADS) {
      if (kind === "lane") continue;
      const h = z1 === z2;
      const a0 = h ? Math.min(x1, x2) : Math.min(z1, z2);
      const a1 = h ? Math.max(x1, x2) : Math.max(z1, z2);
      const core = h ? Math.abs(z1) <= BOULEVARD_Z && Math.max(Math.abs(x1), Math.abs(x2)) <= SIDE_X + 0.1 : Math.abs(x1) <= SIDE_X + 0.1;
      const n = Math.floor(((a1 - a0) / (core ? 1.4 : 5)) * density);
      for (let i = 0; i < n; i++) {
        const side = rand() < 0.5 ? -1 : 1;
        const c = (h ? z1 : x1) + side * (w / 2 + SIDEWALK * 0.5);
        walkers.push({ h, c, a0, a1, u: a0 + rand() * (a1 - a0), v: (rand() < 0.5 ? -1 : 1) * (0.12 + rand() * 0.1) });
      }
    }
    const people = new THREE.InstancedMesh(geos["proc-person"], material, walkers.length);
    people.castShadow = true;
    const col = new THREE.Color();
    for (let i = 0; i < walkers.length; i++) people.setColorAt(i, col.setHex(SHIRTS[Math.floor(rand() * SHIRTS.length)]));

    // Birds: a few flocks wheeling over the city.
    const flocks = [
      { x: -12, z: 46, r: 9, y: 9, sp: 0.18 },
      { x: 14, z: -10, r: 12, y: 9, sp: -0.14 },
      { x: -18, z: -40, r: 10, y: 8, sp: 0.16 },
      { x: 34, z: -20, r: 8, y: 6, sp: 0.2 },
    ];
    const birdsPer = tier === "high" ? 11 : 6;
    const birdOffsets = Array.from({ length: flocks.length * birdsPer }, () => new THREE.Vector3((rand() - 0.5) * 2.4, (rand() - 0.5) * 0.8, (rand() - 0.5) * 2.4));
    const birds = new THREE.InstancedMesh(geos["proc-bird"], new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }), birdOffsets.length);

    // Smoke from the power station's chimneys.
    const perChimney = tier === "high" ? 26 : 14;
    const smokeGeo = new THREE.BufferGeometry();
    const n = CHIMNEYS.length * perChimney;
    const origin = new Float32Array(n * 3), phase = new Float32Array(n);
    CHIMNEYS.forEach(([x, y, z], c) => {
      for (let i = 0; i < perChimney; i++) {
        origin.set([x, y, z], (c * perChimney + i) * 3);
        phase[c * perChimney + i] = i / perChimney + rand() * 0.02;
      }
    });
    smokeGeo.setAttribute("position", new THREE.BufferAttribute(origin.slice(), 3));
    smokeGeo.setAttribute("aOrigin", new THREE.BufferAttribute(origin, 3));
    smokeGeo.setAttribute("aPhase", new THREE.BufferAttribute(phase, 1));
    const smokeMat = new THREE.ShaderMaterial({ vertexShader: smokeVertex, fragmentShader: smokeFragment, transparent: true, depthWrite: false, uniforms: { uTime: { value: 0 }, uScale: { value: 1 } } });
    const smoke = new THREE.Points(smokeGeo, smokeMat);
    smoke.frustumCulled = false;

    return {
      lanes, batch, material,
      heli, rotor, train, boats, walkers, people, flocks, birdsPer, birdOffsets, birds, smoke, smokeGeo, smokeMat,
    };
  }, [geos, tier]);

  useEffect(
    () => () => {
      const b = built;
      releaseBatch(b.batch.mesh);
      b.material.dispose();
      b.people.dispose();
      b.birds.dispose();
      (b.birds.material as THREE.Material).dispose();
      b.smokeGeo.dispose();
      b.smokeMat.dispose();
    },
    [built],
  );

  const ref = useRef(built);
  useEffect(() => {
    ref.current = built;
  }, [built]);
  const T = useRef({ m: new THREE.Matrix4(), q: new THREE.Quaternion(), p: new THREE.Vector3(), s: new THREE.Vector3(), y: new THREE.Vector3(0, 1, 0), e: new THREE.Euler() }).current;

  useFrame((state, delta) => {
    const b = ref.current;
    const dt = Math.min(delta, 1 / 20);
    const t = state.clock.elapsedTime;
    const mesh = b.batch.mesh;
    const set = (id: number, x: number, y: number, z: number, ry: number, s: number, rx = 0) => {
      T.e.set(rx, ry, 0, "YXZ");
      T.q.setFromEuler(T.e);
      mesh.setMatrixAt(id, T.m.compose(T.p.set(x, y, z), T.q, T.s.setScalar(s)));
    };

    /* Traffic */
    for (const lane of b.lanes) {
      const cars = lane.cars;
      const n = cars.length;
      for (let i = 0; i < n; i++) {
        const car = cars[i];
        const lead = cars[(i + 1) % n];
        let room = n === 1 ? 99 : (lead.u - car.u + lane.len) % lane.len - 0.62;
        // stop at red lights
        const pos = lane.dir > 0 ? lane.a0 + car.u : lane.a1 - car.u;
        for (const j of lane.junctions) {
          const stopAt = j.at - lane.dir * (j.half + 0.14);
          const d = (stopAt - pos) * lane.dir;
          if (d > -0.02 && d < 1.2 && !signalGreen(!lane.h, j.x, j.z, t)) room = Math.min(room, d);
        }
        const target = THREE.MathUtils.clamp(room * 1.8, 0, lane.vmax);
        car.v += (target - car.v) * Math.min(1, dt * (target < car.v ? 8 : 2));
        car.u += car.v * dt;
        if (car.u >= lane.len) car.u -= lane.len;
        const a = lane.dir > 0 ? lane.a0 + car.u : lane.a1 - car.u;
        const fade = THREE.MathUtils.clamp(Math.min(car.u, lane.len - car.u) / 0.5, 0, 1);
        const ry = lane.h ? (lane.dir > 0 ? Math.PI / 2 : -Math.PI / 2) : lane.dir > 0 ? 0 : Math.PI;
        const cx = lane.h ? a : lane.c, cz = lane.h ? lane.c : a;
        const hz = islandState.hide;
        const hidden = hz.on && cx > hz.x0 && cx < hz.x1 && cz > hz.z0 && cz < hz.z1;
        set(car.id, cx, 0, cz, ry, hidden ? 0.0001 : car.s * fade);
      }
    }

    /* Helicopter: rests on the hospital's roof, takes off, circles the city, lands. */
    {
      const hp = HELIPAD;
      const cyc = t % 34;
      let x = hp.x, y = hp.y, z = hp.z, ry = 0, tilt = 0;
      if (cyc > 9 && cyc < 31) {
        const up = THREE.MathUtils.smoothstep(cyc, 9, 12) * (1 - THREE.MathUtils.smoothstep(cyc, 28, 31));
        const loop = THREE.MathUtils.clamp((cyc - 11.5) / 17, 0, 1);
        const a = loop * Math.PI * 2;
        const cx = hp.x + 9, cz = hp.z;
        const px = cx - Math.cos(a) * 9, pz = cz + Math.sin(a) * 7;
        const blend = Math.sin(loop * Math.PI);
        x = THREE.MathUtils.lerp(hp.x, px, Math.min(1, blend * 3));
        z = THREE.MathUtils.lerp(hp.z, pz, Math.min(1, blend * 3));
        y = hp.y + up * 3.4;
        ry = -a + Math.PI / 2;
        tilt = 0.18 * Math.min(1, blend * 3);
      }
      set(b.heli, x, y, z, ry, 1, tilt);
      const spin = cyc > 7 && cyc < 33 ? t * 22 : t * (cyc > 33 ? 2 : 0);
      set(b.rotor, x, y + 0.55, z, spin, 1);
    }

    /* Train along the western line. */
    {
      const head = 90 - ((t * 2.2) % 200);
      b.train.forEach((id, i) => set(id, RAIL_X, 0.04, head + i * 1.1, Math.PI, 1));
    }

    /* Boats drift and bob. */
    for (const bt of b.boats) {
      const a = t * bt.sp + bt.ph;
      const x = bt.x + Math.cos(a) * bt.r, z = bt.z + Math.sin(a) * bt.r * 2.2;
      const ry = Math.atan2(-Math.sin(a) * bt.r, Math.cos(a) * bt.r * 2.2) * (bt.sp > 0 ? 1 : -1);
      T.e.set(Math.sin(t * 1.3 + bt.ph) * 0.05, ry, Math.sin(t * 1.1 + bt.ph) * 0.06, "YXZ");
      T.q.setFromEuler(T.e);
      mesh.setMatrixAt(bt.id, T.m.compose(T.p.set(x, Math.sin(t * 1.7 + bt.ph) * 0.02, z), T.q, T.s.setScalar(1)));
    }

    /* People: walkers on the sidewalks, and the hospital queue. */
    const P = b.people;
    b.walkers.forEach((w, i) => {
      w.u += w.v * dt;
      if (w.u > w.a1) w.u = w.a0;
      if (w.u < w.a0) w.u = w.a1;
      const fade = THREE.MathUtils.clamp(Math.min(w.u - w.a0, w.a1 - w.u) / 0.3, 0, 1);
      const bob = Math.abs(Math.sin(t * 9 + i)) * 0.012;
      T.q.setFromAxisAngle(T.y, w.h ? (w.v > 0 ? Math.PI / 2 : -Math.PI / 2) : w.v > 0 ? 0 : Math.PI);
      P.setMatrixAt(i, T.m.compose(T.p.set(w.h ? w.u : w.c, bob, w.h ? w.c : w.u), T.q, T.s.setScalar(fade)));
    });
    P.instanceMatrix.needsUpdate = true;

    /* Birds */
    let k = 0;
    b.flocks.forEach((f, fi) => {
      const a = t * f.sp + fi;
      const cx = f.x + Math.cos(a) * f.r, cz = f.z + Math.sin(a) * f.r;
      const heading = Math.atan2(-Math.sin(a) * f.sp, Math.cos(a) * f.sp);
      for (let i = 0; i < b.birdsPer; i++, k++) {
        const o = b.birdOffsets[k];
        const flap = Math.sin(t * 9 + k * 1.7);
        T.q.setFromAxisAngle(T.y, heading + Math.PI / 2);
        b.birds.setMatrixAt(k, T.m.compose(T.p.set(cx + o.x, f.y + o.y + Math.sin(t * 0.7 + k) * 0.2, cz + o.z), T.q, T.s.set(1.6, 1.6 * flap, 1.6)));
      }
    });
    b.birds.instanceMatrix.needsUpdate = true;

    b.smokeMat.uniforms.uTime.value = t;
    const fov = (state.camera as THREE.PerspectiveCamera).fov ?? 40;
    b.smokeMat.uniforms.uScale.value = (state.size.height * state.gl.getPixelRatio()) / (2 * Math.tan(THREE.MathUtils.degToRad(fov) / 2));
  });

  return (
    <group>
      <primitive object={built.batch.mesh} />
      <primitive object={built.people} />
      <primitive object={built.birds} />
      <primitive object={built.smoke} />
    </group>
  );
}

