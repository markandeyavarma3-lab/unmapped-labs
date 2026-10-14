/**
 * Secondary 3D "views" rendered by the single world canvas into screen
 * regions that track DOM anchors (the sticky stage of a section). One GPU
 * context, one render loop, bloom applied to everything.
 *
 * DOM side: a section registers its anchor element and writes progress.
 * Canvas side: the renderer reads anchor rects each frame and draws the
 * view's scene with the view's camera into that rectangle.
 */

export type ViewId = "morph" | "island";

type Listener = () => void;

export const viewAnchors: Record<ViewId, HTMLElement | null> = { morph: null, island: null };
const anchorListeners = new Set<Listener>();

export function setViewAnchor(id: ViewId, el: HTMLElement | null) {
  if (viewAnchors[id] === el) return;
  viewAnchors[id] = el;
  anchorListeners.forEach((l) => l());
}
/**
 * Registers an anchor only once its section comes within ~1 screen of the
 * viewport, so a view's geometry is built just before it's needed — not at load.
 */
export function registerViewAnchorWhenNear(id: ViewId, el: HTMLElement | null) {
  if (!el) return () => {};
  const io = new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        setViewAnchor(id, el);
        io.disconnect();
      }
    },
    { rootMargin: "100% 0px 100% 0px" },
  );
  io.observe(el);
  return () => {
    io.disconnect();
    setViewAnchor(id, null);
  };
}

export function subscribeViewAnchors(l: Listener) {
  anchorListeners.add(l);
  return () => {
    anchorListeners.delete(l);
  };
}

/** Each view's on-screen rectangle (CSS px, top-left origin), refreshed every frame by the renderer. */
export const viewRects: Record<ViewId, { x: number; y: number; w: number; h: number } | null> = { morph: null, island: null };

/** Morph sequence: 0 (Unknown) … 5 (Build). */
export const morphState = { progress: 0 };

/** Process island: 0 (Observe) … 4 (Validate), plus DOM labels positioned by the scene. */
export const islandState = {
  progress: 0,
  labels: [] as (HTMLElement | null)[],
};

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
