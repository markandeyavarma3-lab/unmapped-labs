/**
 * Generates public/terrain-fallback.svg — a top-down contour map of the same
 * procedural terrain the WebGL world renders. Shown before WebGL is ready and
 * permanently for reduced-motion, save-data or no-WebGL visitors.
 *
 *   npx tsx scripts/generate-terrain-svg.ts
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { terrainHeight } from "../src/components/three/terrain-math";
import { NODES, PATHS, nodeById } from "../src/components/three/landmarks";
import { contourSet } from "../src/lib/contours";

const W = 1600;
const H = 900;
const X0 = -34, X1 = 34; // world x span
const Z0 = 46, Z1 = Z0 - (X1 - X0) * (H / W); // world z span (top → bottom)

const sx = (x: number) => ((x - X0) / (X1 - X0)) * W;
const sz = (z: number) => ((Z0 - z) / (Z0 - Z1)) * H;

const { minor, major } = contourSet((u, v) => terrainHeight(X0 + (X1 - X0) * u, Z0 + (Z1 - Z0) * v), {
  width: W,
  height: H,
  cols: 160,
  step: 0.5,
});

const visible = NODES.filter((p) => p.z <= Z0 && p.z >= Z1);
const pathD = PATHS.slice(0, 3)
  .map((p) => {
    const a = nodeById(p.from), b = nodeById(p.to);
    if (!visible.includes(a) || !visible.includes(b)) return "";
    const mx = (sx(a.x) + sx(b.x)) / 2 + (sz(b.z) - sz(a.z)) * 0.18;
    const my = (sz(a.z) + sz(b.z)) / 2 - (sx(b.x) - sx(a.x)) * 0.18;
    return `M${sx(a.x).toFixed(0)} ${sz(a.z).toFixed(0)}Q${mx.toFixed(0)} ${my.toFixed(0)} ${sx(b.x).toFixed(0)} ${sz(b.z).toFixed(0)}`;
  })
  .join("");

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">
<rect width="${W}" height="${H}" fill="#080b0e"/>
<path d="${minor}" fill="none" stroke="#9fb3c4" stroke-opacity=".13" stroke-width="1"/>
<path d="${major}" fill="none" stroke="#9fb3c4" stroke-opacity=".3" stroke-width="1.2"/>
<path d="${pathD}" fill="none" stroke="#65e4e8" stroke-opacity=".7" stroke-width="1.6" stroke-dasharray="2 6" stroke-linecap="round"/>
${visible
  .map(
    (p) =>
      `<circle cx="${sx(p.x).toFixed(0)}" cy="${sz(p.z).toFixed(0)}" r="14" fill="none" stroke="#65e4e8" stroke-opacity=".35"/><circle cx="${sx(p.x).toFixed(0)}" cy="${sz(p.z).toFixed(0)}" r="3.5" fill="#65e4e8"/>`,
  )
  .join("")}
</svg>
`;

const out = join(__dirname, "..", "public", "terrain-fallback.svg");
writeFileSync(out, svg);
console.log(`wrote ${out} (${(svg.length / 1024).toFixed(1)} KB)`);
