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
import { DISTRICT_LIST, ROADS, buildCity } from "../src/components/three/city-layout";

const { buildings } = buildCity("line");
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

let out = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">
<rect width="${W}" height="${H}" fill="#080b0e"/>
<g stroke="#1b232b" stroke-linecap="square">`;
for (const [x1, z1, x2, z2, w] of ROADS) out += `<line x1="${r(sx(x1))}" y1="${r(sz(z1))}" x2="${r(sx(x2))}" y2="${r(sz(z2))}" stroke-width="${r(w * s)}"/>`;
out += `</g>`;
for (const d of DISTRICT_LIST) out += `<circle cx="${r(sx(d.x))}" cy="${r(sz(d.z))}" r="${r(d.r * s)}" fill="none" stroke="#65e4e8" stroke-opacity=".25" stroke-dasharray="4 8"/>`;
let blocks = "";
let letters = "";
for (const b of buildings) {
  if (b.z < Z0 - 2 || b.z > Z1 + 2 || b.x < X0 - 2 || b.x > X1 + 2) continue;
  const rect = `<rect x="${r(sx(b.x) - (b.w * s) / 2)}" y="${r(sz(b.z) - (b.d * s) / 2)}" width="${r(b.w * s)}" height="${r(b.d * s)}"`;
  if (b.letter) letters += rect + "/>";
  else blocks += rect + ` fill-opacity="${r(0.08 + Math.min(0.35, b.h / 10))}"/>`;
}
out += `<g fill="#9fb3c4">${blocks}</g><g fill="#65e4e8">${letters}</g></svg>\n`;

const file = join(__dirname, "..", "public", "city-map.svg");
writeFileSync(file, out);
console.log(`wrote ${file} (${(out.length / 1024).toFixed(1)} KB)`);
