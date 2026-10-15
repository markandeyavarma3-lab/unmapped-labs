import { terrainHeight, valleyX } from "./terrain-math";
import { TITLE_CENTER } from "./title-glyphs";

type V3 = [number, number, number];
const vx = valleyX;

/**
 * The journey. One camera keyframe per chapter; page sections anchor chapter
 * numbers with `data-chapter`. The camera glides between keyframes as you scroll.
 */
export const CHAPTER = {
  title: 0,
  tagline: 1,
  hero: 2,
  intro: 3,
  approach: 4,
  territoryA: 5,
  territoryB: 6,
  territoryC: 7,
  territoryD: 8,
  territoryE: 9,
  workA: 10,
  workB: 11,
  services: 12,
  notes: 13,
  philosophy: 14,
  about: 15,
  contact: 16,
} as const;
export const LAST_CHAPTER = 16;

/** The land dissolves into the systems network across this chapter range. */
export const DISSOLVE = { from: 11.35, to: 12.05 } as const;
/** Centre of the systems network the land becomes. */
export const NETWORK_CENTER: V3 = [0, 9, -46];

/* ---- Focus territories: regions of the map with their own settlements ---- */

export type TerritoryId = "agriculture" | "logistics" | "healthcare" | "energy" | "open";
export type Territory = { id: TerritoryId; x: number; z: number; y: number; side: 1 | -1 };

const territory = (id: TerritoryId, z: number, offset: number): Territory => {
  const x = vx(z) + offset;
  return { id, x, z, y: terrainHeight(x, z), side: offset > 0 ? 1 : -1 };
};

export const TERRITORIES: Territory[] = [
  territory("agriculture", -6, 10),
  territory("logistics", -18, -10),
  territory("healthcare", -30, 10),
  territory("energy", -42, -10),
  territory("open", -56, 11),
];

/* ---- Selected work: two more mapped regions at the far end of the valley ---- */

export type WorkSiteId = "flowmatch" | "deal-lens";
export type WorkSite = { id: WorkSiteId; x: number; z: number; y: number; side: 1 | -1 };
const site = (id: WorkSiteId, z: number, offset: number): WorkSite => {
  const x = vx(z) + offset;
  return { id, x, z, y: terrainHeight(x, z), side: offset > 0 ? 1 : -1 };
};
export const WORK_SITES: WorkSite[] = [site("flowmatch", -66, -9), site("deal-lens", -76, 9)];

const overlook = (t: Territory): { pos: V3; target: V3 } => ({
  pos: [t.x - t.side * 7.5, t.y + 8.5, t.z + 11],
  target: [t.x, t.y + 0.5, t.z],
});

export const CAMERA_KEYS: { pos: V3; target: V3 }[] = [
  /* 0 title    */ { pos: [TITLE_CENTER.x, 22, 76], target: [TITLE_CENTER.x, 0, 49] },
  /* 1 tagline  */ { pos: [TITLE_CENTER.x, 19, 78], target: [TITLE_CENTER.x, 0, 52] },
  /* 2 hero     */ { pos: [vx(34) - 5, 8.2, 34], target: [vx(10) - 6.5, 0.4, 10] },
  /* 3 intro    */ { pos: [vx(22) + 4, 6, 22], target: [vx(3) - 1, 0.2, 3] },
  /* 4 approach */ { pos: [vx(8) - 2, 4.2, 8], target: [vx(-8), 0.6, -8] },
  /* 5–9 territories */
  ...TERRITORIES.map(overlook),
  /* 10–11 selected work */
  ...WORK_SITES.map((w) => ({
    pos: [w.x - w.side * 8, w.y + 7.5, w.z + 10] as V3,
    target: [w.x, w.y + 0.6, w.z] as V3,
  })),
  /* 12–16: the systems network the land has become */
  /* 12 services   */ { pos: [NETWORK_CENTER[0] + 5, NETWORK_CENTER[1] + 14, NETWORK_CENTER[2] + 23], target: NETWORK_CENTER },
  /* 13 notes      */ { pos: [NETWORK_CENTER[0] + 24, NETWORK_CENTER[1] + 6, NETWORK_CENTER[2] + 16], target: NETWORK_CENTER },
  /* 14 philosophy — inside the layers */ { pos: [NETWORK_CENTER[0] + 9, NETWORK_CENTER[1] - 1, NETWORK_CENTER[2] + 8], target: [NETWORK_CENTER[0], NETWORK_CENTER[1] + 1, NETWORK_CENTER[2]] },
  /* 15 about — above the whole system */ { pos: [NETWORK_CENTER[0] - 6, NETWORK_CENTER[1] + 30, NETWORK_CENTER[2] + 12], target: NETWORK_CENTER },
  /* 16 contact — pull back: everything connected */ { pos: [NETWORK_CENTER[0] - 20, NETWORK_CENTER[1] + 10, NETWORK_CENTER[2] + 36], target: NETWORK_CENTER },
];

/** Portrait screens frame the stacked title from higher up. */
export const PORTRAIT_TITLE_KEYS: { pos: V3; target: V3 }[] = [
  { pos: [TITLE_CENTER.x, 36, 78], target: [TITLE_CENTER.x, 0, 49] },
  { pos: [TITLE_CENTER.x, 33, 80], target: [TITLE_CENTER.x, 0, 52] },
];

/* ---- Fog of war: survey discs that open as the journey reaches them ---- */

export type SurveyDisc = { x: number; z: number; r: number; from: number; to: number };

export const SURVEY_DISCS: SurveyDisc[] = [
  { x: TITLE_CENTER.x, z: TITLE_CENTER.z, r: 25, from: 0.15, to: 1.0 },
  { x: vx(10) - 6.5, z: 10, r: 22, from: 1.3, to: 2.4 },
  { x: vx(3), z: 3, r: 19, from: 2.3, to: 3.4 },
  { x: vx(-8), z: -8, r: 18, from: 3.3, to: 4.4 },
  ...TERRITORIES.slice(0, 4).map((t, i) => ({ x: t.x, z: t.z, r: 15, from: 4.5 + i, to: 5.4 + i })),
  ...WORK_SITES.map((w, i) => ({ x: w.x, z: w.z, r: 15, from: 9.5 + i, to: 10.4 + i })),
];

/** The corner that stays unmapped — "there is always more to map". */
export const UNMAPPED_HOLD = { x: TERRITORIES[4].x, z: TERRITORIES[4].z, r: 11 };

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Current radius of each disc for a (float) chapter. */
export const discRadius = (d: SurveyDisc, chapter: number) => d.r * smooth(d.from, d.to, chapter);

/* ---- Survey nodes and discovery paths (along the valley) ---- */

export type SurveyNode = { id: string; label?: string; x: number; z: number; y: number };

const node = (id: string, x: number, z: number, label?: string): SurveyNode => ({ id, label, x, z, y: terrainHeight(x, z) });

export const NODES: SurveyNode[] = [
  node("n0", vx(30) - 8, 30),
  node("observe", vx(24) + 3.5, 24, "Observe"),
  node("investigate", vx(16) - 4.5, 16, "Investigate"),
  node("connect", vx(8) + 5, 8, "Connect"),
  node("discover", vx(-3) - 3, -3, "Discover"),
  node("understand", vx(-16) + 4, -16, "Understand"),
  node("n6", vx(-28) - 5, -28),
  node("n7", vx(-39) + 6, -39),
];

export const PATHS: { from: string; to: string; span: [number, number]; seed: number }[] = [
  { from: "n0", to: "observe", span: [1.5, 2.4], seed: 1 },
  { from: "observe", to: "investigate", span: [2.2, 3.2], seed: 2 },
  { from: "investigate", to: "connect", span: [3.0, 4.0], seed: 3 },
  { from: "connect", to: "discover", span: [3.8, 5.4], seed: 4 },
  { from: "discover", to: "understand", span: [5.4, 7.0], seed: 5 },
  { from: "understand", to: "n6", span: [7.0, 8.5], seed: 6 },
  { from: "n6", to: "n7", span: [8.5, 10.2], seed: 7 },
  { from: "investigate", to: "discover", span: [9.4, 11], seed: 8 },
];

export const nodeById = (id: string) => {
  const n = NODES.find((n) => n.id === id);
  if (!n) throw new Error(`Unknown survey node ${id}`);
  return n;
};
