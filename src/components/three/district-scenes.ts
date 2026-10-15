import { mulberry32 } from "./terrain-math";
import { COAST_X, DISTRICTS, RING_X, SCALE, SETS, TREE_TINT, type Placement } from "./city-layout";

/**
 * Each district as a full miniature scene, in data:
 *   farms      — crop fields, a canal, the borewell and its pump house, a farmstead
 *   logistics  — warehouses, a container yard under gantry cranes, a quay and a ship
 *   healthcare — the hospital with a rooftop helipad, ambulances, a garden
 *   energy     — power station, cooling towers, substation, solar farm, turbines at sea
 *   markets    — office towers around the exchange, a market street
 *   open       — empty staked-out lots, an idle tower crane, a survey tent
 * Pieces that play a part in the story carry a `tag`.
 */

export type ScenePlacement = Placement & { tag?: string };

export type Field = { x0: number; z0: number; x1: number; z1: number };

export type DistrictScenes = {
  placements: ScenePlacement[];
  fields: Field[];
  /** The farm canal: from the pump house west between the fields. */
  canal: { x0: number; x1: number; z: number; w: number };
  /** Pylons carrying the line from the power station toward the city (the hardware fix). */
  pylons: { x: number; z: number; ry: number }[];
  /** Offshore wind turbines (tower + spinning blades). */
  turbines: { x: number; z: number; s: number }[];
  quay: { x0: number; x1: number; z0: number; z1: number };
  ship: { x: number; z: number };
  crane: { x: number; z: number };
  helipad: { x: number; y: number; z: number };
  hospitalDoor: [number, number];
  chimneys: [number, number, number][];
};

export function buildDistrictScenes(): DistrictScenes {
  const rand = mulberry32(911);
  const pick = <T,>(a: readonly T[]) => a[Math.floor(rand() * a.length) % a.length];
  const P: ScenePlacement[] = [];
  const tree = (x: number, z: number, s = 1) => P.push({ m: pick(SETS.tree), x, z, ry: rand() * 6.28, s: SCALE.tree * s * (0.8 + rand() * 0.4), tint: pick(TREE_TINT) });
  const ringOfTrees = (cx: number, cz: number, r: number, gapAngle: number, gapWidth = 0.7, step = 0.32) => {
    for (let a = 0; a < Math.PI * 2; a += step + rand() * 0.15) {
      const da = Math.atan2(Math.sin(a - gapAngle), Math.cos(a - gapAngle));
      if (Math.abs(da) < gapWidth) continue;
      tree(cx + Math.cos(a) * r, cz + Math.sin(a) * r);
    }
  };

  /* ---------------- Farms ---------------- */
  const F = DISTRICTS.farms;
  const fields: Field[] = [];
  for (const [zr0, zr1] of [
    [F.z - 5.6, F.z - 1.0],
    [F.z + 1.0, F.z + 5.6],
  ])
    for (const [xc0, xc1] of [
      [F.x - 7.0, F.x - 3.3],
      [F.x - 3.0, F.x + 0.7],
    ])
      fields.push({ x0: xc0, z0: zr0, x1: xc1, z1: zr1 });
  const canal = { x0: F.x - 7.4, x1: F.x + 2.6, z: F.z - 0.55, w: 0.42 };
  // the borewell, its pump house and the water tank at the end of the access road
  P.push({ m: "proc-borewell", x: F.x + 2.8, z: F.z - 1.4, ry: 0, s: 1, tag: "borewell" });
  P.push({ m: "ind-building-i", x: F.x + 3.9, z: F.z - 2.4, ry: Math.PI / 2, s: 0.55, tint: 0xfff4e0 });
  P.push({ m: "ind-water-tower", x: F.x + 4.4, z: F.z + 2.2, ry: 0.3, s: 0.65, tint: 0xd9ecff });
  // farmstead: house, red barn, silos
  P.push({ m: "sub-building-type-c", x: F.x + 3.2, z: F.z + 5.8, ry: Math.PI, s: 0.8, tint: 0xffe0c4 });
  P.push({ m: "ind-building-h", x: F.x + 5.4, z: F.z - 5.2, ry: -Math.PI / 2, s: 0.9, tint: 0xff8f7a });
  P.push({ m: "ind-chimney-medium", x: F.x + 6.4, z: F.z - 3.6, ry: 0, s: 0.75, tint: 0xfff6e8 });
  P.push({ m: "ind-chimney-medium", x: F.x + 6.4, z: F.z - 2.9, ry: 0, s: 0.68, tint: 0xfff6e8 });
  P.push({ m: "nat-log_stack", x: F.x + 4.6, z: F.z + 4.6, ry: 0.4, s: 0.7 });
  for (let i = 0; i < 9; i++) P.push({ m: "nat-fence_simple", x: F.x + 0.9 + (i % 3) * 0.95, z: F.z + 6.9 + 0.0 * i, ry: 0, s: 0.9 });
  ringOfTrees(F.x, F.z, F.r - 0.4, 0, 0.32, 0.26);
  for (let i = 0; i < 10; i++) tree(F.x - 7.8 + i * 0.95, F.z - 0.05 - 0.6, 0.75); // a tree line along the canal
  for (let i = 0; i < 6; i++) P.push({ m: pick(["nat-crop_pumpkin", "nat-crop_melon"] as const), x: F.x + 1.4 + rand() * 1.2, z: F.z + 2.4 + rand() * 2.4, ry: rand() * 6, s: 0.5 });

  /* ---------------- Logistics ---------------- */
  const Lg = DISTRICTS.logistics;
  // warehouses along the north side, docks facing the yard
  P.push({ m: "ind-building-r", x: Lg.x - 0.8, z: Lg.z - 3.2, ry: 0, s: 1.25, tint: 0xf3f0ea, tag: "dock1" });
  P.push({ m: "ind-building-a", x: Lg.x + 3.2, z: Lg.z - 3.6, ry: 0, s: 1.15, tint: 0xe8f1fa });
  P.push({ m: "ind-building-q", x: Lg.x + 4.2, z: Lg.z + 0.6, ry: Math.PI / 2, s: 1.0, tint: 0xfff0dc });
  P.push({ m: "ind-building-s", x: Lg.x - 1.6, z: Lg.z + 5.4, ry: Math.PI, s: 1.1, tint: 0xf3f0ea, tag: "dock2" });
  // container yard: stacks in rows under two gantry cranes
  const cont = ["ind-shipping-container-a", "ind-shipping-container-b", "ind-shipping-container-c"] as const;
  const cTints = [0xffffff, 0xffd0c0, 0xd0e8ff, 0xfff0b0, 0xd8f5d0];
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 6; c++) {
      const x = Lg.x + 0.4 + c * 0.32, z = Lg.z + 1.6 + r * 0.7;
      const stack = 1 + Math.floor(rand() * 3);
      for (let k = 0; k < stack; k++) P.push({ m: pick(cont), x, z, y: k * 0.245, ry: 0, s: SCALE.container, tint: pick(cTints) });
    }
  P.push({ m: "proc-gantry", x: Lg.x + 1.2, z: Lg.z + 2.4, ry: 0, s: 1 });
  P.push({ m: "proc-gantry", x: Lg.x + 1.2, z: Lg.z + 3.8, ry: 0, s: 1 });
  // parked trucks at the dock
  for (let i = 0; i < 3; i++) P.push({ m: "car-truck-flat", x: Lg.x - 2.4 + i * 0.5, z: Lg.z - 1.9, ry: Math.PI, s: SCALE.car, tint: 0xffffff });
  // the quay beyond the coast road, with cranes and a docked ship
  const quay = { x0: RING_X + 0.9, x1: COAST_X + 4.6, z0: Lg.z - 3.5, z1: Lg.z + 3.5 };
  P.push({ m: "proc-quay", x: COAST_X + 3.0, z: Lg.z - 1.6, ry: 0, s: 1 });
  P.push({ m: "proc-quay", x: COAST_X + 3.0, z: Lg.z + 1.4, ry: 0, s: 1 });
  const ship = { x: COAST_X + 6.2, z: Lg.z };
  for (let r = 0; r < 2; r++)
    for (let c = 0; c < 7; c++) {
      const stack = 1 + Math.floor(rand() * 3);
      for (let k = 0; k < stack; k++) P.push({ m: pick(cont), x: ship.x - 0.28 + r * 0.56, z: ship.z - 1.7 + c * 0.62, y: 0.95 + k * 0.245, ry: 0, s: SCALE.container, tint: pick(cTints) });
    }
  for (let i = 0; i < 8; i++) P.push({ m: pick(cont), x: COAST_X + 1.4 + (i % 4) * 0.3, z: Lg.z - 2.8 + Math.floor(i / 4) * 5.2, ry: 0, s: SCALE.container, tint: pick(cTints), y: 0.12 });

  /* ---------------- Healthcare ---------------- */
  const H = DISTRICTS.healthcare;
  const hx = H.x - 1.4, hz = H.z;
  P.push({ m: "com-building-i", x: hx, z: hz, ry: -Math.PI / 2, s: 2.0, tint: 0xf4fbff, tag: "hospital" });
  P.push({ m: "com-building-k", x: hx, z: hz - 2.9, ry: -Math.PI / 2 + Math.PI / 2, s: 1.35, tint: 0xeef7ff });
  P.push({ m: "com-building-k", x: hx, z: hz + 2.9, ry: Math.PI, s: 1.35, tint: 0xeef7ff });
  const roofY = 1.68 * 2.0;
  P.push({ m: "proc-cross", x: hx - 0.2, z: hz - 0.5, y: roofY + 0.01, ry: 0, s: 1.2, tag: "cross" });
  const helipad = { x: hx + 0.25, y: roofY + 0.01, z: hz + 0.75 };
  P.push({ m: "proc-helipad", x: helipad.x, z: helipad.z, y: helipad.y, ry: 0, s: 1 });
  const hospitalDoor: [number, number] = [hx + 1.55, hz];
  // ambulance bay and car park
  for (let i = 0; i < 3; i++) P.push({ m: "car-ambulance", x: hx + 2.4, z: hz + 1.6 + i * 0.42, ry: Math.PI / 2, s: SCALE.car, tint: 0xffffff });
  for (let i = 0; i < 8; i++) P.push({ m: pick(["car-sedan", "car-suv", "car-van", "car-hatchback-sports"] as const), x: hx + 2.3 + (i % 4) * 0.42, z: hz - 2.4 - Math.floor(i / 4) * 0.7, ry: 0, s: SCALE.car, tint: pick([0xffffff, 0xffe0d0, 0xd0e0ff]) });
  // healing garden
  for (let i = 0; i < 14; i++) tree(H.x - 5 - rand() * 1.6, H.z - 4 + rand() * 8, 0.85);
  for (let i = 0; i < 10; i++) P.push({ m: pick(["nat-flower_redA", "nat-flower_yellowA", "nat-flower_purpleA", "nat-plant_bush"] as const), x: H.x - 4.4 + rand() * 1.2, z: H.z - 3 + rand() * 6, ry: rand() * 6, s: 0.8 });
  ringOfTrees(H.x, H.z, H.r - 0.3, 0, 0.35, 0.34);

  /* ---------------- Energy ---------------- */
  const E = DISTRICTS.energy;
  P.push({ m: "ind-building-l", x: E.x + 1.2, z: E.z - 2.2, ry: 0, s: 1.3, tint: 0xf1ede6 });
  P.push({ m: "ind-building-f", x: E.x + 3.6, z: E.z - 1.6, ry: Math.PI / 2, s: 1.15, tint: 0xece6dc });
  P.push({ m: "ind-chimney-large", x: E.x + 4.6, z: E.z - 4.6, ry: 0, s: 1.9, tint: 0xf3efe8 });
  P.push({ m: "ind-chimney-large", x: E.x + 2.4, z: E.z - 5.4, ry: 0, s: 1.7, tint: 0xf3efe8 });
  P.push({ m: "ind-chimney-medium", x: E.x - 0.2, z: E.z - 3.6, ry: 0, s: 1.4 });
  P.push({ m: "ind-detail-tank-large", x: E.x + 5.6, z: E.z - 0.2, ry: 0, s: 0.9 });
  const chimneys: [number, number, number][] = [
    [E.x - 0.2, 1.925 * 1.4, E.z - 3.6],
    [E.x + 4.6, 1.7 * 1.9, E.z - 4.6],
    [E.x + 2.4, 1.7 * 1.7, E.z - 5.4],
  ];
  // substation: transformer bays by the gate (they flicker red while it overloads)
  for (let i = 0; i < 6; i++) P.push({ m: "proc-transformer", x: E.x - 4.8 + (i % 3) * 0.62, z: E.z - 1.7 + Math.floor(i / 3) * 0.55, ry: 0, s: 1, tag: "transformer" });
  // solar farm
  for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) P.push({ m: "ind-solar-panel-landscape-group", x: E.x - 3.6 + c * 1.6, z: E.z + 2.0 + r * 1.05, ry: 0, s: 1 });
  const pylons = [0, 1, 2, 3].map((i) => ({ x: E.x - 6.6 + i * 2.2 + 0.0, z: E.z - 3.3, ry: 0 }));
  const turbines = [
    { x: E.x - 4.8, z: E.z + 5.6, s: 2.2 },
    { x: E.x + 4.8, z: E.z + 4.6, s: 2.4 },
    ...[0, 1, 2, 3, 4, 5, 6].map((i) => ({ x: COAST_X + 5 + (i % 2) * 4.5 + i * 0.6, z: E.z - 14 + i * 4.2, s: 3.0 })),
  ];
  ringOfTrees(E.x, E.z, E.r - 0.3, Math.PI, 0.3, 0.4);

  /* ---------------- Markets ---------------- */
  const M = DISTRICTS.markets;
  P.push({ m: "proc-exchange", x: M.x + 0.6, z: M.z, ry: -Math.PI / 2, s: 1, tag: "exchange" });
  const towers: [number, number, number][] = [
    [M.x - 1.0, M.z - 3.4, 1.5],
    [M.x + 2.2, M.z - 3.6, 1.35],
    [M.x + 4.4, M.z - 1.8, 1.6],
    [M.x + 4.5, M.z + 1.6, 1.4],
    [M.x + 2.4, M.z + 3.6, 1.55],
    [M.x - 1.0, M.z + 3.4, 1.3],
  ];
  towers.forEach(([x, z, s], i) => P.push({ m: SETS.tall[i % 5], x, z, ry: (i % 4) * (Math.PI / 2), s, tint: pick([0xffffff, 0xe6f2ff, 0xfff1e0, 0xe8fff4]) }));
  for (let i = 0; i < 5; i++) P.push({ m: (["proc-stall0", "proc-stall1", "proc-stall2"] as const)[i % 3], x: M.x - 3.6 + (i % 2) * 0.7, z: M.z - 1.8 + i * 0.8, ry: 0, s: 1 });
  for (let i = 0; i < 6; i++) tree(M.x - 2.2, M.z - 2.6 + i * 1.05, 0.7);

  /* ---------------- Open (uncharted) ---------------- */
  const O = DISTRICTS.open;
  const crane = { x: O.x + 1.2, z: O.z - 1.2 };
  for (const [ox, oz] of [[-3.2, -2.2], [2.0, -3.0], [-2.6, 2.6], [2.6, 2.4]]) {
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2;
      const sx = Math.cos(a) > 0.7 ? 1 : Math.cos(a) < -0.7 ? -1 : Math.cos(a) * 1.4;
      const sz = Math.sin(a) > 0.7 ? 1 : Math.sin(a) < -0.7 ? -1 : Math.sin(a) * 1.4;
      P.push({ m: "proc-stake", x: O.x + ox + sx * 1.4, z: O.z + oz + sz * 1.4, ry: 0, s: 1 });
    }
  }
  P.push({ m: "nat-tent_detailedOpen", x: O.x - 0.6, z: O.z + 0.4, ry: 0.6, s: 0.9 });
  for (let i = 0; i < 5; i++) P.push({ m: "road-construction-cone", x: O.x + 3.6 + i * 0.25, z: O.z + 0.2, ry: 0, s: 1.6 });
  for (let i = 0; i < 4; i++) P.push({ m: "road-construction-barrier", x: O.x - 4.8, z: O.z - 0.6 + i * 0.4, ry: Math.PI / 2, s: 1.6 });
  for (let i = 0; i < 8; i++) P.push({ m: pick(["nat-rock_largeA", "nat-rock_smallA", "nat-grass_large"] as const), x: O.x + (rand() - 0.5) * 11, z: O.z + (rand() - 0.5) * 11, ry: rand() * 6, s: 0.6 + rand() * 0.5 });
  ringOfTrees(O.x, O.z, O.r - 0.2, 0, 0.35, 0.5);

  return { placements: P, fields, canal, pylons, turbines, quay, ship, crane, helipad, hospitalDoor, chimneys };
}
