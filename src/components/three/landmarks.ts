import { DISTRICTS, type District } from "./city-layout";
import { TITLE_CENTER } from "./title-glyphs";

type V3 = [number, number, number];

/**
 * The journey through the city. One camera keyframe per chapter; page
 * sections anchor chapter numbers with `data-chapter`.
 */
export const CHAPTER = {
  title: 0,
  tagline: 1,
  hero: 2,
  intro: 3,
  approach: 4,
  districtFarms: 5,
  districtLogistics: 6,
  districtHealthcare: 7,
  districtEnergy: 8,
  districtOpen: 9,
  workA: 10,
  workB: 11,
  services: 12,
  notes: 13,
  philosophy: 14,
  about: 15,
  contact: 16,
} as const;
export const LAST_CHAPTER = 16;

/** Look down into a district like a diorama, its gate (the bottleneck) in the foreground. */
const overlook = (d: District): { pos: V3; target: V3 } => {
  const tx = d.x * 0.88 + d.jam[0] * 0.12;
  const tz = d.z;
  const side = -Math.sign(d.x);
  return { pos: [tx + side * 4.5, 11.5, tz + 12], target: [tx, 0.3, tz - 0.5] };
};

const T = TITLE_CENTER;
const F = DISTRICTS.farms;
const M = DISTRICTS.markets;

export const CAMERA_KEYS: { pos: V3; target: V3 }[] = [
  /* 0 title — straight down at the name */ { pos: [T.x, 40, T.z + 9], target: [T.x, 0, T.z - 0.8] },
  /* 1 tagline — tilting into the streets */ { pos: [T.x, 19, T.z + 20], target: [T.x, 1, T.z - 5] },
  /* 2 hero — swooping down the avenue */ { pos: [-5.5, 5.5, 41], target: [2.5, 0.6, 20] },
  /* 3 intro    */ { pos: [10, 8, 36], target: [-2, 0, 18] },
  /* 4 approach — over the block where the process plays */ { pos: [-3, 10, 35], target: [4, 0, 22] },
  /* 5–9 districts */
  overlook(DISTRICTS.farms),
  overlook(DISTRICTS.logistics),
  overlook(DISTRICTS.healthcare),
  overlook(DISTRICTS.energy),
  overlook(DISTRICTS.open),
  /* 10 FlowMatch — down by the borewell */ { pos: [F.x + 7.2, 2.6, F.z + 4.2], target: [F.x + 2.6, 0.5, F.z - 1.2] },
  /* 11 Deal Lens — up at the exchange */ { pos: [M.x - 6.5, 3.2, M.z + 7.5], target: [M.x + 0.6, 2.6, M.z] },
  /* 12 services — the whole city, its fixes labelled */ { pos: [30, 30, 16], target: [0, 0, -16] },
  /* 13 notes — along the coast */ { pos: [40, 9, -14], target: [18, 0, -36] },
  /* 14 philosophy — the plan view */ { pos: [0, 80, -4], target: [0, 0, -10] },
  /* 15 about — a rooftop, looking back at where it started */ { pos: [5, 6, -38], target: [-2, 2, 20] },
  /* 16 contact — everything, in the evening light */ { pos: [-32, 24, -74], target: [0, 0, -8] },
];

/** Portrait screens frame the stacked name from higher up. */
export const PORTRAIT_TITLE_KEYS: { pos: V3; target: V3 }[] = [
  { pos: [T.x, 54, T.z + 10], target: [T.x, 0, T.z - 0.5] },
  { pos: [T.x, 30, T.z + 26], target: [T.x, 1, T.z - 4] },
];
