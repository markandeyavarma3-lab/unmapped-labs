import { simplex2 } from "./terrain-math";
import { GROUND, RING_X } from "./city-layout";

/**
 * The hills that bookend the journey: one range north of the city (where the
 * visit starts) and one south of it (where it ends). A river runs down the
 * northern valley into the city, and a road climbs the valley beside it.
 * Pure maths, so the camera keys, the river, the road and the villages can
 * all sit exactly on the ground.
 */

export const HILLS = {
  north: { z0: GROUND.maxZ, z1: GROUND.maxZ + 300 },
  south: { z0: GROUND.minZ, z1: GROUND.minZ - 300 },
  x0: -230,
  x1: 190,
};

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

function fbm(x: number, z: number) {
  let s = 0, a = 1, f = 1, n = 0;
  for (let o = 0; o < 4; o++) {
    s += simplex2(x * f, z * f) * a;
    n += a;
    a *= 0.5;
    f *= 2.03;
  }
  return s / n;
}

/** Distance into a range from the city's edge, and which range. */
const into = (z: number): [number, 1 | -1] => (z > 0 ? [z - HILLS.north.z0, 1] : [HILLS.south.z0 - z, -1]);

/** A valley winds through each range, so the city stays in view from the ridge. */
export const valleyX = (d: number, side: 1 | -1) => (side > 0 ? -6 : 10) + Math.sin(d * 0.028 + (side > 0 ? 0.4 : 2.1)) * 16;

/** The rolling hills, before the river and the road are cut in. */
function rawHeight(x: number, z: number) {
  const [d, side] = into(z);
  if (d <= 0) return 0;
  const ramp = smooth(0, 26, d);
  const scale = 11 + 22 * smooth(10, 170, d);
  const n = fbm(x * 0.018 + side * 13.1, z * 0.018);
  const ridges = 1 - Math.abs(simplex2(x * 0.011 - 4, z * 0.011 + side * 7));
  let h = ramp * scale * (0.42 + 0.38 * (n * 0.5 + 0.5) + 0.32 * ridges * ridges);
  const v = Math.abs(x - valleyX(d, side));
  h *= 0.28 + 0.72 * smooth(5, 26, v);
  h += fbm(x * 0.09, z * 0.09) * 0.6 * ramp;
  return Math.max(0, h);
}

/* ---------------- The river (north) ---------------- */

export const RIVER_END = 250;
/** River centre at distance d into the northern hills. */
export const riverX = (d: number) => valleyX(d, 1);
/** Water level along the river: just below the valley floor, meeting the city at y ≈ 0. */
export function riverY(d: number) {
  const z = HILLS.north.z0 + d;
  return rawHeight(riverX(d), z) - 0.18 * smooth(0, 12, d) + 0.03;
}
export const riverWidth = (d: number) => 2.6 - 1.2 * smooth(0, RIVER_END, d);
/** Its course across the city's northern edge, out to the sea. */
export { RIVER_CITY } from "./city-layout";

/* ---------------- The road (north) ---------------- */

export const ROAD_END = 240;
/** The road leaves the city on the east ring road and swings into the valley, east of the river. */
export const roadX = (d: number) => {
  const inValley = riverX(d) + 6.5;
  return RING_X + (inValley - RING_X) * smooth(0, 70, d);
};
export function roadY(d: number) {
  return rawHeight(roadX(d), HILLS.north.z0 + d) * smooth(0, 4, d);
}

/** Height of the hills at (x, z), with the river channel and the road's shelf cut in. */
export function hillHeight(x: number, z: number) {
  let h = rawHeight(x, z);
  const [d, side] = into(z);
  if (d <= 0 || side < 0) return h;
  if (d < RIVER_END + 10) {
    const w = riverWidth(d);
    const bed = riverY(d) - 0.35;
    const k = smooth(w * 0.5, w * 0.5 + 2.6, Math.abs(x - riverX(d)));
    h = bed + (h - bed) * k;
  }
  if (d < ROAD_END + 6) {
    const k = smooth(0.8, 2.8, Math.abs(x - roadX(d)));
    h = roadY(d) + (h - roadY(d)) * k;
  }
  return h;
}

/* ---------------- Villages and their fields ---------------- */

export type Village = { x: number; z: number; houses: number; seed: number };
export type HillField = { x0: number; z0: number; x1: number; z1: number; tint: number };

/** Small villages on the gentler slopes, mostly along the road. */
export const VILLAGES: Village[] = [
  { x: roadX(34) + 5.5, z: HILLS.north.z0 + 34, houses: 7, seed: 1 },
  { x: roadX(78) + 6, z: HILLS.north.z0 + 78, houses: 6, seed: 2 },
  { x: riverX(118) - 8, z: HILLS.north.z0 + 118, houses: 5, seed: 3 },
  { x: roadX(160) + 6, z: HILLS.north.z0 + 160, houses: 6, seed: 4 },
  { x: -46, z: HILLS.north.z0 + 52, houses: 5, seed: 5 },
  { x: 52, z: HILLS.north.z0 + 96, houses: 5, seed: 6 },
  { x: valleyX(40, -1) - 7, z: HILLS.south.z0 - 40, houses: 6, seed: 7 },
  { x: valleyX(95, -1) + 8, z: HILLS.south.z0 - 95, houses: 5, seed: 8 },
  { x: -40, z: HILLS.south.z0 - 70, houses: 5, seed: 9 },
];

/** Strip fields beside each village (tints for the terrain's vertex colours). */
export const HILL_FIELDS: HillField[] = VILLAGES.flatMap((v, i) => {
  const out: HillField[] = [];
  for (let k = 0; k < 3; k++) {
    const dx = (k - 1) * 5.2 + (i % 2 ? 6 : -6);
    out.push({ x0: v.x + dx - 2.2, x1: v.x + dx + 2.2, z0: v.z + 4, z1: v.z + 10 + (k % 2) * 3, tint: (i + k) % 4 });
  }
  return out;
});
