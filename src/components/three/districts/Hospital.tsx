"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { DISTRICTS, SCALE, SETS, TREE_TINT, type Placement } from "../city-layout";
import { createBatch, createDynamicBatch, createPaletteMaterial, releaseBatch, useModels } from "../models";
import { mulberry32 } from "../terrain-math";
import { caseState } from "../city-state";
import { HELIPAD, HOSPITAL } from "./layout";
import { TEAM_SHIRT, createChart, createCrew, lerp, smooth, walk, type BarTone } from "./kit";
import { narrator } from "./copy";
import type { Tier } from "../Scene";

/**
 * A large hospital campus, and two problems it really has:
 *   discharge — beds free up late in the day, so emergency patients wait and
 *               ambulances queue; discharges planned a day ahead + a lounge
 *   opd       — outpatients all arrive at 9; arrivals counted, a forecast
 *               shapes staggered slots
 */

const SHIRTS = [0xe4483c, 0x2f74c8, 0xf2b33d, 0x3b9c6a, 0xf4f1ea, 0x8e5ac8, 0xff8a5c, 0x37474f, 0x1fb5b0, 0xd4a373];
/** Discharges per hour, 7 am – 6 pm: late in the day before; mostly before noon after. */
const DIS_BEFORE = [0.05, 0.08, 0.1, 0.14, 0.18, 0.22, 0.3, 0.55, 0.82, 0.95, 0.72, 0.4];
const DIS_AFTER = [0.12, 0.42, 0.7, 0.82, 0.66, 0.48, 0.36, 0.3, 0.26, 0.2, 0.14, 0.08];
/** Outpatient arrivals per 15 minutes, 7 – 11 am. */
const ARR_BEFORE = [0.12, 0.24, 0.46, 0.78, 1.0, 0.96, 0.74, 0.5, 0.36, 0.3, 0.24, 0.2, 0.17, 0.14, 0.12, 0.1];
const ARR_AFTER = [0.32, 0.4, 0.44, 0.48, 0.5, 0.5, 0.48, 0.46, 0.44, 0.42, 0.4, 0.38, 0.34, 0.3, 0.26, 0.22];
const PEAK = 0.62;

export function Hospital({ tier }: { tier: Tier }) {
  const geos = useModels();

  const built = useMemo(() => {
    const hi = tier === "high";
    const rand = mulberry32(919);
    const material = createPaletteMaterial(tier);
    const Hc = DISTRICTS.healthcare;

    const flat = (x0: number, x1: number, z0: number, z1: number, y = 0.016) => {
      const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0);
      g.rotateX(-Math.PI / 2);
      g.translate((x0 + x1) / 2, y, (z0 + z1) / 2);
      return g;
    };
    const paving = new THREE.MeshStandardMaterial({ color: "#ebe4d8", roughness: 0.95 });
    const lawn = new THREE.MeshStandardMaterial({ color: "#a8cd70", roughness: 1 });
    const asphalt = new THREE.MeshStandardMaterial({ color: "#3a3d44", roughness: 0.9 });
    const D = HOSPITAL.drive;
    const grounds = [flat(Hc.x0 + 0.2, Hc.x1 - 0.2, Hc.z0 + 0.2, Hc.z1 - 0.2, 0.012)];
    const lawns = [flat(Hc.x0 + 0.5, -23.6, -34.8, -9.6, 0.014), flat(-18.4, -15.8, -25.4, -17.6, 0.014)];
    const roads = [flat(D.x - D.w / 2, D.x + D.w / 2, D.z0, D.z1, 0.02), flat(-14.0, D.x, -30.45, -29.55, 0.02), flat(-15.2, D.x, -14.4, -13.6, 0.02)];

    const P: (Placement & { tag?: string })[] = [];
    const [tx, tz] = HOSPITAL.tower;
    P.push({ m: "com-building-skyscraper-b", x: tx, z: tz, ry: 0, s: HOSPITAL.towerScale, tint: 0xf4fbff });
    P.push({ m: "proc-helipad", x: HELIPAD.x, z: HELIPAD.z, y: HELIPAD.y, ry: 0, s: 1 });
    P.push({ m: "com-building-n", x: HOSPITAL.wards[0], z: HOSPITAL.wards[1], ry: Math.PI / 2, s: 1.6, tint: 0xeef7ff });
    P.push({ m: "com-building-k", x: tx + 0.2, z: tz + 2.8, ry: Math.PI, s: 1.4, tint: 0xeef7ff });
    P.push({ m: "com-building-j", x: HOSPITAL.opd[0], z: HOSPITAL.opd[1], ry: -Math.PI / 2, s: 1.5, tint: 0xf4fbff });
    P.push({ m: "com-building-e", x: HOSPITAL.ed[0], z: HOSPITAL.ed[1], ry: -Math.PI / 2, s: 1.6, tint: 0xfff3f0 });
    P.push({ m: "proc-cross", x: HOSPITAL.ed[0], z: HOSPITAL.ed[1], y: 0.893 * 1.6 + 0.01, ry: 0, s: 1.1 });
    P.push({ m: "com-building-c", x: HOSPITAL.lounge[0], z: HOSPITAL.lounge[1], ry: -Math.PI / 2, s: 0.9, tint: 0xe9f7e4, tag: "lounge" });
    // car park and garden
    for (let i = 0; i < 14; i++) P.push({ m: (["car-sedan", "car-suv", "car-van", "car-hatchback-sports"] as const)[i % 4], x: -25.4 + (i % 7) * 0.5, z: -12.0 - Math.floor(i / 7) * 0.9, ry: 0, s: SCALE.car, tint: [0xffffff, 0xffe0d0, 0xd0e0ff][i % 3] });
    for (let i = 0; i < 22; i++) P.push({ m: SETS.tree[Math.floor(rand() * SETS.tree.length)], x: Hc.x0 + 0.8 + rand() * 2.6, z: -16 - rand() * 18, ry: rand() * 6.28, s: SCALE.tree * (0.8 + rand() * 0.4), tint: TREE_TINT[Math.floor(rand() * TREE_TINT.length)] });
    for (let i = 0; i < 6; i++) P.push({ m: SETS.tree[i % SETS.tree.length], x: -17.8 + (i % 3) * 0.9, z: -18.4 - Math.floor(i / 3) * 6.2, ry: i, s: SCALE.tree * 0.9, tint: TREE_TINT[i % TREE_TINT.length] });
    const batch = createBatch(geos, P, material);
    const lounge = P.map((p, i) => (p.tag === "lounge" ? { p, id: batch.instances[i] } : null)).filter(Boolean) as { p: Placement; id: number }[];

    // ambulances queueing at the emergency entrance, and the pick-up cars for discharged patients
    const dyn = createDynamicBatch(geos, ["car-ambulance", "car-sedan", "car-taxi"], 12, createPaletteMaterial(tier));
    const ambulances = Array.from({ length: 5 }, () => dyn.add("car-ambulance"));
    const pickups = [dyn.add("car-taxi"), dyn.add("car-sedan")];

    // trolleys (with a patient lying on each) outside the emergency entrance
    const trolleyGeo = new THREE.BoxGeometry(0.12, 0.05, 0.26);
    trolleyGeo.translate(0, 0.07, 0);
    const trolleys = new THREE.InstancedMesh(trolleyGeo, new THREE.MeshStandardMaterial({ color: "#f4f6f8", roughness: 0.6 }), 6);
    trolleys.frustumCulled = false;

    // people: the team (teal) for each case, outpatients, discharged patients, staff
    const crowdN = hi ? 46 : 28;
    const shirts = [TEAM_SHIRT, TEAM_SHIRT, TEAM_SHIRT, TEAM_SHIRT, ...Array.from({ length: crowdN + 10 }, (_, i) => SHIRTS[i % SHIRTS.length])];
    const crew = createCrew(geos, shirts.length, shirts, createPaletteMaterial(tier));
    const lying = createCrew(geos, 6, SHIRTS, createPaletteMaterial(tier));
    const crowd = Array.from({ length: crowdN }, () => ({ jx: rand(), jz: rand(), ph: rand() * 6.28 }));

    const charts = { discharge: createChart(DIS_BEFORE.length, 3.6, 1.6), opd: createChart(ARR_BEFORE.length, 3.6, 1.6, { limit: PEAK }) };

    return { material, paving, lawn, asphalt, grounds, lawns, roads, batch, lounge, dyn, ambulances, pickups, trolleyGeo, trolleys, crew, lying, crowd, crowdN, charts };
  }, [geos, tier]);

  useEffect(
    () => () => {
      const b = built;
      releaseBatch(b.batch.mesh);
      releaseBatch(b.dyn.mesh);
      [...b.grounds, ...b.lawns, ...b.roads, b.trolleyGeo].forEach((g) => g.dispose());
      [b.material, b.paving, b.lawn, b.asphalt, b.dyn.mesh.material as THREE.Material, b.trolleys.material as THREE.Material, b.crew.people.material as THREE.Material, b.lying.people.material as THREE.Material].forEach((m) => m.dispose());
      b.trolleys.dispose();
      b.crew.dispose();
      b.lying.dispose();
      Object.values(b.charts).forEach((c) => c.dispose());
    },
    [built],
  );

  const T = useRef({ m: new THREE.Matrix4(), q: new THREE.Quaternion(), p: new THREE.Vector3(), s: new THREE.Vector3(), up: new THREE.Vector3(0, 1, 0), v: new THREE.Vector3(), hide: new THREE.Matrix4().makeScale(0, 0, 0) }).current;
  const say = useMemo(() => ({ discharge: narrator("discharge"), opd: narrator("opd") }), []);

  useFrame((state) => {
    const b = built;
    const t = state.clock.elapsedTime;
    const cam = state.camera;
    const Ds = caseState.discharge, Op = caseState.opd;
    const mesh = b.dyn.mesh;
    const set = (id: number, x: number, z: number, ry: number, sc: number) => {
      T.q.setFromAxisAngle(T.up, ry);
      mesh.setMatrixAt(id, T.m.compose(T.p.set(x, 0, z), T.q, T.s.setScalar(sc)));
    };
    const crew = b.crew;
    const anyNear = Ds.near > 0.01 || Op.near > 0.01 ? 1 : 0;

    /* ---------------- Discharge ---------------- */
    {
      const s = Ds.s;
      const flow = smooth(0.62, 0.84, s); // beds now open in the morning
      // ambulances ramping at the entrance (fewer once beds open), then leaving
      const waiting = Math.round(lerp(5, 1, flow));
      b.ambulances.forEach((id, i) => {
        const x = HOSPITAL.bay.x0 + 0.4 + i * 0.75;
        set(id, x, HOSPITAL.bay.z - 0.22, -Math.PI / 2, i < waiting ? SCALE.car : 0.0001);
      });
      // patients waiting on trolleys by the door
      const onTrolleys = Math.round(lerp(6, 1, flow));
      for (let i = 0; i < 6; i++) {
        const x = HOSPITAL.ed[0] + 1.3 + (i % 3) * 0.24, z = HOSPITAL.ed[1] + 1.0 + Math.floor(i / 3) * 0.36;
        const on = i < onTrolleys && anyNear ? 1 : 0;
        b.trolleys.setMatrixAt(i, on ? T.m.compose(T.p.set(x, 0, z), T.q.identity(), T.s.setScalar(1.5)) : T.hide);
        // the patient lies along the trolley
        if (on) {
          T.q.setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2);
          b.lying.people.setMatrixAt(i, T.m.compose(T.p.set(x, 0.17, z - 0.1), T.q, T.s.setScalar(1.3)));
        } else b.lying.people.setMatrixAt(i, T.hide);
      }
      b.trolleys.instanceMatrix.needsUpdate = true;
      b.lying.people.instanceMatrix.needsUpdate = true;
      // the discharge lounge goes up in the fix
      for (const { p, id } of b.lounge) {
        const k = Math.max(0.001, smooth(0.5, 0.62, s));
        T.q.setFromAxisAngle(T.up, p.ry);
        b.batch.mesh.setMatrixAt(id, T.m.compose(T.p.set(p.x, 0, p.z), T.q, T.s.set(p.s, p.s * k, p.s)));
      }
      // discharged patients: tower → lounge → a waiting car on the drive (after the fix)
      const out = smooth(0.62, 0.7, s) * Ds.near;
      for (let k = 0; k < 4; k++) {
        const w = walk(
          [
            [HOSPITAL.tower[0] + 1.2, HOSPITAL.tower[1]],
            [HOSPITAL.lounge[0] - 0.7, HOSPITAL.lounge[1]],
            [HOSPITAL.lounge[0] + 0.7, HOSPITAL.lounge[1] + 0.2],
            [HOSPITAL.drive.x - 0.5, HOSPITAL.lounge[1] + 0.2],
          ],
          (t * 0.35 + k * 1.8) % 7.5,
          false,
        );
        crew.set(4 + b.crowdN + k, w.x, w.z, w.heading, out, k % 2 ? "crate" : "none", Math.abs(Math.sin(t * 8 + k)) * 0.01);
      }
      b.pickups.forEach((id, i) => set(id, HOSPITAL.drive.x + 0.2, HOSPITAL.lounge[1] + 0.6 - i * 0.7, Math.PI, out > 0.01 ? SCALE.car : 0.0001));
      // the team: one with the bed records (laptop) by the tower, one at the emergency door
      const team = Ds.near * smooth(0.22, 0.3, s) * (1 - smooth(0.92, 0.98, s));
      crew.set(0, HOSPITAL.tower[0] + 1.4, HOSPITAL.tower[1] - 0.6, Math.PI / 2, team, "laptop");
      crew.set(1, HOSPITAL.ed[0] + 1.2, HOSPITAL.ed[1] - 0.6, Math.PI / 2, team, "clipboard");
      b.charts.discharge.update({
        opacity: Ds.near * smooth(0.3, 0.36, s) * (1 - smooth(0.93, 0.99, s)),
        grow: smooth(0.32, 0.44, s),
        values: (i) => lerp(DIS_BEFORE[i], DIS_AFTER[i], smooth(0.6, 0.74, s)),
        tone: (i): BarTone => (s > 0.68 ? (i <= 5 ? "lime" : "teal") : i >= 7 ? "red" : "teal"),
        camera: cam,
        at: T.v.set(-17.6, 3.4, -24.6),
      });
      const ch = b.charts.discharge;
      say.discharge.line(0, "red", [HOSPITAL.bay.x0 + 1.4, 0.9, HOSPITAL.bay.z]);
      say.discharge.line(1, "red", ch.at(0.78, 0.9));
      say.discharge.say("chart", say.discharge.chartTitle, "teal", ch.at(0.5, 1.15), ch.group.visible ? smooth(0.34, 0.4, s) * (1 - smooth(0.93, 0.99, s)) : 0);
      say.discharge.line(2, "lime", [HOSPITAL.lounge[0], 1.4, HOSPITAL.lounge[1]]);
      say.discharge.line(3, "lime", ch.at(0.3, 0.85));
    }

    /* ---------------- Outpatients ---------------- */
    {
      const s = Op.s;
      const spread = smooth(0.62, 0.82, s);
      const F = HOSPITAL.forecourt;
      // a packed forecourt before; a short line at the door after
      const shown = Math.round(lerp(b.crowdN, 9, spread));
      b.crowd.forEach((c, i) => {
        let x: number, z: number, h: number;
        if (spread < 0.5) {
          x = F.x0 + 0.2 + c.jx * (F.x1 - F.x0 - 0.4) + Math.sin(t * 0.7 + c.ph) * 0.04;
          z = F.z0 + 0.2 + c.jz * (F.z1 - F.z0 - 0.4);
          h = Math.atan2(HOSPITAL.opd[0] - x, HOSPITAL.opd[1] - z) + Math.sin(t + c.ph) * 0.5;
        } else {
          // an orderly line to the registration door
          x = F.x0 + 0.4 + i * 0.26;
          z = HOSPITAL.opd[1] - 0.2;
          h = -Math.PI / 2;
        }
        crew.set(4 + i, x, z, h, i < shown && anyNear ? 1 : 0, "none", Math.abs(Math.sin(t * 3 + c.ph)) * 0.006);
      });
      const team = Op.near * smooth(0.22, 0.3, s) * (1 - smooth(0.92, 0.98, s));
      crew.set(2, F.x1 + 0.35, F.z0 + 0.4, -Math.PI / 2, team, "counter");
      crew.set(3, HOSPITAL.opd[0] + 1.75, HOSPITAL.opd[1] + 1.2, -Math.PI / 2 - 0.5, team, s < 0.56 ? "counter" : "tablet");
      b.charts.opd.update({
        opacity: Op.near * smooth(0.3, 0.36, s) * (1 - smooth(0.93, 0.99, s)),
        grow: smooth(0.32, 0.44, s),
        values: (i) => lerp(ARR_BEFORE[i], ARR_AFTER[i], smooth(0.6, 0.76, s)),
        tone: (i): BarTone => (s > 0.7 ? "lime" : ARR_BEFORE[i] > PEAK ? "red" : "teal"),
        limit: PEAK,
        camera: cam,
        at: T.v.set(-21.2, 2.6, -16.0),
      });
      const ch = b.charts.opd;
      say.opd.line(0, "red", [(F.x0 + F.x1) / 2, 0.7, (F.z0 + F.z1) / 2]);
      say.opd.line(1, "teal", [F.x1 + 0.35, 0.75, F.z0 + 0.4]);
      say.opd.say("chart", say.opd.chartTitle, "teal", ch.at(0.5, 1.15), ch.group.visible ? smooth(0.34, 0.4, s) * (1 - smooth(0.93, 0.99, s)) : 0);
      say.opd.line(2, "lime", ch.at(0.5, 0.75));
      say.opd.line(3, "lime", [(F.x0 + F.x1) / 2, 0.7, (F.z0 + F.z1) / 2]);
    }

    crew.commit();
  });

  const B = built;
  return (
    <group>
      {B.grounds.map((g, i) => (
        <mesh key={`g${i}`} geometry={g} material={B.paving} receiveShadow />
      ))}
      {B.lawns.map((g, i) => (
        <mesh key={`l${i}`} geometry={g} material={B.lawn} receiveShadow />
      ))}
      {B.roads.map((g, i) => (
        <mesh key={`r${i}`} geometry={g} material={B.asphalt} receiveShadow />
      ))}
      <primitive object={B.batch.mesh} />
      <primitive object={B.dyn.mesh} />
      <primitive object={B.trolleys} />
      <primitive object={B.lying.people} />
      <primitive object={B.crew.people} />
      <primitive object={B.crew.tools} />
      <primitive object={B.charts.discharge.group} />
      <primitive object={B.charts.opd.group} />
    </group>
  );
}
