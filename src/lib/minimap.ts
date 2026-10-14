/** Shared projection for the mini-map: world (x, z) → map pixels, north (−z) up. */
export const MINIMAP = { W: 340, H: 680, x0: -34, x1: 34, zTop: -72, zBottom: 64 } as const;

export const toMap = (x: number, z: number): [number, number] => [
  ((x - MINIMAP.x0) / (MINIMAP.x1 - MINIMAP.x0)) * MINIMAP.W,
  ((z - MINIMAP.zTop) / (MINIMAP.zBottom - MINIMAP.zTop)) * MINIMAP.H,
];

/** World units → map pixels (uniform scale). */
export const mapScale = MINIMAP.W / (MINIMAP.x1 - MINIMAP.x0);
