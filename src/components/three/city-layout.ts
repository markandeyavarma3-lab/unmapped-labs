import { mulberry32 } from "./terrain-math";
import { buildTitle, strokeDistance, type TitleLayout, type TitleShape } from "./title-glyphs";
import { MODELS, type ModelName } from "./models.generated";

/**
 * The city, as pure data. Roads, blocks, districts and every model placement
 * are derived deterministically so the 3D scene, the scroll journey and the
 * static fallback map all agree. No three.js here.
 *
 * World axes: x left→right, z toward the viewer; the journey heads to −z.
 * A dense core on a street grid runs down the middle; suburbs and the five
 * districts flank it; farmland and a railway lie to the west, the coast and a
 * harbour to the east.
 */

export type DistrictId = "farms" | "logistics" | "healthcare" | "energy" | "markets" | "open";
export type FixType = "software" | "hardware" | "process" | "data";

/**
 * A district is a large site (a commercial farm, a container yard, a hospital
 * campus, an industrial plant…) on a rectangle of land between a side avenue
 * and the ring road. Its gates open onto lanes from the side avenue.
 */
export type District = {
  id: DistrictId;
  x0: number;
  x1: number;
  z0: number;
  z1: number;
  /** Centre, and a radius that covers the rectangle (for coarse checks). */
  x: number;
  z: number;
  r: number;
  /** Lanes (z) from the side avenue into the site. */
  gates: number[];
};

const site = (id: DistrictId, x0: number, x1: number, z0: number, z1: number, gates: number[]): District => ({
  id, x0, x1, z0, z1, gates, x: (x0 + x1) / 2, z: (z0 + z1) / 2, r: Math.hypot(x1 - x0, z1 - z0) / 2,
});

export const DISTRICTS: Record<DistrictId, District> = {
  farms: site("farms", -26.4, -10.6, -3, 31, [10]),
  logistics: site("logistics", 10.6, 26.4, -3, 31, [10]),
  healthcare: site("healthcare", -26.4, -10.6, -35.5, -9, [-14, -30]),
  energy: site("energy", 10.6, 26.4, -40, -9, [-22]),
  open: site("open", -26.4, -10.6, -58.5, -41, [-52]),
  markets: site("markets", 10.6, 20, -58.5, -46, [-52]),
};
/** Inside a district's rectangle (grown by `pad`)? */
export const inSite = (d: District, x: number, z: number, pad = 0) => x > d.x0 - pad && x < d.x1 + pad && z > d.z0 - pad && z < d.z1 + pad;
export const DISTRICT_LIST = Object.values(DISTRICTS);

/* ------------------------------------------------------------------ */
/* Roads                                                              */
/* ------------------------------------------------------------------ */

export type RoadKind = "avenue" | "street" | "lane";
/** Axis-aligned road: [x1, z1, x2, z2, width, kind]. */
export type Road = [number, number, number, number, number, RoadKind];

export const AVENUE_W = 1.6;
export const SIDE_X = 7.5; // the two side avenues
export const RING_X = 27.5; // ring road (the east one runs along the coast)
export const COAST_X = 30.5;
export const RAIL_X = -32;
export const SIDEWALK = 0.32;
/** Cross streets of the core grid, north → south. */
export const Z_STREETS = [36, 28, 20, 10, 2, -6, -14, -22, -30, -38, -45, -52, -60];
export const BOULEVARD_Z = 36;
export const AVENUE_END = -66;

/** Ground extent (the sea and the far fields continue past it). */
export const GROUND = { minX: -64, maxX: 64, minZ: -96, maxZ: 84 };

/** The river from the northern hills, across the city's northern edge to the sea (x, z). */
export const RIVER_CITY: [number, number][] = [
  [0.23, GROUND.maxZ + 0.5],
  [1.6, 81.2],
  [7, 79.4],
  [16, 78.6],
  [24, 79.2],
  [RING_X, 79.4],
  [34, 79.6],
  [40, 79.6],
];
export const RIVER_CITY_W = 2.6;

/** Does an axis-aligned segment cross any district (grown by `pad`)? */
const segHitsDistrict = (x1: number, z1: number, x2: number, z2: number, pad: number) =>
  DISTRICT_LIST.some((d) => Math.max(x1, x2) > d.x0 - pad && Math.min(x1, x2) < d.x1 + pad && Math.max(z1, z2) > d.z0 - pad && Math.min(z1, z2) < d.z1 + pad);

function buildRoads(): Road[] {
  const roads: Road[] = [
    [0, BOULEVARD_Z, 0, AVENUE_END, AVENUE_W, "avenue"],
    [-SIDE_X, BOULEVARD_Z, -SIDE_X, -60, 1.1, "street"],
    [SIDE_X, BOULEVARD_Z, SIDE_X, -60, 1.1, "street"],
    [-RING_X, BOULEVARD_Z, -RING_X, -60, 1.0, "street"],
    [RING_X, BOULEVARD_Z, RING_X, -60, 1.0, "street"],
    [-RING_X, BOULEVARD_Z, RING_X, BOULEVARD_Z, 1.2, "street"],
    [-RING_X, -60, RING_X, -60, 1.0, "street"],
    // north, out to the hills (it climbs the valley from here: hill-terrain.ts)
    [RING_X, BOULEVARD_Z, RING_X, GROUND.maxZ, 1.0, "street"],
  ];
  for (const z of Z_STREETS) {
    if (z === BOULEVARD_Z || z === -60) continue;
    roads.push([-SIDE_X, z, SIDE_X, z, 1.0, "street"]);
    // Out to the ring road through the suburbs, unless a district is in the way.
    for (const side of [-1, 1]) {
      const d = DISTRICT_LIST.find((dd) => dd.gates.includes(z) && Math.sign(dd.x) === side);
      if (d) {
        // a district's gate road, a little way into the site
        const edge = side > 0 ? d.x0 : d.x1;
        roads.push([side * SIDE_X, z, edge + side * 1.6, z, 0.9, "lane"]);
      } else if (!segHitsDistrict(side * (SIDE_X + 1), z, side * RING_X, z, 0.4)) {
        roads.push([side * SIDE_X, z, side * RING_X, z, 0.8, "lane"]);
      }
    }
  }
  return roads;
}
export const ROADS: Road[] = buildRoads();


/** The block the five-step process plays out in (east of the avenue, between z 20 and 28). */
export const PROCESS_BLOCK = {
  minX: AVENUE_W / 2 + SIDEWALK,
  maxX: SIDE_X - 0.55 - SIDEWALK,
  minZ: 20 + 0.5 + SIDEWALK,
  maxZ: 28 - 0.5 - SIDEWALK,
  /** The junction whose signals are stuck. */
  junction: [SIDE_X, 20] as [number, number],
};

/* ------------------------------------------------------------------ */
/* Placements                                                         */
/* ------------------------------------------------------------------ */

/** A kit model, or one of the procedural pieces (see procedural.ts). */
export type AnyModel = ModelName | `proc-${string}`;

export type Placement = {
  m: AnyModel;
  x: number;
  z: number;
  y?: number;
  /** Rotation about y. */
  ry: number;
  s: number;
  /** Extra vertical scale (title towers). */
  sy?: number;
  /** Instance tint (multiplies the model's colours), as 0xRRGGBB. */
  tint?: number;
};

/** A tower of the downtown grid; the ones on the strokes spell the name. */
export type TitleTower = {
  m: ModelName;
  x: number;
  z: number;
  ry: number;
  letter: boolean;
  /** Skyline height after the name melts back into the city. */
  h: number;
  /** Height while it forms part of the name. */
  letterH: number;
  seed: number;
  tint: number;
};

const L = (prefix: string, from: string, to: string) =>
  Array.from({ length: to.charCodeAt(0) - from.charCodeAt(0) + 1 }, (_, i) => `${prefix}${String.fromCharCode(from.charCodeAt(0) + i)}` as ModelName);

export const SETS = {
  mid: L("com-building-", "a", "k"),
  tall: [...L("com-building-skyscraper-", "a", "e"), "com-building-l", "com-building-m", "com-building-n"] as ModelName[],
  low: L("com-low-detail-building-", "a", "m"),
  house: L("sub-building-type-", "a", "u"),
  industry: L("ind-building-", "a", "t"),
  tree: ["nat-tree_oak", "nat-tree_default", "nat-tree_fat", "nat-tree_simple", "nat-tree_small", "nat-tree_tall", "nat-tree_cone", "nat-tree_pineRoundA", "nat-tree_pineRoundC"] as ModelName[],
  pine: ["nat-tree_pineTallA", "nat-tree_pineRoundA", "nat-tree_pineRoundC", "nat-tree_cone"] as ModelName[],
  bush: ["nat-plant_bush", "nat-plant_bushLarge", "nat-plant_bushDetailed"] as ModelName[],
};

/** Warm, sun-washed facade tints (multiplied onto white walls). */
export const FACADE = [0xffffff, 0xfff1dc, 0xffe3c8, 0xffd9c2, 0xe4f1ea, 0xdcebf5, 0xf6e6b8, 0xf3d6d0, 0xe9e2f2];
/** Downtown's low blocks: warm terracotta, so the teal letters stand out against them. */
export const DOWNTOWN = [0xe9b597, 0xdfa587, 0xf2c6a6, 0xd8ab8c, 0xeec09a];
/** The name's towers while they spell it. */
export const LETTER_TINT = 0x3fc4c8;
export const ROOF_HOUSE = [0xffffff, 0xffd0b0, 0xffb38f, 0xfff0c0, 0xd9f0ff, 0xe8ffd9];
export const TREE_TINT = [0xc9f0b4, 0xb8e6a0, 0xd6f2a8, 0xa9dd9c, 0xe0eaa0, 0xf2d79a];

export const SCALE = { building: 1, house: 0.85, industry: 1, tree: 0.55, car: 0.2, container: 0.7 };

export function footprint(p: { m: AnyModel; ry: number; s: number }) {
  const [w, , d] = MODELS[p.m as ModelName]?.size ?? [1, 1, 1];
  const quarter = Math.abs(Math.sin(p.ry)) > 0.5;
  return { w: (quarter ? d : w) * p.s, d: (quarter ? w : d) * p.s };
}
export const modelHeight = (m: ModelName, s: number) => MODELS[m].size[1] * s;

function distToSegment(px: number, pz: number, x1: number, z1: number, x2: number, z2: number) {
  const dx = x2 - x1, dz = z2 - z1;
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (pz - z1) * dz) / (dx * dx + dz * dz || 1)));
  return Math.hypot(x1 + dx * t - px, z1 + dz * t - pz);
}

/** Coarse occupancy so trees and props never land on roads or buildings. */
class Occupancy {
  static C = 0.5;
  nx = Math.ceil((GROUND.maxX - GROUND.minX) / Occupancy.C);
  nz = Math.ceil((GROUND.maxZ - GROUND.minZ) / Occupancy.C);
  cells = new Uint8Array(this.nx * this.nz);
  private idx(x: number, z: number) {
    const i = Math.floor((x - GROUND.minX) / Occupancy.C), k = Math.floor((z - GROUND.minZ) / Occupancy.C);
    return i < 0 || k < 0 || i >= this.nx || k >= this.nz ? -1 : k * this.nx + i;
  }
  mark(x0: number, z0: number, x1: number, z1: number) {
    for (let x = Math.min(x0, x1); x <= Math.max(x0, x1) + 1e-6; x += Occupancy.C / 2)
      for (let z = Math.min(z0, z1); z <= Math.max(z0, z1) + 1e-6; z += Occupancy.C / 2) {
        const i = this.idx(x, z);
        if (i >= 0) this.cells[i] = 1;
      }
  }
  free(x: number, z: number, r = 0) {
    for (const [ox, oz] of [[0, 0], [r, 0], [-r, 0], [0, r], [0, -r]]) {
      const i = this.idx(x + ox, z + oz);
      if (i < 0 || this.cells[i]) return false;
    }
    return true;
  }
}

export const inDistrict = (x: number, z: number, pad = 0) => DISTRICT_LIST.find((d) => inSite(d, x, z, pad)) ?? null;

export type CityData = {
  title: TitleShape;
  towers: TitleTower[];
  /** Static models: blocks, suburbs, countryside, street furniture. */
  placements: Placement[];
  /** Where trees went (for the fallback map). */
  occupancy: Occupancy;
};

/**
 * @param density 1 on desktop; phones pass less so far suburbs and the
 *   countryside thin out.
 */
export function buildCity(layout: TitleLayout, density = 1): CityData {
  const rand = mulberry32(4242);
  const pick = <T,>(arr: readonly T[]) => arr[Math.floor(rand() * arr.length) % arr.length];
  const title = buildTitle(layout);
  const occ = new Occupancy();
  const placements: Placement[] = [];
  const put = (p: Placement, mark = true) => {
    placements.push(p);
    if (mark) {
      const f = footprint(p);
      occ.mark(p.x - f.w / 2, p.z - f.d / 2, p.x + f.w / 2, p.z + f.d / 2);
    }
  };

  // Roads (and their sidewalks) are never built on.
  for (const [x1, z1, x2, z2, w] of ROADS) {
    const h = w / 2 + SIDEWALK;
    occ.mark(Math.min(x1, x2) - h, Math.min(z1, z2) - h, Math.max(x1, x2) + h, Math.max(z1, z2) + h);
  }
  // Districts build their own scenes; the process block is its own scene too.
  for (const d of DISTRICT_LIST) occ.mark(d.x0, d.z0, d.x1, d.z1);
  occ.mark(PROCESS_BLOCK.minX, PROCESS_BLOCK.minZ, PROCESS_BLOCK.maxX, PROCESS_BLOCK.maxZ);
  // The river.
  for (let i = 0; i < RIVER_CITY.length - 1; i++) {
    const [ax, az] = RIVER_CITY[i], [bx, bz] = RIVER_CITY[i + 1];
    for (let t = 0; t <= 1; t += 0.05) occ.mark(ax + (bx - ax) * t - 2.4, az + (bz - az) * t - 2.4, ax + (bx - ax) * t + 2.4, az + (bz - az) * t + 2.4);
  }
  // The sea and the railway.
  occ.mark(COAST_X - 1.2, GROUND.minZ, GROUND.maxX, GROUND.maxZ);
  occ.mark(RAIL_X - 0.9, GROUND.minZ, RAIL_X + 0.9, GROUND.maxZ);

  /* --- Downtown: a dense grid of slim towers; the ones on the strokes spell the name. */
  const towers: TitleTower[] = [];
  const P = 0.5;
  for (let x = title.minX; x <= title.maxX; x += P) {
    for (let z = title.minZ; z <= title.maxZ; z += P) {
      const d = strokeDistance(title, x, z);
      const letter = d < 0.34;
      if (!letter && rand() > 0.62) continue;
      const seed = rand();
      towers.push({
        m: pick(SETS.low),
        x,
        z,
        ry: Math.floor(rand() * 4) * (Math.PI / 2),
        letter,
        h: letter ? 0.6 + seed * 1.5 : 0.12 + seed * 0.32,
        letterH: letter ? 2.5 + seed * 0.3 : 0,
        seed,
        tint: letter ? pick(FACADE) : pick(DOWNTOWN),
      });
    }
  }
  occ.mark(title.minX, title.minZ, title.maxX, title.maxZ);

  /* --- Core blocks: buildings around each block's edge, facing the streets; a courtyard inside. */
  const xs = [-SIDE_X, 0, SIDE_X];
  const halfW = (x: number) => (x === 0 ? AVENUE_W / 2 : 0.55) + SIDEWALK;
  for (let zi = 0; zi < Z_STREETS.length - 1; zi++) {
    const zTop = Z_STREETS[zi], zBot = Z_STREETS[zi + 1];
    for (let xi = 0; xi < xs.length - 1; xi++) {
      const x0 = xs[xi] + halfW(xs[xi]), x1 = xs[xi + 1] - halfW(xs[xi + 1]);
      const z1 = zTop - 0.5 - SIDEWALK, z0 = zBot + 0.5 + SIDEWALK;
      if (xi === 1 && zTop === 28) continue; // the process block
      const midZ = (zTop + zBot) / 2;
      // Taller toward downtown and the markets; mid-rise in between.
      const tallness = Math.max(0, (midZ - 6) / 30) + Math.max(0, (-midZ - 36) / 14);
      fillBlockEdges(x0, z0, x1, z1, tallness);
    }
  }
  function fillBlockEdges(x0: number, z0: number, x1: number, z1: number, tallness: number) {
    const choose = () => (rand() < 0.15 + tallness * 0.55 ? pick(SETS.tall) : pick(SETS.mid));
    // north (faces −z street) and south (faces +z street) edges run the full width
    for (const [zEdge, ry, dir] of [
      [z1, 0, -1],
      [z0, Math.PI, 1],
    ] as const) {
      let cx = x0;
      while (cx < x1 - 0.5) {
        const m = choose();
        const p: Placement = { m, x: 0, z: 0, ry, s: SCALE.building, tint: pick(FACADE) };
        const f = footprint(p);
        if (cx + f.w > x1 + 0.05) break;
        p.x = cx + f.w / 2;
        p.z = zEdge + (dir * f.d) / 2;
        put(p);
        cx += f.w + 0.04;
      }
    }
    // west/east edges fill what's left between them
    const inner0 = z0 + 1.45, inner1 = z1 - 1.45;
    for (const [xEdge, ry, dir] of [
      [x0, -Math.PI / 2, 1],
      [x1, Math.PI / 2, -1],
    ] as const) {
      let cz = inner0;
      while (cz < inner1 - 0.5) {
        const m = choose();
        const p: Placement = { m, x: 0, z: 0, ry, s: SCALE.building, tint: pick(FACADE) };
        const f = footprint(p);
        if (cz + f.d > inner1 + 0.05) break;
        p.z = cz + f.d / 2;
        p.x = xEdge + (dir * f.w) / 2;
        if (occ.free(p.x, p.z)) put(p);
        cz += f.d + 0.04;
      }
    }
    // courtyard trees
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    for (let k = 0; k < 4; k++) {
      const x = cx + (rand() - 0.5) * (x1 - x0 - 2.6), z = cz + (rand() - 0.5) * (z1 - z0 - 3.2);
      if (occ.free(x, z, 0.2)) put({ m: pick(SETS.tree), x, z, ry: rand() * 6.28, s: SCALE.tree * (0.75 + rand() * 0.4), tint: pick(TREE_TINT) });
    }
  }

  /* --- Along the side avenues' outer faces, and the boulevard: shops and offices. */
  for (const side of [-1, 1]) {
    const xEdge = side * (SIDE_X + halfW(SIDE_X));
    let cz = BOULEVARD_Z - 0.6 - SIDEWALK;
    while (cz > -60 + 1) {
      const m = rand() < 0.3 ? pick(SETS.tall) : pick(SETS.mid);
      const p: Placement = { m, x: 0, z: 0, ry: side > 0 ? -Math.PI / 2 : Math.PI / 2, s: SCALE.building, tint: pick(FACADE) };
      const f = footprint(p);
      p.z = cz - f.d / 2;
      p.x = xEdge + (side * f.w) / 2;
      if (occ.free(p.x - side * 0.1, p.z, f.d / 2 - 0.1) && occ.free(p.x + (side * f.w) / 2 - side * 0.1, p.z)) put(p);
      cz -= f.d + 0.05;
    }
  }
  // north side of the boulevard, between the title and the street
  {
    let cx = -RING_X + 1.2;
    const zEdge = BOULEVARD_Z + 0.6 + SIDEWALK;
    while (cx < RING_X - 1.2) {
      const m = pick(SETS.mid);
      const p: Placement = { m, x: 0, z: 0, ry: Math.PI, s: SCALE.building, tint: pick(FACADE) };
      const f = footprint(p);
      p.x = cx + f.w / 2;
      p.z = zEdge + f.d / 2;
      if (occ.free(p.x, p.z, Math.min(f.w, f.d) / 2 - 0.05)) put(p);
      cx += f.w + 0.06;
    }
  }

  /* --- Suburbs: houses along the lanes and the ring road, gardens and trees. */
  for (const [x1, z1, x2, z2, , kind] of ROADS) {
    const horizontal = z1 === z2;
    const isLane = kind === "lane" || (horizontal && (z1 === BOULEVARD_Z || z1 === -60));
    const isRing = !horizontal && Math.abs(x1) === RING_X;
    if (!isLane && !isRing) continue;
    const len = horizontal ? Math.abs(x2 - x1) : Math.abs(z2 - z1);
    const dir = horizontal ? Math.sign(x2 - x1) : Math.sign(z2 - z1);
    for (const side of [-1, 1]) {
      if (isRing && side === Math.sign(x1) && x1 > 0) continue; // the coast side of the east ring road
      let t = 1.2;
      while (t < len - 1) {
        const m = pick(SETS.house);
        const ry = horizontal ? (side > 0 ? Math.PI : 0) : side > 0 ? -Math.PI / 2 : Math.PI / 2;
        const p: Placement = { m, x: 0, z: 0, ry, s: SCALE.house, tint: pick(ROOF_HOUSE) };
        const f = footprint(p);
        const along = t + (horizontal ? f.w : f.d) / 2;
        const off = 0.5 + SIDEWALK + 0.35 + (horizontal ? f.d : f.w) / 2;
        if (horizontal) {
          p.x = x1 + dir * along;
          p.z = z1 + side * off;
        } else {
          p.z = z1 + dir * along;
          p.x = x1 + side * off;
        }
        // Phones: fewer houses far from the avenue.
        const far = Math.abs(p.x) > 16;
        if (occ.free(p.x, p.z, Math.min(f.w, f.d) / 2) && (!far || rand() < density)) {
          put(p);
          // a garden tree or two behind the house
          const bx = horizontal ? p.x + (rand() - 0.5) * 0.6 : p.x + side * (f.w / 2 + 0.45);
          const bz = horizontal ? p.z + side * (f.d / 2 + 0.45) : p.z + (rand() - 0.5) * 0.6;
          if (occ.free(bx, bz, 0.2)) put({ m: pick(SETS.tree), x: bx, z: bz, ry: rand() * 6.28, s: SCALE.tree * (0.7 + rand() * 0.45), tint: pick(TREE_TINT) });
        }
        t += (horizontal ? f.w : f.d) + 0.35 + rand() * 0.6;
      }
    }
  }

  /* --- Countryside west of the ring road and parks north of the name: trees in clumps. */
  const scatter = (x0: number, z0: number, x1: number, z1: number, count: number, set: readonly ModelName[], clump = 0.5) => {
    let placed = 0;
    for (let k = 0; k < count * 3 && placed < count; k++) {
      const x = x0 + rand() * (x1 - x0), z = z0 + rand() * (z1 - z0);
      // clumps: thin out where low-frequency noise is low
      const n = Math.sin(x * 0.21 + Math.cos(z * 0.17) * 2) * Math.cos(z * 0.13 - x * 0.05);
      if (n < clump - 0.9 && rand() < 0.85) continue;
      if (!occ.free(x, z, 0.25) || inDistrict(x, z, 1)) continue;
      put({ m: pick(set), x, z, ry: rand() * 6.28, s: SCALE.tree * (0.8 + rand() * 0.6), tint: pick(TREE_TINT) });
      placed++;
    }
  };
  const d = density;
  // suburb gaps (between lanes)
  scatter(-RING_X + 0.8, -60, -SIDE_X - 1, BOULEVARD_Z, Math.round(160 * d), SETS.tree, 0.6);
  scatter(SIDE_X + 1, -60, RING_X - 0.8, BOULEVARD_Z, Math.round(140 * d), SETS.tree, 0.6);
  // north parks around the name and the hills beyond
  scatter(-40, BOULEVARD_Z + 1, -title.maxX - 0.6, 64, Math.round(110 * d), SETS.tree, 0.2);
  scatter(-title.minX + 0.6, BOULEVARD_Z + 1, 29, 64, Math.round(90 * d), SETS.tree, 0.2);
  scatter(-40, title.maxZ + 0.8, 29, 72, Math.round(150 * d), SETS.tree, 0.2);
  // west: woods beyond the railway, copses between the fields
  scatter(-62, -90, RAIL_X - 1.2, 80, Math.round(320 * d), SETS.pine, 0.1);
  scatter(RAIL_X + 1.2, -70, -RING_X - 0.8, 60, Math.round(70 * d), SETS.tree, 0.7);
  // south: forest past the end of the avenue
  scatter(-RING_X, -92, COAST_X - 1.5, -62, Math.round(260 * d), SETS.pine, 0.1);

  /* --- Street lights along the avenue. */
  for (let z = BOULEVARD_Z - 3; z > AVENUE_END + 2; z -= 4) {
    for (const side of [-1, 1]) {
      const x = side * (AVENUE_W / 2 + 0.12);
      put({ m: "road-light-curved", x, z, ry: side > 0 ? Math.PI / 2 : -Math.PI / 2, s: 0.9 }, false);
    }
  }

  return { title, towers, placements, occupancy: occ };
}

/* ------------------------------------------------------------------ */
/* Movement                                                           */
/* ------------------------------------------------------------------ */

/** Traffic keeps left (as in India): southbound on the avenue's west half. */
export const LANE = 0.4;
