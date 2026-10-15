import { mulberry32 } from "./terrain-math";
import { BOULEVARD_Z, COAST_X, DISTRICTS, GROUND, RAIL_X, RING_X, ROADS, SIDE_X, SIDEWALK, Z_STREETS, type Road } from "./city-layout";
import type { TitleShape } from "./title-glyphs";

/**
 * Paints the ground as a top-down map on a canvas: grass with soft variation,
 * paved blocks and sidewalks, field patchwork in the countryside, the beach,
 * the rail bed and each district's own ground. Roads are drawn separately
 * (as geometry) so their markings stay crisp up close.
 */

export const GROUND_PX = 8; // pixels per world unit

export function paintGround(title: TitleShape, scale = 1, blotches = 2600) {
  const K = GROUND_PX * scale;
  const W = Math.round((GROUND.maxX - GROUND.minX) * K);
  const H = Math.round((GROUND.maxZ - GROUND.minZ) * K);
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const g = canvas.getContext("2d")!;
  const X = (x: number) => (x - GROUND.minX) * K;
  const Z = (z: number) => (z - GROUND.minZ) * K;
  const rect = (x0: number, z0: number, x1: number, z1: number, fill: string) => {
    g.fillStyle = fill;
    g.fillRect(X(Math.min(x0, x1)), Z(Math.min(z0, z1)), Math.abs(x1 - x0) * K, Math.abs(z1 - z0) * K);
  };
  const rand = mulberry32(77);

  // Grass, with soft blotches of lighter and darker green.
  g.fillStyle = "#9cc463";
  g.fillRect(0, 0, W, H);
  const greens = ["#8fbb58", "#a7cd6e", "#b3d27a", "#93bf5c", "#a2c86a"];
  for (let i = 0; i < blotches; i++) {
    g.globalAlpha = 0.18 + rand() * 0.22;
    g.fillStyle = greens[i % greens.length];
    g.beginPath();
    g.ellipse(rand() * W, rand() * H, (0.6 + rand() * 3.5) * K, (0.4 + rand() * 2.5) * K, rand() * 3, 0, Math.PI * 2);
    g.fill();
  }
  g.globalAlpha = 1;

  // Countryside patchwork: wheat, young crops, ploughed earth — west of the ring road and past the railway.
  const crops = ["#e3c56a", "#d9b85a", "#a9c95a", "#8fb84e", "#c49a68", "#b88c5c", "#e8d38a"];
  const field = (x0: number, z0: number, x1: number, z1: number) => {
    const c = crops[Math.floor(rand() * crops.length)];
    rect(x0, z0, x1, z1, c);
    // furrows
    g.strokeStyle = "rgba(90,60,30,0.18)";
    g.lineWidth = Math.max(1, K * 0.08);
    const vertical = rand() < 0.5;
    for (let t = 0.3; t < (vertical ? x1 - x0 : z1 - z0); t += 0.42) {
      g.beginPath();
      if (vertical) {
        g.moveTo(X(x0 + t), Z(z0));
        g.lineTo(X(x0 + t), Z(z1));
      } else {
        g.moveTo(X(x0), Z(z0 + t));
        g.lineTo(X(x1), Z(z0 + t));
      }
      g.stroke();
    }
    // hedgerow edge
    g.strokeStyle = "rgba(70,110,40,0.55)";
    g.lineWidth = K * 0.18;
    g.strokeRect(X(x0), Z(z0), (x1 - x0) * K, (z1 - z0) * K);
  };
  for (let z = GROUND.minZ + 4; z < GROUND.maxZ - 6; z += 6 + rand() * 4) {
    let x = RAIL_X + 1.6;
    const zh = 4 + rand() * 3.5;
    while (x < -RING_X - 1.8) {
      const w = 3 + rand() * 4;
      if (rand() < 0.8) field(x, z, Math.min(x + w, -RING_X - 1.6), z + zh);
      x += w + 0.5;
    }
    // a band of fields beyond the woods' edge, too
    if (rand() < 0.5) field(RAIL_X - 9 - rand() * 4, z, RAIL_X - 1.6, z + zh);
  }

  // The core: paved blocks with planted courtyards.
  const xs = [-SIDE_X, 0, SIDE_X];
  for (let zi = 0; zi < Z_STREETS.length - 1; zi++) {
    for (let xi = 0; xi < 2; xi++) {
      const x0 = xs[xi], x1 = xs[xi + 1], z0 = Z_STREETS[zi + 1], z1 = Z_STREETS[zi];
      rect(x0, z0, x1, z1, "#e7dccb");
      rect(x0 + 2.1, z0 + 2.3, x1 - 2.1, z1 - 2.3, "#a6cc6c");
    }
    // the outer faces of the side avenues
    rect(-SIDE_X - 2.4, Z_STREETS[zi + 1], -SIDE_X, Z_STREETS[zi], "#e7dccb");
    rect(SIDE_X, Z_STREETS[zi + 1], SIDE_X + 2.4, Z_STREETS[zi], "#e7dccb");
  }
  // Downtown plaza under the name, and the boulevard frontage.
  rect(title.minX - 0.4, title.minZ - 0.4, title.maxX + 0.4, title.maxZ + 0.4, "#e3d5c0");
  rect(-RING_X, BOULEVARD_Z, RING_X, BOULEVARD_Z + 2.8, "#e7dccb");

  // District grounds.
  const disc = (x: number, z: number, r: number, fill: string) => {
    g.fillStyle = fill;
    g.beginPath();
    g.arc(X(x), Z(z), r * K, 0, Math.PI * 2);
    g.fill();
  };
  const D = DISTRICTS;
  disc(D.logistics.x, D.logistics.z, D.logistics.r, "#d4ccbe");
  // gravel under the power station only; a forecourt at the hospital; the markets' plaza
  rect(D.energy.x - 1.2, D.energy.z - 6.4, D.energy.x + 6.6, D.energy.z - 0.6, "#d8ccb4");
  rect(D.energy.x - 5.4, D.energy.z - 2.4, D.energy.x - 3.0, D.energy.z - 0.6, "#cfc6b6");
  rect(D.healthcare.x - 3.2, D.healthcare.z - 4.6, D.healthcare.x + 4.4, D.healthcare.z + 4.6, "#e9e1d4");
  rect(D.healthcare.x - 2.8, D.healthcare.z - 4.2, D.healthcare.x - 0.2, D.healthcare.z + 4.2, "#a8cd70");
  disc(D.markets.x + 1, D.markets.z, D.markets.r * 0.8, "#e5d9c6");
  disc(D.open.x, D.open.z, D.open.r, "#d9c29c");
  for (let i = 0; i < 300; i++) {
    const a = rand() * Math.PI * 2, r = Math.sqrt(rand()) * D.open.r;
    g.globalAlpha = 0.25;
    g.fillStyle = rand() < 0.5 ? "#c9ab80" : "#e4d0ab";
    g.beginPath();
    g.ellipse(X(D.open.x + Math.cos(a) * r), Z(D.open.z + Math.sin(a) * r), K * (0.3 + rand()), K * (0.2 + rand() * 0.6), rand() * 3, 0, Math.PI * 2);
    g.fill();
  }
  g.globalAlpha = 1;

  // Sidewalks around every road (the roads themselves are geometry on top).
  for (const [x1, z1, x2, z2, w] of ROADS as Road[]) {
    const h = w / 2 + SIDEWALK;
    rect(Math.min(x1, x2) - h, Math.min(z1, z2) - h, Math.max(x1, x2) + h, Math.max(z1, z2) + h, "#ece4d6");
  }
  for (const [x1, z1, x2, z2, w] of ROADS as Road[]) {
    // a kerb shadow line just outside the asphalt
    const h = w / 2 + 0.03;
    rect(Math.min(x1, x2) - h, Math.min(z1, z2) - h, Math.max(x1, x2) + h, Math.max(z1, z2) + h, "#c8bca8");
  }

  // Beach, then the rail bed.
  const sand = g.createLinearGradient(X(COAST_X - 1.6), 0, X(COAST_X + 0.6), 0);
  sand.addColorStop(0, "#9cc463");
  sand.addColorStop(0.25, "#efd9a8");
  sand.addColorStop(1, "#e6c98f");
  g.fillStyle = sand;
  g.fillRect(X(COAST_X - 1.6), 0, 2.2 * K + 1, H);
  rect(COAST_X + 0.6, GROUND.minZ, GROUND.maxX, GROUND.maxZ, "#3f9aa3");
  rect(RAIL_X - 0.75, GROUND.minZ, RAIL_X + 0.75, GROUND.maxZ, "#b3a48f");

  return canvas;
}
