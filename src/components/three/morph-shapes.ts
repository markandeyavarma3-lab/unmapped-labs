import { mulberry32, simplex2 } from "./terrain-math";

/**
 * Six particle formations for the Unknown → Build sequence. Every formation
 * has exactly `n` points so particle i can travel from shape to shape.
 * Units: roughly a 3.2-radius volume centred on the origin.
 */

export const MORPH_STAGES = 6;

type Out = Float32Array; // xyz * n

function gaussian(rand: () => number) {
  return Math.sqrt(-2 * Math.log(rand() + 1e-9)) * Math.cos(2 * Math.PI * rand());
}

/** 0 — Unknown: a loose, uneven cloud. Fragments with no shape. */
function unknown(n: number, rand: () => number, out: Out) {
  for (let i = 0; i < n; i++) {
    const u = rand() * 2 - 1;
    const a = rand() * Math.PI * 2;
    const r = 4.6 * Math.cbrt(rand());
    const s = Math.sqrt(1 - u * u);
    // clump a little so it reads as fragments, not fog
    const clump = simplex2(Math.cos(a) * 2, u * 2) * 0.5 + 0.5;
    const rr = r * (0.55 + 0.45 * clump);
    out.set([rr * s * Math.cos(a), rr * u * 0.7, rr * s * Math.sin(a)], i * 3);
  }
}

/** 1 — Observe: a survey radar — concentric rings, a sweep, a dense centre. */
function observe(n: number, rand: () => number, out: Out) {
  for (let i = 0; i < n; i++) {
    const k = rand();
    let x = 0, y = 0, z = 0;
    if (k < 0.08) {
      const r = 0.28 * Math.cbrt(rand());
      const a = rand() * Math.PI * 2;
      const u = rand() * 2 - 1;
      x = r * Math.sqrt(1 - u * u) * Math.cos(a);
      y = r * u;
      z = r * Math.sqrt(1 - u * u) * Math.sin(a);
    } else if (k < 0.24) {
      // sweep wedge
      const a = rand() * 0.55;
      const r = 0.35 + rand() * 3.0;
      x = r * Math.cos(a);
      z = r * Math.sin(a);
      y = (rand() - 0.5) * 0.04;
    } else {
      const ring = Math.floor(rand() * 6);
      const r = 0.55 + ring * 0.56 + gaussian(rand) * 0.015;
      const a = rand() * Math.PI * 2;
      x = r * Math.cos(a);
      z = r * Math.sin(a);
      y = (rand() - 0.5) * 0.03;
    }
    out.set([x, y, z], i * 3);
  }
}

/** 2 — Map: a topographic sheet — points lie on contour lines of a terrain patch. */
function map(n: number, rand: () => number, out: Out) {
  const h = (x: number, z: number) =>
    simplex2(x * 0.32 + 4.1, z * 0.32 - 2.3) * 0.9 + simplex2(x * 0.7 + 9, z * 0.7) * 0.35;
  let i = 0;
  while (i < n) {
    if (rand() < 0.05) {
      // the sheet's frame
      const t = rand() * 4;
      const side = Math.floor(t);
      const f = (t - side) * 6.4 - 3.2;
      const [x, z] = side === 0 ? [f, -3.2] : side === 1 ? [3.2, f] : side === 2 ? [f, 3.2] : [-3.2, f];
      out.set([x, 0, z], i++ * 3);
      continue;
    }
    const x = rand() * 6.4 - 3.2;
    const z = rand() * 6.4 - 3.2;
    const v = h(x, z);
    const f = (v * 5) % 1;
    const d = Math.abs((f < 0 ? f + 1 : f) - 0.5);
    if (d < 0.43) continue; // keep only points near a contour
    out.set([x, v * 0.85, z], i++ * 3);
  }
}

/** 3 — Understand: four strata separated, a probe through all of them. */
function understand(n: number, rand: () => number, out: Out) {
  const levels = [1.5, 0.5, -0.5, -1.5];
  for (let i = 0; i < n; i++) {
    if (rand() < 0.05) {
      out.set([gaussian(rand) * 0.02, rand() * 4 - 2, gaussian(rand) * 0.02], i * 3);
      continue;
    }
    const L = Math.floor(rand() * 4);
    const size = 2.9 - L * 0.25;
    const edge = rand() < 0.3; // crisp plate outlines
    let x: number, z: number;
    if (edge) {
      const t = rand() * 4;
      const side = Math.floor(t);
      const f = (t - side) * 2 * size - size;
      [x, z] = side === 0 ? [f, -size] : side === 1 ? [size, f] : side === 2 ? [f, size] : [-size, f];
    } else {
      x = (rand() * 2 - 1) * size;
      z = (rand() * 2 - 1) * size;
    }
    out.set([x, levels[L] + (rand() - 0.5) * 0.04, z], i * 3);
  }
}

/** 4 — Discover: a network — clustered nodes joined by drawn connections. */
function discover(n: number, rand: () => number, out: Out) {
  const nodes: [number, number, number][] = [];
  const count = 26;
  for (let k = 0; k < count; k++) {
    const y = 1 - (k / (count - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const a = k * 2.399963;
    const R = 2.5 + (rand() - 0.5) * 0.9;
    nodes.push([Math.cos(a) * r * R, y * R * 0.8, Math.sin(a) * r * R]);
  }
  const edges: [number, number][] = [];
  nodes.forEach((p, a) => {
    const near = nodes
      .map((q, b) => [b, Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2])] as const)
      .filter(([b]) => b !== a)
      .sort((x, y) => x[1] - y[1])
      .slice(0, 3);
    near.forEach(([b]) => {
      if (!edges.some(([x, y]) => (x === a && y === b) || (x === b && y === a))) edges.push([a, b]);
    });
  });
  for (let i = 0; i < n; i++) {
    if (rand() < 0.32) {
      const p = nodes[Math.floor(rand() * count)];
      out.set([p[0] + gaussian(rand) * 0.09, p[1] + gaussian(rand) * 0.09, p[2] + gaussian(rand) * 0.09], i * 3);
    } else {
      const [a, b] = edges[Math.floor(rand() * edges.length)];
      const t = rand();
      const p = nodes[a], q = nodes[b];
      out.set([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, p[2] + (q[2] - p[2]) * t], i * 3);
    }
  }
}

/** 5 — Build: a stepped structure of cubes, drawn by their edges. */
function build(n: number, rand: () => number, out: Out) {
  const s = 0.82;
  const gap = 0.14;
  const step = s + gap;
  const cubes: [number, number, number][] = [];
  const tiers = [3, 2, 1];
  tiers.forEach((w, level) => {
    const off = ((w - 1) * step) / 2;
    for (let a = 0; a < w; a++) for (let b = 0; b < w; b++) cubes.push([a * step - off, -1.15 + level * step, b * step - off]);
  });
  // extra foundation ring so the base reads as "ground"
  const corners = [
    [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
    [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1],
  ];
  const E = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
  for (let i = 0; i < n; i++) {
    const c = cubes[Math.floor(rand() * cubes.length)];
    const [a, b] = E[Math.floor(rand() * 12)];
    const t = rand();
    const h = s / 2;
    const p = corners[a], q = corners[b];
    out.set(
      [
        c[0] + (p[0] + (q[0] - p[0]) * t) * h,
        c[1] + (p[1] + (q[1] - p[1]) * t) * h,
        c[2] + (p[2] + (q[2] - p[2]) * t) * h,
      ],
      i * 3,
    );
  }
}

export function buildMorphShapes(n: number): Float32Array[] {
  const gens = [unknown, observe, map, understand, discover, build];
  return gens.map((g, i) => {
    const out = new Float32Array(n * 3);
    g(n, mulberry32(1000 + i * 77), out);
    return out;
  });
}
