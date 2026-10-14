import { NODES, PATHS } from "./landmarks";

/**
 * Values computed once per frame by the camera rig and read by every layer.
 * Module-level and mutable on purpose: render-loop state, never React state.
 */
export const frame = {
  chapter: 0,
  draws: PATHS.map(() => 0),
  nodeStrength: NODES.map(() => 0),
  introT: 0,
};
