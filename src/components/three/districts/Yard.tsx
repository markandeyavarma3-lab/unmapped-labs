"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { COAST_X, DISTRICTS, SCALE, type Placement } from "../city-layout";
import { createBatch, createDynamicBatch, createPaletteMaterial, releaseBatch, useModels } from "../models";
import { mulberry32 } from "../terrain-math";
import { caseState } from "../city-state";
import { YARD, yardBayX, yardBlockZ } from "./layout";
import { TEAM_SHIRT, createChart, createCrew, lerp, smooth, type BarTone } from "./kit";
import { narrator } from "./copy";
import type { Tier } from "../Scene";

/**
 * A container yard and distribution centre. The case: boxes buried in the
 * stacks. A truck waits while the gantry crane digs (two reshuffles for one
 * delivery); our team logs every move; a yard view colours each box by its
 * pickup day, first showing how random the stacks are, then re-sorted so the
 * next box out is always on top; one lift, truck out.
 */

const CONTAINERS = ["ind-shipping-container-a", "ind-shipping-container-b", "ind-shipping-container-c"] as const;
const TINTS = [0xffffff, 0xffd0c0, 0xd0e8ff, 0xfff0b0, 0xd8f5d0, 0xf6c9a8];
/** Pickup day, as the yard view shows it: today, tomorrow, later, held by customs. */
const DAY = [new THREE.Color(1.15, 1.6, 0.45), new THREE.Color(0.35, 1.25, 1.3), new THREE.Color(0.65, 0.75, 1.0), new THREE.Color(1.5, 0.55, 0.45)];
const TIER = 0.348 * SCALE.container;
const CS = SCALE.container;
/** Crane moves in one hour: true = a reshuffle (no delivery). */
const MOVES_BEFORE = [true, true, false, true, true, true, false, true, true, true, false, true];
const MOVES_AFTER = [false, false, true, false, false, false, false, true, false, false, false, false];
const MOVE_H = [0.5, 0.62, 0.46, 0.58, 0.66, 0.52, 0.48, 0.6, 0.55, 0.64, 0.5, 0.57];

export function Yard({ tier }: { tier: Tier }) {
  const geos = useModels();

  const built = useMemo(() => {
    const rand = mulberry32(733);
    const material = createPaletteMaterial(tier);
    const Lg = DISTRICTS.logistics;

    /* Ground: the yard's concrete, the roads inside it, the quay deck. */
    const flat = (x0: number, x1: number, z0: number, z1: number, y = 0.018) => {
      const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0);
      g.rotateX(-Math.PI / 2);
      g.translate((x0 + x1) / 2, y, (z0 + z1) / 2);
      return g;
    };
    const concrete = new THREE.MeshStandardMaterial({ color: "#cdc6b8", roughness: 0.95 });
    const asphalt = new THREE.MeshStandardMaterial({ color: "#3a3d44", roughness: 0.9 });
    const yardGround = flat(Lg.x0 + 0.2, Lg.x1 - 0.2, Lg.z0 + 0.2, Lg.z1 - 0.2, 0.012);
    const lanes = [
      flat(YARD.road.x0, YARD.road.x1, YARD.road.z - YARD.road.w / 2, YARD.road.z + YARD.road.w / 2, 0.02),
      flat(12.6, 13.6, 10, 29.6, 0.02),
      ...YARD.blocks.map((z) => flat(13.4, 25.0, z - 1.0, z - 0.5, 0.02)),
    ];
    const deck = new THREE.BoxGeometry(YARD.quay.x1 - YARD.quay.x0, 0.2, YARD.quay.z1 - YARD.quay.z0);
    deck.translate((YARD.quay.x0 + YARD.quay.x1) / 2, 0.02, (YARD.quay.z0 + YARD.quay.z1) / 2);
    const deckMat = new THREE.MeshStandardMaterial({ color: "#c9c2b6", roughness: 0.95 });

    /* The stacks. In the case block, the dig's three boxes are animated separately. */
    type Box = { k: number; bay: number; row: number; tier: number; height: number; base: number; random: number };
    const boxes: Box[] = [];
    const P: Placement[] = [];
    const caseX = yardBayX(YARD.caseBay), asideBay = YARD.caseBay + 3;
    YARD.blocks.forEach((bz, k) => {
      for (let bay = 0; bay < YARD.bays.n; bay++)
        for (let row = 0; row < 3; row++) {
          let height = 1 + Math.floor(rand() * 4);
          if (k === YARD.caseBlock && row === 1 && bay === YARD.caseBay) height = 0; // the dig
          if (k === YARD.caseBlock && row === 1 && bay === asideBay) height = 1; // room to set boxes aside
          for (let tr = 0; tr < height; tr++) {
            const base = TINTS[Math.floor(rand() * TINTS.length)];
            boxes.push({ k, bay, row, tier: tr, height, base, random: Math.floor(rand() * 4) });
            P.push({ m: CONTAINERS[Math.floor(rand() * 3)], x: yardBayX(bay), y: tr * TIER, z: bz + (row - 1) * YARD.rowPitch, ry: Math.PI / 2, s: CS, tint: base });
          }
        }
    });
    const nBoxes = P.length;
    // warehouses, the gate house, trucks at the docks
    YARD.warehouses.forEach(([x, z]) => P.push({ m: "ind-building-r", x, z, ry: 0, s: 2.0, tint: 0xf3f0ea }));
    P.push({ m: "com-building-c", x: 12.0, z: 11.3, ry: Math.PI / 2, s: 0.45, tint: 0xfff4e0 });
    for (let i = 0; i < 6; i++) P.push({ m: i % 2 ? "car-truck-flat" : "car-delivery", x: 14.4 + i * 1.6, z: 1.6, ry: Math.PI, s: SCALE.car, tint: 0xffffff });
    // the quay: cranes, the ship and its deck cargo
    P.push({ m: "proc-quay", x: COAST_X + 2.4, z: 16.4, ry: 0, s: 1 }, { m: "proc-quay", x: COAST_X + 2.4, z: 23.6, ry: 0, s: 1 });
    P.push({ m: "proc-ship", x: YARD.ship[0], z: YARD.ship[1], ry: 0, s: 1 });
    for (let r = 0; r < 2; r++)
      for (let cc = 0; cc < 7; cc++) {
        const stack = 1 + Math.floor(rand() * 3);
        for (let tr = 0; tr < stack; tr++) P.push({ m: CONTAINERS[Math.floor(rand() * 3)], x: YARD.ship[0] - 0.28 + r * 0.56, z: YARD.ship[1] - 1.7 + cc * 0.62, y: 0.95 + tr * 0.245, ry: 0, s: CS, tint: TINTS[Math.floor(rand() * TINTS.length)] });
      }
    for (let i = 0; i < 10; i++) P.push({ m: CONTAINERS[i % 3], x: YARD.quay.x0 + 0.6 + (i % 5) * 0.32, z: 14 + Math.floor(i / 5) * 11, y: 0.12, ry: 0, s: CS, tint: TINTS[i % TINTS.length] });
    const batch = createBatch(geos, P, material);
    const boxIds = batch.instances.slice(0, nBoxes);

    // one gantry per block (moving), and the dig's three boxes
    const dyn = createDynamicBatch(geos, ["proc-gantry", ...CONTAINERS, "car-truck-flat", "car-truck", "car-delivery-flat"], 40, createPaletteMaterial(tier));
    const gantries = YARD.blocks.map(() => dyn.add("proc-gantry"));
    const dig = [dyn.add(CONTAINERS[0], 0xffd0c0), dyn.add(CONTAINERS[1], 0xd0e8ff), dyn.add(CONTAINERS[2], 0xfff0b0)];
    const served = dyn.add("car-truck-flat");
    const queue = Array.from({ length: 6 }, (_, i) => dyn.add(i % 2 ? "car-truck" : "car-delivery-flat"));

    const shirts = [TEAM_SHIRT, TEAM_SHIRT, 0xf08a2a, 0xf28c1e, 0x2f74c8];
    const crew = createCrew(geos, shirts.length, shirts, createPaletteMaterial(tier));
    const chart = createChart(MOVES_BEFORE.length, 3.4, 1.4);

    return { material, concrete, asphalt, yardGround, lanes, deck, deckMat, boxes, boxIds, batch, dyn, gantries, dig, served, queue, caseX, asideX: yardBayX(asideBay), crew, chart };
  }, [geos, tier]);

  useEffect(
    () => () => {
      const b = built;
      releaseBatch(b.batch.mesh);
      releaseBatch(b.dyn.mesh);
      [b.yardGround, ...b.lanes, b.deck].forEach((g) => g.dispose());
      [b.material, b.concrete, b.asphalt, b.deckMat, b.dyn.mesh.material as THREE.Material, b.crew.people.material as THREE.Material].forEach((m) => m.dispose());
      b.crew.dispose();
      b.chart.dispose();
    },
    [built],
  );

  const T = useRef({ m: new THREE.Matrix4(), q: new THREE.Quaternion(), p: new THREE.Vector3(), s: new THREE.Vector3(), c: new THREE.Color(), up: new THREE.Vector3(0, 1, 0), v: new THREE.Vector3(), overlay: -1, sorted: -1, gx: 0 }).current;
  const say = useMemo(() => narrator("yard"), []);

  useFrame((state, delta) => {
    const b = built;
    const t = state.clock.elapsedTime;
    const st = caseState.yard;
    const s = st.s;
    const mesh = b.dyn.mesh;
    const set = (id: number, x: number, y: number, z: number, ry: number, sc: number) => {
      T.q.setFromAxisAngle(T.up, ry);
      mesh.setMatrixAt(id, T.m.compose(T.p.set(x, y, z), T.q, T.s.setScalar(sc)));
    };

    /* The yard view: boxes coloured by pickup day — random before the fix, sorted (next out on top) after. */
    const overlay = st.near * smooth(0.3, 0.38, s) * (1 - smooth(0.92, 0.98, s));
    const sorted = smooth(0.56, 0.68, s);
    if (Math.abs(overlay - T.overlay) > 0.004 || Math.abs(sorted - T.sorted) > 0.004) {
      T.overlay = overlay;
      T.sorted = sorted;
      b.boxes.forEach((bx, i) => {
        const day = sorted > 0.5 ? Math.min(2, bx.height - 1 - bx.tier) : bx.random;
        T.c.setHex(bx.base).lerp(DAY[day], overlay);
        b.batch.mesh.setColorAt(b.boxIds[i], T.c);
      });
    }

    /* The dig. Before the fix: two reshuffles, then the delivery. After: one lift. */
    const bz = yardBlockZ(YARD.caseBlock);
    const laneZ = bz - 0.75;
    const fixed = s > 0.62;
    const cycle = fixed ? 7 : 12;
    const u = (t % cycle) / cycle;
    const lift = (k: number, a: number, b2: number) => smooth(a, b2, k);
    const topY = 4.3 * TIER;
    const boxAt = (from: THREE.Vector3, to: THREE.Vector3, k: number, out: THREE.Vector3) => {
      // up, across, down
      const up = lift(k, 0, 0.3), across = lift(k, 0.3, 0.7), down = lift(k, 0.7, 1);
      out.set(lerp(from.x, to.x, across), lerp(lerp(from.y, topY, up), to.y, down), lerp(from.z, to.z, across));
      return out;
    };
    const home = (tier: number) => new THREE.Vector3(b.caseX, tier * TIER, bz);
    const aside = (tier: number) => new THREE.Vector3(b.asideX, tier * TIER, bz);
    const truckBed = new THREE.Vector3(b.caseX, 0.17, laneZ);
    let gantryX = b.caseX;
    if (!fixed) {
      // phases: reshuffle 1 (0–.25), reshuffle 2 (.25–.5), deliver (.5–.75), truck leaves (.75–1)
      const p1 = lift(u, 0.02, 0.24), p2 = lift(u, 0.27, 0.49), p3 = lift(u, 0.52, 0.74);
      boxAt(home(2), aside(1), p1, T.v);
      set(b.dig[0], T.v.x, T.v.y, T.v.z, Math.PI / 2, CS);
      boxAt(home(1), aside(2), p2, T.v);
      set(b.dig[1], T.v.x, T.v.y, T.v.z, Math.PI / 2, CS);
      boxAt(home(0), truckBed, p3, T.v);
      const away = lift(u, 0.78, 0.98);
      set(b.dig[2], T.v.x + away * 7, T.v.y, T.v.z, Math.PI / 2, CS * (1 - smooth(0.9, 0.98, u)));
      set(b.served, b.caseX + away * 7, 0, laneZ, Math.PI / 2, SCALE.car * (1 - smooth(0.9, 0.98, u)) + 0.0001);
      // the gantry travels with whichever box it is carrying
      if (p1 > 0 && p1 < 1) gantryX = lerp(b.caseX, b.asideX, smooth(0.3, 0.7, p1));
      else if (p2 > 0 && p2 < 1) gantryX = lerp(b.caseX, b.asideX, smooth(0.3, 0.7, p2));
    } else {
      // stacked by departure: the box this truck wants is on top
      const p3 = lift(u, 0.05, 0.45);
      set(b.dig[0], b.caseX, 0, bz, Math.PI / 2, CS);
      set(b.dig[1], b.caseX, TIER, bz, Math.PI / 2, CS);
      boxAt(home(2), truckBed, p3, T.v);
      const away = lift(u, 0.55, 0.95);
      set(b.dig[2], T.v.x + away * 7, T.v.y, T.v.z, Math.PI / 2, CS * (1 - smooth(0.88, 0.97, u)));
      set(b.served, b.caseX + away * 7, 0, laneZ, Math.PI / 2, SCALE.car * (1 - smooth(0.88, 0.97, u)) + 0.0001);
    }
    // the dig's boxes show the yard view's colours too: the wanted box is "today"
    mesh.setColorAt(b.dig[2], T.c.setHex(0xfff0b0).lerp(DAY[0], overlay));
    mesh.setColorAt(b.dig[0], T.c.setHex(0xffd0c0).lerp(DAY[fixed ? 2 : 3], overlay));
    mesh.setColorAt(b.dig[1], T.c.setHex(0xd0e8ff).lerp(DAY[fixed ? 1 : 2], overlay));
    T.gx = THREE.MathUtils.damp(T.gx, gantryX, 7, Math.min(delta, 1 / 20));
    b.gantries.forEach((id, k) => {
      const x = k === YARD.caseBlock ? T.gx : yardBayX(4 + ((k * 5 + Math.floor(t * 0.05 + k)) % 10)) + Math.sin(t * 0.2 + k) * 0.4;
      set(id, x, 0, yardBlockZ(k) - 0.3, Math.PI / 2, 1);
    });

    /* The gate queue: long before the fix, short after. */
    const waiting = Math.round(lerp(6, 1, smooth(0.66, 0.84, s)));
    b.queue.forEach((id, i) => {
      const x = YARD.gate[0] - 0.5 - i * 0.75 + Math.sin(t * 0.6 + i) * 0.03;
      set(id, x, 0, YARD.road.z - 0.22, Math.PI / 2, i < waiting ? SCALE.car : 0.0001);
    });

    /* The team: one logs every crane move, one counts at the gate. */
    const team = st.near * smooth(0.22, 0.3, s) * (1 - smooth(0.92, 0.98, s));
    b.crew.set(0, b.caseX + 0.9, bz - 1.25, -Math.PI / 2 - 0.4, team, "tablet");
    b.crew.set(1, YARD.gate[0] + 0.2, YARD.road.z + 0.7, Math.PI, team, "clipboard");
    // yard hands
    const any = st.near > 0.01 ? 1 : 0;
    b.crew.set(2, b.caseX - 0.6, bz - 1.2, 0.3, any, "none");
    b.crew.set(3, 14.0, 11.0, Math.PI / 2, any, "none");
    b.crew.set(4, YARD.warehouses[0][0] + 1.2, 2.2, Math.PI, any, "none");
    b.crew.commit();

    b.chart.update({
      opacity: st.near * smooth(0.3, 0.36, s) * (1 - smooth(0.93, 0.99, s)),
      grow: smooth(0.32, 0.44, s),
      values: (i) => MOVE_H[i],
      tone: (i): BarTone => (s > 0.66 ? (MOVES_AFTER[i] ? "red" : "lime") : MOVES_BEFORE[i] ? "red" : "teal"),
      camera: state.camera,
      at: T.v.set(17.0, 3.0, bz + 3.4),
    });
    say.line(0, "red", [YARD.gate[0] - 1.6, 0.8, YARD.road.z]);
    say.line(1, "red", [b.caseX, topY + 0.6, bz]);
    say.say("chart", say.chartTitle, "teal", b.chart.at(0.5, 1.15), b.chart.group.visible ? smooth(0.34, 0.4, s) * (1 - smooth(0.93, 0.99, s)) : 0);
    say.line(2, "lime", [b.caseX + 2.4, 1.6, bz + 0.6]);
    say.line(3, "lime", [b.caseX, topY + 0.6, bz]);
  });

  const B = built;
  return (
    <group>
      <mesh geometry={B.yardGround} material={B.concrete} receiveShadow />
      {B.lanes.map((g, i) => (
        <mesh key={i} geometry={g} material={B.asphalt} receiveShadow />
      ))}
      <mesh geometry={B.deck} material={B.deckMat} receiveShadow castShadow />
      <primitive object={B.batch.mesh} />
      <primitive object={B.dyn.mesh} />
      <primitive object={B.crew.people} />
      <primitive object={B.crew.tools} />
      <primitive object={B.chart.group} />
    </group>
  );
}
