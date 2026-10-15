import { mulberry32 } from "./terrain-math";
import { buildTitle, strokeDistance, type TitleLayout } from "./title-glyphs";

/**
 * The city, as pure data. Buildings, districts, roads and flow paths are
 * derived deterministically so the 3D scene, the scroll journey and the
 * static fallback map all agree. No three.js here.
 *
 * World axes: x left→right, z toward the viewer; the journey heads to −z.
 */

export type DistrictId = "farms" | "logistics" | "healthcare" | "energy" | "markets" | "open";
export type FixType = "software" | "hardware" | "process" | "data";

export type District = {
  id: DistrictId;
  x: number;
  z: number;
  r: number;
  /** Chapter at which the district "lights up" (is understood). */
  chapter: number;
  /** Where its flow jams: the district's entrance on its cross street. */
  jam: [number, number];
  /** The right fix for its example problem (none for the uncharted district). */
  fix: FixType | null;
};

export const DISTRICTS: Record<DistrictId, District> = {
  farms: { id: "farms", x: -17, z: 10, r: 9, chapter: 5, jam: [-8.2, 10], fix: "software" },
  logistics: { id: "logistics", x: 17, z: 2, r: 8, chapter: 6, jam: [8.8, 2], fix: "process" },
  healthcare: { id: "healthcare", x: -16, z: -22, r: 7.5, chapter: 7, jam: [-8.4, -22], fix: "data" },
  energy: { id: "energy", x: 17, z: -30, r: 8.5, chapter: 8, jam: [8.4, -30], fix: "hardware" },
  open: { id: "open", x: -15, z: -51, r: 8, chapter: 9, jam: [-7, -51], fix: null },
  markets: { id: "markets", x: 13, z: -52, r: 7, chapter: 11, jam: [6, -52], fix: "data" },
};
export const DISTRICT_LIST = Object.values(DISTRICTS);

/** Roads: [x1, z1, x2, z2, width]. A central avenue and one cross street per district. */
export const ROADS: [number, number, number, number, number][] = [
  [0, 58, 0, -66, 1.6],
  [0, 10, -8.2, 10, 1.1],
  [0, 2, 8.8, 2, 1.1],
  [0, -22, -8.4, -22, 1.1],
  [0, -30, 8.4, -30, 1.1],
  [0, -51, -7, -51, 1.1],
  [0, -52, 6, -52, 1.1],
  [-22, 36, 22, 36, 1.0], // downtown's southern boulevard
];

/** Ground extent. */
export const GROUND = { minX: -48, maxX: 48, minZ: -82, maxZ: 70 };

export type Building = {
  x: number;
  z: number;
  w: number;
  d: number;
  /** Skyline height once the name has melted back into the city. */
  h: number;
  /** Height while it forms part of the name (0 if not a letter). */
  letterH: number;
  letter: boolean;
  /** Chapter at which its windows switch on. 99 = never (uncharted). */
  wake: number;
  seed: number;
};

const distToSegment = (px: number, pz: number, x1: number, z1: number, x2: number, z2: number) => {
  const dx = x2 - x1, dz = z2 - z1;
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (pz - z1) * dz) / (dx * dx + dz * dz || 1)));
  return Math.hypot(x1 + dx * t - px, z1 + dz * t - pz);
};
const nearRoad = (x: number, z: number, pad: number) => ROADS.some(([x1, z1, x2, z2, w]) => distToSegment(x, z, x1, z1, x2, z2) < w / 2 + pad);

/** When a filler block's windows come on: earlier near downtown, later down the avenue. */
const wakeForZ = (z: number) => Math.max(1.2, Math.min(11.5, 2 + ((36 - z) * 9.5) / 90));

export function buildCity(layout: TitleLayout) {
  const rand = mulberry32(4242);
  const title = buildTitle(layout);
  const buildings: Building[] = [];

  // --- Downtown: a dense grid of small towers; the ones on the strokes spell the name.
  const P = 0.5;
  for (let x = title.minX; x <= title.maxX; x += P) {
    for (let z = title.minZ; z <= title.maxZ; z += P) {
      const d = strokeDistance(title, x, z);
      const letter = d < 0.34;
      if (!letter && rand() > 0.58) continue;
      const seed = rand();
      buildings.push({
        x,
        z,
        w: 0.38,
        d: 0.38,
        h: letter ? 0.35 + seed * 1.5 : 0.12 + seed * 0.5,
        letterH: letter ? 2.1 + seed * 0.35 : 0,
        letter,
        wake: letter ? 0.4 : 1.1,
        seed,
      });
    }
  }

  // --- The rest of the city: blocks on a coarser grid, leaving room for districts and roads.
  const G = 1.7;
  for (let x = GROUND.minX + 3; x <= GROUND.maxX - 3; x += G) {
    for (let z = GROUND.minZ + 6; z <= GROUND.maxZ - 6; z += G) {
      if (x > title.minX - 1 && x < title.maxX + 1 && z > title.minZ - 1 && z < title.maxZ + 1) continue;
      if (nearRoad(x, z, 0.55)) continue;
      const inDistrict = DISTRICT_LIST.find((dd) => Math.hypot(x - dd.x, z - dd.z) < dd.r + 0.6);
      if (inDistrict && inDistrict.id !== "markets") continue;
      const fromAvenue = Math.abs(x);
      const density = inDistrict?.id === "markets" ? 0.9 : 0.88 - Math.min(0.55, fromAvenue / 70) - (z < -64 ? 0.4 : 0);
      if (rand() > density) continue;
      // markets: a finance cluster with a plaza in the middle for the exchange
      if (inDistrict?.id === "markets" && Math.hypot(x - inDistrict.x, z - inDistrict.z) < 2.6) continue;
      const seed = rand();
      const tall = inDistrict?.id === "markets" ? 2.4 + seed * 3.6 : 0.35 + Math.pow(seed, 2.2) * (2.8 - Math.min(2, fromAvenue / 18));
      buildings.push({
        x: x + (rand() - 0.5) * 0.25,
        z: z + (rand() - 0.5) * 0.25,
        w: 0.9 + rand() * 0.45,
        d: 0.9 + rand() * 0.45,
        h: tall,
        letterH: 0,
        letter: false,
        wake: inDistrict?.id === "markets" ? DISTRICTS.markets.chapter - 0.4 : wakeForZ(z),
        seed,
      });
    }
  }

  return { title, buildings };
}

/* ---- Flow paths: downtown → avenue → cross street → district entrance ---- */

export type FlowKind = "goods" | "water" | "energy" | "data" | "people";
export type FlowPath = { district: DistrictId; kind: FlowKind; points: [number, number][] };

const kindOf: Record<DistrictId, FlowKind> = {
  farms: "water",
  logistics: "goods",
  healthcare: "people",
  energy: "energy",
  markets: "data",
  open: "goods",
};

export const FLOW_PATHS: FlowPath[] = DISTRICT_LIST.filter((d) => d.id !== "open").map((d) => ({
  district: d.id,
  kind: kindOf[d.id],
  points: [
    [0, 36],
    [0, d.jam[1]],
    [d.jam[0] * 0.55, d.jam[1]],
    d.jam,
    [d.x + (d.jam[0] < 0 ? 3 : -3), d.z],
  ],
}));

/** Pure avenue traffic, for life between districts. */
export const AVENUE_PATH: [number, number][] = [
  [0.35, 56],
  [0.35, -64],
];

/** Logistics' fix (process): a bypass lane to a second dock. Trucks split once it exists. */
export const LOGISTICS_BYPASS: [number, number][] = [
  [0, 36],
  [0, 2],
  [4.6, 2],
  [4.6, -2.6],
  [10.6, -2.6],
  [DISTRICTS.logistics.x - 2.2, DISTRICTS.logistics.z - 3.2],
];
