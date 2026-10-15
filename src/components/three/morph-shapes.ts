import { mulberry32, simplex2 } from "./terrain-math";

/**
 * Six particle formations for the Unknown → Build sequence, told in the
 * city's own terms: dust → a farm → a truck route → a hospital → the power
 * grid → the whole city. Every formation has exactly `n` points so particle
 * i can travel from shape to shape. Units: roughly a 3.2-radius volume, the
 * ground at y = −1.1.
 */

export const MORPH_STAGES = 6;

type Out = Float32Array; // xyz * n
type V = [number, number, number];
type Rand = () => number;

const G = -1.1; // ground

/** A shape is a list of weighted samplers; points are spread by weight. */
type Sampler = { w: number; at: (r: Rand) => V };

function fill(n: number, rand: Rand, out: Out, parts: Sampler[]) {
  const total = parts.reduce((s, p) => s + p.w, 0);
  let i = 0;
  parts.forEach((p, k) => {
    const count = k === parts.length - 1 ? n - i : Math.round((p.w / total) * n);
    for (let c = 0; c < count && i < n; c++, i++) out.set(p.at(rand), i * 3);
  });
}

const jitter = (r: Rand, s: number) => (r() - 0.5) * s;
/** Points on the surface of a box resting on y0. */
const box = (cx: number, y0: number, cz: number, w: number, h: number, d: number, weight = 1): Sampler => ({
  w: (w * h * 2 + d * h * 2 + w * d) * weight,
  at: (r) => {
    const a = [w * h, w * h, d * h, d * h, w * d];
    let k = r() * (a[0] + a[1] + a[2] + a[3] + a[4]);
    let f = 0;
    while (k > a[f] && f < 4) k -= a[f++];
    const u = r() - 0.5, v = r();
    switch (f) {
      case 0: return [cx + u * w, y0 + v * h, cz + d / 2];
      case 1: return [cx + u * w, y0 + v * h, cz - d / 2];
      case 2: return [cx + w / 2, y0 + v * h, cz + u * d];
      case 3: return [cx - w / 2, y0 + v * h, cz + u * d];
      default: return [cx + u * w, y0 + h, cz + (v - 0.5) * d];
    }
  },
});
const line = (a: V, b: V, weight = 1, thick = 0.02): Sampler => ({
  w: Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) * weight,
  at: (r) => {
    const t = r();
    return [a[0] + (b[0] - a[0]) * t + jitter(r, thick), a[1] + (b[1] - a[1]) * t + jitter(r, thick), a[2] + (b[2] - a[2]) * t + jitter(r, thick)];
  },
});
const disc = (cx: number, y: number, cz: number, rad: number, weight = 1, ring = false): Sampler => ({
  w: rad * rad * 3 * weight,
  at: (r) => {
    const a = r() * Math.PI * 2, d = ring ? rad * (0.92 + r() * 0.08) : rad * Math.sqrt(r());
    return [cx + Math.cos(a) * d, y, cz + Math.sin(a) * d];
  },
});
const cyl = (cx: number, y0: number, cz: number, rad: number, h: number, weight = 1): Sampler => ({
  w: rad * h * 6 * weight,
  at: (r) => {
    const a = r() * Math.PI * 2;
    return [cx + Math.cos(a) * rad, y0 + r() * h, cz + Math.sin(a) * rad];
  },
});
const ball = (cx: number, cy: number, cz: number, rad: number, weight = 1): Sampler => ({
  w: rad * rad * 12 * weight,
  at: (r) => {
    const u = r() * 2 - 1, a = r() * Math.PI * 2, s = Math.sqrt(1 - u * u);
    return [cx + rad * s * Math.cos(a), cy + rad * u, cz + rad * s * Math.sin(a)];
  },
});

/** 0 — Unknown: dust. A loose, uneven cloud with no shape yet. */
function dust(n: number, rand: Rand, out: Out) {
  for (let i = 0; i < n; i++) {
    const u = rand() * 2 - 1;
    const a = rand() * Math.PI * 2;
    const r = 4.6 * Math.cbrt(rand());
    const s = Math.sqrt(1 - u * u);
    const clump = simplex2(Math.cos(a) * 2, u * 2) * 0.5 + 0.5;
    const rr = r * (0.55 + 0.45 * clump);
    out.set([rr * s * Math.cos(a), rr * u * 0.7, rr * s * Math.sin(a)], i * 3);
  }
}

/** 1 — Observe: a farm. Furrowed fields, a canal, a barn and silo, trees, the borewell. */
function farm(n: number, rand: Rand, out: Out) {
  const parts: Sampler[] = [];
  for (const [fx, fz] of [[-1.7, -1.1], [0.5, -1.1], [-1.7, 1.1], [0.5, 1.1]])
    for (let k = 0; k < 7; k++) parts.push(line([fx - 0.95, G, fz - 0.8 + k * 0.27], [fx + 0.95, G, fz - 0.8 + k * 0.27], 1.1, 0.03));
  parts.push(line([-2.9, G, 0], [1.7, G, 0], 2.2, 0.12)); // canal
  parts.push(box(2.4, G, -1.0, 1.1, 0.75, 0.8, 2.2), box(2.4, G + 0.75, -1.0, 1.1, 0.25, 0.8, 1.2)); // barn
  parts.push(cyl(2.4, G, 0.3, 0.28, 1.4, 1.6), disc(2.4, G + 1.4, 0.3, 0.28, 1.5));
  parts.push(cyl(1.9, G, 0.9, 0.06, 0.4, 2), box(1.9, G, 0.9, 0.3, 0.15, 0.3, 2)); // borewell
  for (const [tx, tz] of [[-2.9, -2.2], [-2.3, 2.3], [2.9, 1.8], [-3.1, 1.2], [1.6, 2.4]]) parts.push(ball(tx, G + 0.65, tz, 0.32, 1.3), line([tx, G, tz], [tx, G + 0.4, tz], 0.6));
  fill(n, rand, out, parts);
}

/** 2 — Map: a truck route. A winding road between two depots, trucks along it. */
function route(n: number, rand: Rand, out: Out) {
  const parts: Sampler[] = [];
  const pts: V[] = [];
  for (let i = 0; i <= 40; i++) {
    const t = i / 40;
    pts.push([-3 + t * 6, G, Math.sin(t * Math.PI * 1.6) * 1.3]);
  }
  for (let i = 0; i < pts.length - 1; i++) {
    const [a, b] = [pts[i], pts[i + 1]];
    for (const side of [-0.22, 0.22]) parts.push(line([a[0], G, a[2] + side], [b[0], G, b[2] + side], 1.2, 0.02));
    if (i % 2 === 0) parts.push(line(a, [(a[0] + b[0]) / 2, G, (a[2] + b[2]) / 2], 0.8, 0.015));
  }
  parts.push(box(-3.1, G, 0, 1.0, 0.7, 1.4, 1.6), box(3.1, G, 0, 1.0, 0.9, 1.6, 1.6)); // depots
  for (const t of [0.18, 0.38, 0.56, 0.74]) {
    const p = pts[Math.round(t * 40)];
    parts.push(box(p[0] - 0.12, G, p[2], 0.42, 0.28, 0.24, 2.4), box(p[0] + 0.2, G, p[2], 0.16, 0.24, 0.22, 2.4));
  }
  // dashed survey grid under it all
  for (let k = -2; k <= 2; k++) parts.push(line([-3.2, G - 0.02, k * 0.9], [3.2, G - 0.02, k * 0.9], 0.25, 0.01), line([k * 1.3, G - 0.02, -2], [k * 1.3, G - 0.02, 2], 0.25, 0.01));
  fill(n, rand, out, parts);
}

/** 3 — Understand: a hospital. A cross-plan block, the cross on its roof, a helipad, a queue at the door. */
function hospital(n: number, rand: Rand, out: Out) {
  const parts: Sampler[] = [
    box(0, G, 0, 3.2, 1.3, 1.1, 1),
    box(0, G, 0, 1.1, 1.3, 3.0, 1),
    box(0, G + 1.3, 0, 1.1, 0.9, 1.1, 1),
    box(0, G + 2.2, 0, 0.7, 0.05, 0.2, 3),
    box(0, G + 2.2, 0, 0.2, 0.05, 0.7, 3),
    disc(1.15, G + 1.32, 0, 0.42, 1.2, true),
    line([1.03, G + 1.33, -0.16], [1.03, G + 1.33, 0.16], 2),
    line([1.27, G + 1.33, -0.16], [1.27, G + 1.33, 0.16], 2),
    line([1.03, G + 1.33, 0], [1.27, G + 1.33, 0], 2),
  ];
  for (let k = 0; k < 9; k++) parts.push(cyl(0.3 + (k % 3) * 0.16, G, 1.75 + Math.floor(k / 3) * 0.2, 0.04, 0.16, 3));
  for (let k = 0; k < 4; k++) for (let row = 0; row < 3; row++) parts.push(line([-1.5 + k * 0.32, G + 0.3 + row * 0.35, 0.56], [-1.38 + k * 0.32, G + 0.3 + row * 0.35, 0.56], 0.5, 0.01));
  fill(n, rand, out, parts);
}

/** 4 — Discover: the power grid. Pylons and their cables, a wind turbine, a solar field. */
function grid(n: number, rand: Rand, out: Out) {
  const parts: Sampler[] = [];
  const pylonX = [-2.6, -1.0, 0.6];
  for (const x of pylonX) {
    for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) parts.push(line([x + sx * 0.25, G, -1.2 + sz * 0.25], [x + sx * 0.05, G + 1.9, -1.2 + sz * 0.05], 1.2));
    parts.push(line([x - 0.5, G + 1.55, -1.2], [x + 0.5, G + 1.55, -1.2], 1.4));
  }
  for (let i = 0; i < pylonX.length - 1; i++)
    for (const off of [-0.48, 0.48]) {
      const a = pylonX[i] + off, b = pylonX[i + 1] + off;
      for (let k = 0; k < 10; k++) {
        const t0 = k / 10, t1 = (k + 1) / 10;
        const y = (t: number) => G + 1.5 - Math.sin(t * Math.PI) * 0.25;
        parts.push(line([a + (b - a) * t0, y(t0), -1.2], [a + (b - a) * t1, y(t1), -1.2], 1.4, 0.01));
      }
    }
  // turbine
  parts.push(line([2.3, G, -0.6], [2.3, G + 2.4, -0.6], 2.2, 0.04), ball(2.3, G + 2.4, -0.55, 0.08, 3));
  for (let b = 0; b < 3; b++) {
    const a = (b / 3) * Math.PI * 2 + 0.3;
    parts.push(line([2.3, G + 2.4, -0.5], [2.3 + Math.cos(a) * 1.1, G + 2.4 + Math.sin(a) * 1.1, -0.5], 1.8, 0.03));
  }
  // solar field
  for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) parts.push(box(-2.2 + c * 0.8, G + 0.12, 0.6 + r * 0.6, 0.62, 0.02, 0.36, 2.5));
  fill(n, rand, out, parts);
}

/** 5 — Build: the city. Blocks of towers on a street grid. */
function city(n: number, rand: Rand, out: Out) {
  const parts: Sampler[] = [];
  const r = mulberry32(99);
  for (let gx = -3; gx <= 3; gx++)
    for (let gz = -2; gz <= 2; gz++) {
      if ((gx === 0 && gz === 0) || r() < 0.12) continue;
      const d = Math.hypot(gx, gz * 1.2);
      const h = 0.35 + Math.max(0, 2.6 - d * 0.75) * (0.6 + r() * 0.6);
      parts.push(box(gx * 0.85, G, gz * 0.85, 0.55, h, 0.55, 1));
    }
  parts.push(box(0, G, 0, 0.6, 3.2, 0.6, 1.2), line([0, G + 3.2, 0], [0, G + 3.7, 0], 1)); // the tallest, with a mast
  for (let k = -3; k <= 3; k++) parts.push(line([k * 0.85 + 0.425, G, -2.3], [k * 0.85 + 0.425, G, 2.3], 0.5, 0.02));
  for (let k = -2; k <= 2; k++) parts.push(line([-3.2, G, k * 0.85 + 0.425], [3.2, G, k * 0.85 + 0.425], 0.5, 0.02));
  fill(n, rand, out, parts);
}

export function buildMorphShapes(n: number): Float32Array[] {
  const fns = [dust, farm, route, hospital, grid, city];
  return fns.map((fn, i) => {
    const out = new Float32Array(n * 3);
    fn(n, mulberry32(1000 + i), out);
    // shuffle so neighbouring particles come from different parts of the next shape
    const r = mulberry32(77 + i);
    for (let k = n - 1; k > 0; k--) {
      const j = Math.floor(r() * (k + 1));
      for (let c = 0; c < 3; c++) {
        const t = out[k * 3 + c];
        out[k * 3 + c] = out[j * 3 + c];
        out[j * 3 + c] = t;
      }
    }
    return out;
  });
}
