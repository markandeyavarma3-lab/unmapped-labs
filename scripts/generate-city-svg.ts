/**
 * Generates public/city-map.svg — a top-down plan of the same city the WebGL
 * world renders (oriented like the camera's view, so the name reads correctly).
 * Shown before WebGL is ready and permanently for reduced-motion, save-data
 * or no-WebGL visitors; also used in the social sharing image.
 *
 *   npx tsx scripts/generate-city-svg.ts
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { COAST_X, DISTRICT_LIST, ROADS, buildCity, footprint } from "../src/components/three/city-layout";

const { towers, placements } = buildCity("line");
// Frame: the downtown name and the first districts, 16:9.
const X0 = -34, X1 = 34;
const W = 1600, H = 900;
const span = X1 - X0;
const Z1 = 60;
const Z0 = Z1 - span * (H / W);
// The camera looks toward −z, so −z is "up" on the page.
const sx = (x: number) => ((x - X0) / span) * W;
const sz = (z: number) => ((Z1 - z) / (Z1 - Z0)) * H;
const s = W / span;
const r = (n: number) => Math.round(n * 10) / 10;
const inFrame = (x: number, z: number) => z > Z0 - 2 && z < Z1 + 2 && x > X0 - 2 && x < X1 + 2;

let out = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">
<rect width="${W}" height="${H}" fill="#a9cb72"/>
<rect x="${r(sx(COAST_X))}" y="0" width="${W}" height="${H}" fill="#4aa3ae"/>
<g stroke="#ebe2d2" stroke-linecap="square">`;
for (const [x1, z1, x2, z2, w] of ROADS) out += `<line x1="${r(sx(x1))}" y1="${r(sz(z1))}" x2="${r(sx(x2))}" y2="${r(sz(z2))}" stroke-width="${r((w + 0.64) * s)}"/>`;
out += `</g><g stroke="#565a62" stroke-linecap="square">`;
for (const [x1, z1, x2, z2, w] of ROADS) out += `<line x1="${r(sx(x1))}" y1="${r(sz(z1))}" x2="${r(sx(x2))}" y2="${r(sz(z2))}" stroke-width="${r(w * s)}"/>`;
out += `</g>`;
for (const d of DISTRICT_LIST) out += `<rect x="${r(sx(d.x0))}" y="${r(sz(d.z1))}" width="${r((d.x1 - d.x0) * s)}" height="${r((d.z1 - d.z0) * s)}" fill="#ffffff" fill-opacity=".12" stroke="#0f8a8f" stroke-opacity=".5" stroke-dasharray="6 8"/>`;
let buildings = "", trees = "";
for (const p of placements) {
  if (!inFrame(p.x, p.z)) continue;
  const f = footprint(p);
  if (p.m.startsWith("nat-") || p.m.startsWith("sub-tree")) trees += `<circle cx="${r(sx(p.x))}" cy="${r(sz(p.z))}" r="${r(f.w * s * 0.45)}"/>`;
  else if (!p.m.startsWith("road-")) buildings += `<rect x="${r(sx(p.x) - (f.w * s) / 2)}" y="${r(sz(p.z) - (f.d * s) / 2)}" width="${r(f.w * s)}" height="${r(f.d * s)}"/>`;
}
let letters = "", blocks = "";
for (const t of towers) {
  const rect = `<rect x="${r(sx(t.x) - 0.25 * s)}" y="${r(sz(t.z) - 0.25 * s)}" width="${r(0.5 * s)}" height="${r(0.5 * s)}"/>`;
  if (t.letter) letters += rect;
  else blocks += rect;
}
out += `<g fill="#6f9a45">${trees}</g><g fill="#f4ede2" stroke="#d8cbb6" stroke-width="1">${buildings}</g><g fill="#e9b394">${blocks}</g><g fill="#14181c">${letters}</g></svg>\n`;

const file = join(__dirname, "..", "public", "city-map.svg");
writeFileSync(file, out);
console.log(`wrote ${file} (${(out.length / 1024).toFixed(1)} KB)`);
