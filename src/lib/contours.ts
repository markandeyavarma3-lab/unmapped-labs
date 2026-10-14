/**
 * Marching squares → SVG path data. Shared by the fallback-map generator and
 * the procedural note covers, so every surface speaks the same contour language.
 */

export type HeightFn = (u: number, v: number) => number; // u, v in [0, 1]

export function sampleField(fn: HeightFn, cols: number, rows: number) {
  const field: number[][] = [];
  let min = Infinity;
  let max = -Infinity;
  for (let r = 0; r <= rows; r++) {
    field[r] = [];
    for (let c = 0; c <= cols; c++) {
      const h = fn(c / cols, r / rows);
      field[r][c] = h;
      if (h < min) min = h;
      if (h > max) max = h;
    }
  }
  return { field, min, max };
}

export function contourPath(field: number[][], level: number, width: number, height: number): string {
  const rows = field.length - 1;
  const cols = field[0].length - 1;
  const cw = width / cols;
  const ch = height / rows;
  const segs: number[][] = [];
  const t = (a: number, b: number) => (level - a) / (b - a);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const tl = field[r][c], tr = field[r][c + 1], br = field[r + 1][c + 1], bl = field[r + 1][c];
      const idx = (tl > level ? 8 : 0) | (tr > level ? 4 : 0) | (br > level ? 2 : 0) | (bl > level ? 1 : 0);
      if (idx === 0 || idx === 15) continue;
      const x = c * cw, y = r * ch;
      const T = [x + cw * t(tl, tr), y];
      const R = [x + cw, y + ch * t(tr, br)];
      const B = [x + cw * t(bl, br), y + ch];
      const L = [x, y + ch * t(tl, bl)];
      const add = (a: number[], b: number[]) => segs.push([a[0], a[1], b[0], b[1]]);
      switch (idx) {
        case 1: case 14: add(L, B); break;
        case 2: case 13: add(B, R); break;
        case 3: case 12: add(L, R); break;
        case 4: case 11: add(T, R); break;
        case 5: add(L, T); add(B, R); break;
        case 6: case 9: add(T, B); break;
        case 7: case 8: add(L, T); break;
        case 10: add(T, R); add(L, B); break;
      }
    }
  }

  // Chain segments sharing endpoints into polylines to keep output small.
  const key = (x: number, y: number) => `${x.toFixed(1)},${y.toFixed(1)}`;
  const at = new Map<string, number[]>();
  segs.forEach((s, i) => {
    for (const k of [key(s[0], s[1]), key(s[2], s[3])]) {
      const list = at.get(k);
      if (list) list.push(i);
      else at.set(k, [i]);
    }
  });
  const used = new Uint8Array(segs.length);
  let d = "";
  for (let i = 0; i < segs.length; i++) {
    if (used[i]) continue;
    used[i] = 1;
    const pts = [[segs[i][0], segs[i][1]], [segs[i][2], segs[i][3]]];
    for (let grew = true; grew; ) {
      grew = false;
      const [ex, ey] = pts[pts.length - 1];
      for (const j of at.get(key(ex, ey)) ?? []) {
        if (used[j]) continue;
        used[j] = 1;
        const s = segs[j];
        pts.push(key(s[0], s[1]) === key(ex, ey) ? [s[2], s[3]] : [s[0], s[1]]);
        grew = true;
        break;
      }
    }
    d += "M" + pts.map(([x, y]) => `${Math.round(x)} ${Math.round(y)}`).join("L");
  }
  return d;
}

/** Contours every `step`, split into minor and major (every `majorEvery`th) paths. */
export function contourSet(fn: HeightFn, opts: { width: number; height: number; cols: number; step: number; majorEvery?: number }) {
  const rows = Math.round((opts.cols * opts.height) / opts.width);
  const { field, min, max } = sampleField(fn, opts.cols, rows);
  let minor = "";
  let major = "";
  let n = 0;
  for (let level = Math.ceil(min / opts.step) * opts.step; level < max; level += opts.step, n++) {
    if (n % (opts.majorEvery ?? 4) === 0) major += contourPath(field, level, opts.width, opts.height);
    else minor += contourPath(field, level, opts.width, opts.height);
  }
  return { minor, major };
}

/** Stable 32-bit hash of a string, for seeding per-note visuals. */
export function hashString(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
