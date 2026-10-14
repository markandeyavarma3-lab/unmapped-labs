/**
 * Mutable, non-React state shared between the DOM (scroll, intro) and the
 * render loop. Writing here never triggers a React render — the scene reads
 * it inside useFrame and damps toward it.
 */

type Listener = () => void;

export const world = {
  /** Float chapter index: 0 = hero … 5 = contact. Driven by the scroll engine. */
  chapter: 0,
  /** True while an opaque editorial section fully covers the viewport. */
  paused: false,
  /** Label of the survey node under the pointer, for the cursor. */
  hovered: null as string | null,
  /** Last scroll / pointer / key activity (performance.now()). Drives idle throttling. */
  lastActive: 0,
};

if (typeof window !== "undefined") {
  const mark = () => (world.lastActive = performance.now());
  for (const e of ["scroll", "pointermove", "pointerdown", "wheel", "keydown", "touchmove"]) window.addEventListener(e, mark, { passive: true });
}

/** The single DOM label for survey nodes; lives outside the canvas, positioned by the scene. */
export const nodeLabel = { el: null as HTMLDivElement | null };

const pauseListeners = new Set<Listener>();

export function setWorldPaused(paused: boolean) {
  if (world.paused === paused) return;
  world.paused = paused;
  pauseListeners.forEach((l) => l());
}

export function onWorldPauseChange(l: Listener) {
  pauseListeners.add(l);
  return () => {
    pauseListeners.delete(l);
  };
}

