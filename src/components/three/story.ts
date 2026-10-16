/**
 * Pinned stories. While a case, a district or a project fills the screen the camera
 * holds on it and scrolling plays its story in four beats:
 *   0 Problem → 1 Diagnose → 2 Fix → 3 Result
 * The DOM writes raw scroll progress (0 … 1) into `story`; the render loop
 * damps it into `storySmooth`, which every 3D layer reads.
 */

import { CHAPTER, STORY_ORDER, type StoryId } from "./chapters";

export type { StoryId };
export const STORY_IDS: readonly StoryId[] = STORY_ORDER;
export const STORY_CHAPTER = Object.fromEntries(STORY_ORDER.map((id) => [id, CHAPTER[id]])) as Record<StoryId, number>;

const zero = () => Object.fromEntries(STORY_IDS.map((id) => [id, 0])) as Record<StoryId, number>;

/** Raw progress through each pinned story, written by the DOM on scroll. */
export const story = zero();
/** Damped progress, updated once per frame. */
export const storySmooth = zero();

/** Which beat (0–3) a progress value falls in. */
export const beatOf = (s: number) => Math.min(3, Math.floor(s * 4));

export function updateStory(dt: number) {
  const k = 1 - Math.exp(-dt * 3.2);
  for (const id of STORY_IDS) storySmooth[id] += (story[id] - storySmooth[id]) * k;
}

/* ------------------------------------------------------------------ */
/* DOM listeners (the card's beat rail)                                */
/* ------------------------------------------------------------------ */

type Listener = () => void;
const listeners = new Set<Listener>();

export function setStory(id: StoryId, v: number) {
  if (story[id] === v) return;
  story[id] = v;
  listeners.forEach((l) => l());
}
export function subscribeStory(l: Listener) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}
