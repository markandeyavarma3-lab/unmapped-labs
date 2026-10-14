/**
 * "UNMAPPED LABS" as landforms. A tiny stroke alphabet (polylines on a 4×6
 * grid) is laid out on the ground plane; terrain height near a stroke rises
 * into a flat-topped ridge, so the name becomes a mesa range that contour
 * lines wrap around. Pure maths — shared by the mesh, mini-map and fallback.
 */

type Pt = [number, number];
type Glyph = { w: number; strokes: Pt[][] };

const G: Record<string, Glyph> = {
  U: { w: 4, strokes: [[[0, 6], [0, 1.6], [0.45, 0.55], [1.25, 0], [2.75, 0], [3.55, 0.55], [4, 1.6], [4, 6]]] },
  N: { w: 4, strokes: [[[0, 0], [0, 6], [4, 0], [4, 6]]] },
  M: { w: 4.6, strokes: [[[0, 0], [0, 6], [2.3, 2.4], [4.6, 6], [4.6, 0]]] },
  A: { w: 4.2, strokes: [[[0, 0], [2.1, 6], [4.2, 0]], [[0.85, 2.3], [3.35, 2.3]]] },
  P: { w: 4, strokes: [[[0, 0], [0, 6], [2.8, 6], [3.65, 5.5], [4, 4.6], [3.65, 3.6], [2.8, 3.1], [0, 3.1]]] },
  E: { w: 3.6, strokes: [[[3.6, 6], [0, 6], [0, 0], [3.6, 0]], [[0, 3.05], [2.8, 3.05]]] },
  D: { w: 4, strokes: [[[0, 0], [0, 6], [2.1, 6], [3.3, 5.35], [4, 4.1], [4, 1.9], [3.3, 0.65], [2.1, 0], [0, 0]]] },
  L: { w: 3.4, strokes: [[[0, 6], [0, 0], [3.4, 0]]] },
  B: {
    w: 4,
    strokes: [
      [[0, 0], [0, 6], [2.6, 6], [3.4, 5.6], [3.7, 4.75], [3.4, 3.55], [2.6, 3.1], [0, 3.1]],
      [[2.6, 3.1], [3.6, 2.6], [4, 1.6], [3.6, 0.5], [2.7, 0], [0, 0]],
    ],
  },
  S: {
    w: 4,
    strokes: [
      [
        [3.9, 5.1], [3.3, 5.8], [2.3, 6], [1.4, 6], [0.45, 5.6], [0.05, 4.7], [0.45, 3.65], [1.45, 3.15],
        [2.6, 2.9], [3.6, 2.4], [4, 1.4], [3.6, 0.4], [2.6, 0], [1.4, 0], [0.5, 0.3], [0, 0.95],
      ],
    ],
  },
};

export type Seg = [number, number, number, number]; // x1 z1 x2 z2 in world units

export type TitleLayout = "line" | "stacked";

/** World-space rectangle that holds the title, and its strokes as segments. */
export type TitleShape = { segs: Seg[]; minX: number; maxX: number; minZ: number; maxZ: number };

/** Title sits at the start of the journey; letters "read" for a camera looking toward −z. */
export const TITLE_CENTER = { x: 0, z: 47 };
const SCALE_X = 0.5; // glyph units → world (x)
const SCALE_Z = 0.95; // glyph height stretched in z to offset the camera's foreshortening
const ADVANCE = 1.4; // gap between letters, glyph units
const SPACE = 3.4;

function layoutLine(text: string, originX: number, originZ: number): Seg[] {
  const segs: Seg[] = [];
  let cursor = 0;
  for (const ch of text) {
    if (ch === " ") {
      cursor += SPACE;
      continue;
    }
    const g = G[ch];
    for (const stroke of g.strokes) {
      for (let i = 0; i < stroke.length - 1; i++) {
        const [ax, ay] = stroke[i];
        const [bx, by] = stroke[i + 1];
        // glyph +y points "up" the page, which is −z in the world
        segs.push([originX + (cursor + ax) * SCALE_X, originZ - ay * SCALE_Z, originX + (cursor + bx) * SCALE_X, originZ - by * SCALE_Z]);
      }
    }
    cursor += g.w + ADVANCE;
  }
  return segs;
}

function lineWidth(text: string) {
  let w = 0;
  for (const ch of text) w += ch === " " ? SPACE : G[ch].w + ADVANCE;
  return (w - ADVANCE) * SCALE_X;
}

export function buildTitle(layout: TitleLayout): TitleShape {
  const H = 6 * SCALE_Z;
  let segs: Seg[];
  if (layout === "line") {
    const text = "UNMAPPED LABS";
    const w = lineWidth(text);
    segs = layoutLine(text, TITLE_CENTER.x - w / 2, TITLE_CENTER.z + H / 2);
  } else {
    const gap = 2.2;
    const w1 = lineWidth("UNMAPPED");
    const w2 = lineWidth("LABS");
    const top = TITLE_CENTER.z - gap / 2; // first line further away (−z)
    segs = [
      ...layoutLine("UNMAPPED", TITLE_CENTER.x - w1 / 2, top),
      ...layoutLine("LABS", TITLE_CENTER.x - w2 / 2, top + H + gap),
    ];
  }
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const [x1, z1, x2, z2] of segs) {
    minX = Math.min(minX, x1, x2);
    maxX = Math.max(maxX, x1, x2);
    minZ = Math.min(minZ, z1, z2);
    maxZ = Math.max(maxZ, z1, z2);
  }
  const pad = 2.2;
  return { segs, minX: minX - pad, maxX: maxX + pad, minZ: minZ - pad, maxZ: maxZ + pad };
}

/** Distance from (x, z) to the nearest stroke. */
export function strokeDistance(shape: TitleShape, x: number, z: number) {
  let best = Infinity;
  for (const [x1, z1, x2, z2] of shape.segs) {
    const dx = x2 - x1, dz = z2 - z1;
    const len2 = dx * dx + dz * dz || 1;
    let t = ((x - x1) * dx + (z - z1) * dz) / len2;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const ex = x1 + dx * t - x, ez = z1 + dz * t - z;
    const d = ex * ex + ez * ez;
    if (d < best) best = d;
  }
  return Math.sqrt(best);
}

export const LETTER_HEIGHT = 2.6;
const INNER = 0.2; // flat mesa top half-width
const OUTER = 0.62; // where the slope meets the ground

/** Letter relief at (x, z): 0 off the strokes, LETTER_HEIGHT on the mesa tops. */
export function letterHeight(shape: TitleShape, x: number, z: number) {
  if (x < shape.minX || x > shape.maxX || z < shape.minZ || z > shape.maxZ) return 0;
  const d = strokeDistance(shape, x, z);
  if (d >= OUTER) return 0;
  const t = 1 - Math.min(1, Math.max(0, (d - INNER) / (OUTER - INNER)));
  return LETTER_HEIGHT * t * t * (3 - 2 * t);
}

/** 0 inside the title plate, easing to 1 outside — flattens the ground under the letters. */
export function titleFlatten(shape: TitleShape, x: number, z: number) {
  const m = 3;
  const dx = Math.max(shape.minX - x, 0, x - shape.maxX);
  const dz = Math.max(shape.minZ - z, 0, z - shape.maxZ);
  const d = Math.hypot(dx, dz);
  const t = Math.min(1, d / m);
  return 0.25 + 0.75 * t * t * (3 - 2 * t);
}
