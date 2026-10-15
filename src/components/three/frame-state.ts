/**
 * Values computed once per frame by the camera rig and read by every layer.
 * Module-level and mutable on purpose: render-loop state, never React state.
 */
export const frame = {
  /** Smoothed journey chapter. */
  chapter: 0,
  /** 0 → 1 over the entrance. */
  introT: 0,
  /** 0 → 1 as the visitor reaches Contact: the whole city lit. */
  finale: 0,
};
