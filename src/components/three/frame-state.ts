import * as THREE from "three";

/**
 * Values computed once per frame by the camera rig and read by every layer.
 * Module-level and mutable on purpose: render-loop state, never React state.
 */
export const frame = {
  /** Smoothed journey chapter. */
  chapter: 0,
  /** 0 → 1 over the entrance. */
  introT: 0,
  /** 0 → 1 as the visitor reaches Contact: the whole city celebrates. */
  finale: 0,
  /** Where the camera is looking, and how far away that is. */
  target: new THREE.Vector3(0, 0, 40),
  camDist: 40,
  /** 0 → 1 while the five-step process has taken over the screen. */
  process: 0,
  /** Seconds since the city finished loading (the intro runs on this clock). */
  time: 0,
};
