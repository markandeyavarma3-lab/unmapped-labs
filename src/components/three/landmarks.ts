import { DISTRICTS } from "./city-layout";
import { CASES, CASE_IDS } from "./cases";
import { CHAPTER_ORDER, type ChapterId, type StoryId } from "./chapters";
import { TITLE_CENTER } from "./title-glyphs";

export { CHAPTER, FIRST_CHAPTER, LAST_CHAPTER } from "./chapters";

type V3 = [number, number, number];
type Key = { pos: V3; target: V3 };

const T = TITLE_CENTER;
const M = DISTRICTS.markets;

/** FlowMatch plays by the farm's pump station; Deal Lens over the exchange. */
export const FLOWMATCH_AT: V3 = [-16.8, 2.5, -0.6];
export const DEALLENS_AT: V3 = [M.x - 0.6, 6.4, M.z + 1.4];

const KEY: Record<ChapterId, Key> = {
  /* on the ridge; the city waits down the valley */ prologue: { pos: [10, 9.5, 150], target: [0, 4, 60] },
  /* straight down at the name */ title: { pos: [T.x, 40, T.z + 9], target: [T.x, 0, T.z - 0.8] },
  /* tilting into the streets */ tagline: { pos: [T.x, 19, T.z + 20], target: [T.x, 1, T.z - 5] },
  /* swooping down the avenue */ hero: { pos: [-6.5, 10, 41], target: [2.5, 0.4, 16] },
  intro: { pos: [10, 8, 36], target: [-2, 0, 18] },
  /* over the block where the process plays */ approach: { pos: [-3, 10, 35], target: [4, 0, 22] },
  ...(Object.fromEntries(CASE_IDS.map((id) => [id, CASES[id].cam])) as Record<(typeof CASE_IDS)[number], Key>),
  /* by the pump station, the catalogue becomes a search */ flowmatch: { pos: [-9.0, 4.6, -8.8], target: [FLOWMATCH_AT[0] + 0.6, 2.1, FLOWMATCH_AT[2] - 0.2] },
  /* over the exchange, the disclosures become a map */ deallens: { pos: [M.x - 4.6, 9.6, M.z + 10.6], target: [DEALLENS_AT[0], 5.4, M.z + 1.2] },
  /* the whole city, its fixes labelled */ services: { pos: [30, 30, 16], target: [0, 0, -16] },
  /* along the coast */ notes: { pos: [40, 9, -14], target: [18, 0, -36] },
  /* the plan view */ philosophy: { pos: [0, 80, -4], target: [0, 0, -10] },
  /* a rooftop, looking back at where it started */ about: { pos: [5, 6, -38], target: [-2, 2, 20] },
  /* everything, in the evening light */ contact: { pos: [-32, 24, -74], target: [0, 0, -8] },
  /* out over the far hills */ epilogue: { pos: [8, 17, -132], target: [2, 5, -250] },
};

/** The journey through the city: one camera key per chapter, in order. */
export const CAMERA_KEYS: Key[] = CHAPTER_ORDER.map((id) => KEY[id]);

/**
 * The dive (chapter −1 → 0): from the ridge, low along the river down the
 * valley, out over the city's edge, then a swoop up to look down on the name.
 */
export const DIVE_KEYS: { pos: V3; target: V3 }[] = [
  { pos: [10, 9.5, 150], target: [0, 4, 60] },
  { pos: [10.5, 6.2, 128], target: [6.5, 2.6, 104] },
  { pos: [6.6, 4.4, 104], target: [2.0, 1.8, 82] },
  { pos: [1.8, 19, 82], target: [0.2, 0, 53] },
  { pos: [T.x, 40, T.z + 9], target: [T.x, 0, T.z - 0.8] },
];

/** Portrait screens frame the stacked name from higher up (chapters 0 and 1). */
export const PORTRAIT_TITLE_KEYS: { pos: V3; target: V3 }[] = [
  { pos: [T.x, 54, T.z + 10], target: [T.x, 0, T.z - 0.5] },
  { pos: [T.x, 30, T.z + 26], target: [T.x, 1, T.z - 4] },
];

/** Where each pinned story's action is centred; narrow screens aim straight at it. */
export const STORY_FOCUS: Record<StoryId, V3> = {
  ...(Object.fromEntries(CASE_IDS.map((id) => [id, CASES[id].focus])) as Record<(typeof CASE_IDS)[number], V3>),
  flowmatch: FLOWMATCH_AT,
  deallens: [DEALLENS_AT[0], 6.0, DEALLENS_AT[2]],
};
