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

/** Look at a district from the avenue side, with its bottleneck in frame. */
const overlook = (d: District): { pos: V3; target: V3 } => {
  const tx = d.x * 0.62 + d.jam[0] * 0.38;
  const tz = d.z * 0.62 + d.jam[1] * 0.38;
  const side = -Math.sign(d.x);
  return { pos: [tx + side * 5.5, 7.2, tz + 9], target: [tx, 0.6, tz] };
};

const T = TITLE_CENTER;
const F = DISTRICTS.farms;
const M = DISTRICTS.markets;

export const CAMERA_KEYS: { pos: V3; target: V3 }[] = [
  /* 0 title — straight down at the name */ { pos: [T.x, 40, T.z + 9], target: [T.x, 0, T.z - 0.8] },
  /* 1 tagline — tilting into the streets */ { pos: [T.x, 19, T.z + 20], target: [T.x, 1, T.z - 5] },
  /* 2 hero — down the avenue */ { pos: [-7, 8, 40], target: [4, 0.5, 16] },
  /* 3 intro    */ { pos: [9, 11, 30], target: [-3, 0, 12] },
  /* 4 approach */ { pos: [0, 22, 26], target: [0, 0, 4] },
  /* 5–9 districts */
  overlook(DISTRICTS.farms),
  overlook(DISTRICTS.logistics),
  overlook(DISTRICTS.healthcare),
  overlook(DISTRICTS.energy),
  overlook(DISTRICTS.open),
  /* 10 FlowMatch — the borewell field */ { pos: [F.x + 7, 5.5, F.z + 8], target: [F.x + 1.5, 0.6, F.z + 0.5] },
  /* 11 Deal Lens — the exchange */ { pos: [M.x - 7, 7, M.z + 10], target: [M.x, 2, M.z] },
  /* 12 services — the whole city, its fixes labelled */ { pos: [26, 34, 14], target: [0, 0, -18] },
  /* 13 notes */ { pos: [-24, 16, -30], target: [2, 0, -44] },
  /* 14 philosophy — the plan view */ { pos: [0, 80, -4], target: [0, 0, -10] },
  /* 15 about — a rooftop, looking back at where it started */ { pos: [6, 7, -40], target: [-2, 2, 20] },
  /* 16 contact — everything lit */ { pos: [-30, 26, -70], target: [0, 0, -6] },
];

/** Portrait screens frame the stacked name from higher up. */
export const PORTRAIT_TITLE_KEYS: { pos: V3; target: V3 }[] = [
  { pos: [T.x, 54, T.z + 10], target: [T.x, 0, T.z - 0.5] },
  { pos: [T.x, 30, T.z + 26], target: [T.x, 1, T.z - 4] },
];
