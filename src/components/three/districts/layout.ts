import { COAST_X, DISTRICTS } from "../city-layout";

/**
 * Where everything sits on each large site, in world units. Pure data:
 * the scenes, the ground painter and the traffic all read it.
 *
 *   farm      — drip-irrigated blocks (north), packhouse + harvest field (middle),
 *               pump station + reservoir (south-east)
 *   yard      — container blocks under gantry cranes, gate, distribution centre, quay
 *   hospital  — ward towers, emergency department, outpatient block, discharge lounge
 *   plant     — main incomer, production halls, furnaces, compressor house + air lines
 */

type XZ = [number, number];
type Rect = { x0: number; x1: number; z0: number; z1: number };

/* ---------------- Farm ---------------- */
const Fm = DISTRICTS.farms;
export const FARM = {
  /** The farm road in from the gate, and the track along its east side. */
  road: { z: 10, x0: Fm.x0 + 0.9, x1: Fm.x1 - 1.6, w: 0.8 },
  track: { x: -11.6, z0: Fm.z0 + 0.4, z1: Fm.z1 - 0.6, w: 0.7 },
  /** Four drip blocks; water enters each from its east edge (the manifold). */
  blocks: [
    { x0: -25.6, x1: -19.6, z0: 11.4, z1: 20.4 },
    { x0: -19.0, x1: -13.0, z0: 11.4, z1: 20.4 },
    { x0: -25.6, x1: -19.6, z0: 21.2, z1: 30.2 },
    { x0: -19.0, x1: -13.0, z0: 21.2, z1: 30.2 },
  ] as Rect[],
  rowGap: 0.45,
  /** The row the team measures, in block 1. */
  testRow: 16.0,
  field: { x0: -25.6, x1: -18.6, z0: -2.4, z1: 8.6 } as Rect,
  packhouse: [-16.0, 7.3] as XZ,
  precooler: [-13.1, 7.3] as XZ,
  /** Where harvested crates wait, in front of the packhouse. */
  apron: { x0: -17.6, x1: -13.4, z0: 3.6, z1: 5.6 } as Rect,
  reservoir: { x0: -17.6, x1: -14.4, z0: -2.4, z1: 0.9 } as Rect,
  pumpHouse: [-12.9, -1.0] as XZ,
  /** Borewells on the reservoir's north bank; each delivers south into it. */
  wells: [
    [-17.0, 1.7],
    [-15.8, 1.7],
    [-14.6, 1.7],
  ] as XZ[],
  /** The main from the reservoir up the track to the blocks. */
  main: { x: -12.6, z0: 0.9, z1: 30.2 },
};

/* ---------------- Yard ---------------- */
const Lg = DISTRICTS.logistics;
export const YARD = {
  gate: [12.4, 10] as XZ,
  road: { z: 10, x0: Lg.x0 + 1.4, x1: Lg.x1 - 0.6, w: 1.0 },
  /** Container blocks: rows run along x; 3 rows deep, up to 4 high. */
  blocks: [12.8, 16.4, 20.0, 23.6, 27.2],
  bays: { x0: 14.0, n: 17, pitch: 0.6 },
  rowPitch: 0.3,
  /** The block where the case plays (index into blocks) and the bay with the box the truck wants. */
  caseBlock: 2,
  caseBay: 8,
  warehouses: [
    [16.4, 3.6],
    [22.2, 3.6],
  ] as XZ[],
  quay: { x0: COAST_X - 2.4, x1: COAST_X + 4.6, z0: 12, z1: 28 },
  ship: [COAST_X + 6.4, 20] as XZ,
};
export const yardBlockZ = (k: number) => YARD.blocks[k];
export const yardBayX = (b: number) => YARD.bays.x0 + b * YARD.bays.pitch;

/* ---------------- Hospital ---------------- */
export const HOSPITAL = {
  tower: [-21.0, -21.6] as XZ,
  towerScale: 1.5,
  wards: [-21.2, -27.6] as XZ,
  opd: [-16.8, -11.2] as XZ,
  /** The forecourt where outpatients wait. */
  forecourt: { x0: -15.2, x1: -11.4, z0: -13.6, z1: -10.0 } as Rect,
  ed: [-14.8, -29.4] as XZ,
  /** Ambulances queue here, outside the emergency entrance. */
  bay: { z: -30, x0: -14.0, x1: -10.8 },
  lounge: [-14.4, -21.4] as XZ,
  /** A campus drive along the east side, from the outpatient gate to the emergency gate. */
  drive: { x: -12.0, z0: -30, z1: -14, w: 0.8 },
};
/** The helipad on the ward tower's roof. */
export const HELIPAD = { x: HOSPITAL.tower[0], y: 4.48 * HOSPITAL.towerScale + 0.01, z: HOSPITAL.tower[1] };

/* ---------------- Plant ---------------- */
export const PLANT = {
  incomer: [13.6, -12.6] as XZ,
  panel: [12.2, -14.2] as XZ,
  halls: [
    { m: "ind-building-l", at: [18.8, -15.8] as XZ, s: 2.0 },
    { m: "ind-building-a", at: [18.8, -22.2] as XZ, s: 2.0 },
    { m: "ind-building-e", at: [18.6, -27.4] as XZ, s: 1.9 },
  ],
  /** Four big machines (furnaces) that start with the shift. */
  furnaces: [
    [24.4, -13.2],
    [24.4, -16.4],
    [24.4, -19.6],
    [24.4, -22.8],
  ] as XZ[],
  compressorHouse: [13.4, -33.8] as XZ,
  compressors: [
    [12.0, -31.6],
    [13.2, -31.6],
    [14.4, -31.6],
  ] as XZ[],
  /** The compressed-air header and its branches (y = pipe height). */
  pipeY: 0.95,
  header: { z: -32.2, x0: 15.0, x1: 25.4 },
  branches: [16.8, 20.4, 24.2],
  branchTo: -25.4,
  pylons: [
    [25.4, -10.2],
    [22.4, -10.2],
    [19.4, -10.2],
    [16.4, -10.2],
  ] as XZ[],
};
/** Where the air leaks (on the header and branches). */
export const LEAKS: [number, number, number][] = [
  [16.0, PLANT.pipeY, PLANT.header.z],
  [18.3, PLANT.pipeY, PLANT.header.z],
  [21.6, PLANT.pipeY, PLANT.header.z],
  [23.4, PLANT.pipeY, PLANT.header.z],
  [16.8, PLANT.pipeY, -29.8],
  [20.4, PLANT.pipeY, -27.6],
  [20.4, PLANT.pipeY, -30.4],
  [24.2, PLANT.pipeY, -28.6],
  [24.2, PLANT.pipeY, -26.2],
  [16.8, PLANT.pipeY, -26.8],
];
/** Smoke rises from these (x, top y, z). */
export const CHIMNEYS: [number, number, number][] = [
  [23.6, 1.7 * 1.9, -37.4],
  [21.4, 1.7 * 1.6, -38.0],
  ...PLANT.furnaces.slice(0, 2).map(([x, z]) => [x, 0.66 * 0.9 + 0.75 * 0.9, z] as [number, number, number]),
];
/** Offshore wind, off the plant's coast. */
export const TURBINES = [0, 1, 2, 3, 4, 5, 6].map((i) => ({ x: COAST_X + 5 + (i % 2) * 4.5 + i * 0.6, z: -44 + i * 4.2, s: 3.0 }));
