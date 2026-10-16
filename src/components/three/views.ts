/**
 * Secondary 3D "views" rendered by the single world canvas into screen
 * regions that track DOM anchors (the sticky stage of a section). One GPU
 * context, one render loop, bloom applied to everything.
 *
 * DOM side: a section registers its anchor element and writes progress.
 * Canvas side: the renderer reads anchor rects each frame and draws the
 * view's scene with the view's camera into that rectangle.
 */

export type ViewId = "island";

type Listener = () => void;

export const viewAnchors: Record<ViewId, HTMLElement | null> = { island: null };
const anchorListeners = new Set<Listener>();

export function setViewAnchor(id: ViewId, el: HTMLElement | null) {
  if (viewAnchors[id] === el) return;
  viewAnchors[id] = el;
  anchorListeners.forEach((l) => l());
}
export function subscribeViewAnchors(l: Listener) {
  anchorListeners.add(l);
  return () => {
    anchorListeners.delete(l);
  };
}

/** Each view's on-screen rectangle (CSS px, top-left origin), refreshed every frame by the renderer. */
export const viewRects: Record<ViewId, { x: number; y: number; w: number; h: number } | null> = { island: null };

/** Whether each view was drawn this frame — content skips its per-frame work when not. */
export const viewVisible: Record<ViewId, boolean> = { island: false };

/** Process block: 0 (Unknown) … 5 (Validate). */
export const islandState = {
  progress: 0,
  /** Right edge of the stage card (CSS px), so scene callouts stay clear of it. */
  cardRight: 0,
  /** The main road's southbound approach, where the process block runs its own queue; city traffic keeps out while it's on. */
  hide: { x0: 6.95, x1: 7.5, z0: 15.0, z1: 29.5, on: false },
};

/** The process junction's signal: the share of the cycle the main road gets, before and after re-timing. */
export const MAIN_GREEN = { before: 0.25, after: 0.55, retimedAt: 4.15 };

/* ------------------------------------------------------------------ */
/* World mode — lets DOM sections swap 2D fallbacks for live 3D       */
/* ------------------------------------------------------------------ */

export type WorldMode = "pending" | "static" | "webgl";
let mode: WorldMode = "pending";
let ready = false;
const modeListeners = new Set<Listener>();

export function setWorldMode(m: WorldMode) {
  mode = m;
  modeListeners.forEach((l) => l());
}
export function setWorldReady(r: boolean) {
  ready = r;
  modeListeners.forEach((l) => l());
}
export const subscribeWorldMode = (l: Listener) => {
  modeListeners.add(l);
  return () => {
    modeListeners.delete(l);
  };
};
/** True once the WebGL world is drawing (3D views are live). */
export const getWorldLive = () => mode === "webgl" && ready;
export const getWorldLiveServer = () => false;
