import { terrainHeight, valleyX } from "./terrain-math";

type V3 = [number, number, number];

/**
 * Camera journey — one keyframe per chapter (hero → contact).
 * The story: unknown overview → descend → walk the valley → rise →
 * read it as a map from above → look back over everything connected.
 */
export const CAMERA_KEYS: { pos: V3; target: V3 }[] = [
  { pos: [valleyX(47) - 5, 8.2, 47], target: [valleyX(22) - 6.5, 0.4, 22] },
  { pos: [valleyX(33) + 4, 5.4, 33], target: [valleyX(13) - 1, 0.2, 13] },
  { pos: [valleyX(17) - 2, 3.4, 17], target: [valleyX(-1), 0.6, -1] },
  { pos: [valleyX(3) + 7, 9.5, 3], target: [valleyX(-13), 0, -13] },
  { pos: [valleyX(-12) + 0.5, 27, -7], target: [valleyX(-16), 0, -17] },
  { pos: [valleyX(-50) - 9, 13, -50], target: [valleyX(-8) + 2, 0, -8] },
];

export type SurveyNode = { id: string; label?: string; x: number; z: number; y: number };

const node = (id: string, x: number, z: number, label?: string): SurveyNode => ({
  id,
  label,
  x,
  z,
  y: terrainHeight(x, z),
});

export const NODES: SurveyNode[] = [
  node("n0", valleyX(36) - 8, 36),
  node("observe", valleyX(27) + 3.5, 27, "Observe"),
  node("investigate", valleyX(18) - 4.5, 18, "Investigate"),
  node("connect", valleyX(9) + 5, 9, "Connect"),
  node("discover", valleyX(-3) - 3, -3, "Discover"),
  node("understand", valleyX(-16) + 4, -16, "Understand"),
  node("n6", valleyX(-28) - 5, -28),
  node("n7", valleyX(-39) + 6, -39),
];

/** Paths join previously disconnected nodes; each draws in over a chapter span. */
export const PATHS: { from: string; to: string; span: [number, number]; seed: number }[] = [
  { from: "n0", to: "observe", span: [-0.6, 0.5], seed: 1 },
  { from: "observe", to: "investigate", span: [0.3, 1.3], seed: 2 },
  { from: "investigate", to: "connect", span: [1.0, 2.1], seed: 3 },
  { from: "connect", to: "discover", span: [1.8, 3.2], seed: 4 },
  { from: "discover", to: "understand", span: [3.0, 4.2], seed: 5 },
  { from: "understand", to: "n6", span: [3.8, 4.8], seed: 6 },
  { from: "n6", to: "n7", span: [4.3, 5.0], seed: 7 },
  { from: "investigate", to: "discover", span: [4.4, 5.0], seed: 8 },
];

export const nodeById = (id: string) => {
  const n = NODES.find((n) => n.id === id);
  if (!n) throw new Error(`Unknown survey node ${id}`);
  return n;
};
