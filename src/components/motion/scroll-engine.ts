/**
 * A tiny scroll engine — the only scroll-linked animation system on the site.
 *
 * Element geometry is measured on resize (never per frame); scroll handling
 * then needs only window.scrollY. Each `track()` maps an element's passage
 * through the viewport onto 0 → 1 and, optionally, eases toward it ("scrub").
 * Lenis drives native scroll, so plain scroll events are all we need.
 */

type Edge = { el: number; vp: number }; // element fraction meets viewport fraction

export type TrackOptions = {
  /** When the element's `el` fraction (0 top, 1 bottom) crosses viewport `vp` fraction, progress = 0. */
  start?: Edge;
  /** …and progress = 1 here. */
  end?: Edge;
  /** Seconds-ish smoothing; 0 = immediate. */
  scrub?: number;
};

type Track = {
  el: HTMLElement;
  start: Edge;
  end: Edge;
  scrub: number;
  top: number;
  height: number;
  value: number;
  target: number;
  cb: (p: number) => void;
};

type GlobalListener = (scrollY: number, viewportH: number) => void;

const tracks = new Set<Track>();
const globals = new Set<GlobalListener>();
const measureListeners = new Set<() => void>();
let raf = 0;
let installed = false;
let vh = 0;

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

function measure() {
  vh = window.innerHeight;
  const y = window.scrollY;
  tracks.forEach((t) => {
    const r = t.el.getBoundingClientRect();
    t.top = r.top + y;
    t.height = r.height;
  });
  measureListeners.forEach((l) => l());
  update();
}

function targetFor(t: Track, y: number) {
  const startY = t.top + t.height * t.start.el - vh * t.start.vp;
  const endY = t.top + t.height * t.end.el - vh * t.end.vp;
  return clamp01((y - startY) / Math.max(1, endY - startY));
}

function update() {
  const y = window.scrollY;
  globals.forEach((g) => g(y, vh));
  let pending = false;
  tracks.forEach((t) => {
    t.target = targetFor(t, y);
    if (t.scrub === 0) {
      if (t.value !== t.target) t.cb((t.value = t.target));
    } else if (Math.abs(t.target - t.value) > 0.0005) pending = true;
  });
  if (pending && !raf) raf = requestAnimationFrame(step);
}

let last = 0;
function step(now: number) {
  raf = 0;
  const dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016);
  last = now;
  let pending = false;
  tracks.forEach((t) => {
    if (t.scrub === 0) return;
    const k = 1 - Math.exp(-dt / Math.max(0.01, t.scrub * 0.25));
    t.value += (t.target - t.value) * k;
    if (Math.abs(t.target - t.value) <= 0.0005) t.value = t.target;
    else pending = true;
    t.cb(t.value);
  });
  if (pending) raf = requestAnimationFrame(step);
  else last = 0;
}

function install() {
  if (installed) return;
  installed = true;
  window.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", measure);
  // Layout shifts (fonts, images, content) re-measure too.
  new ResizeObserver(() => measure()).observe(document.body);
}

let measureQueued = false;
function queueMeasure() {
  if (measureQueued) return;
  measureQueued = true;
  requestAnimationFrame(() => {
    measureQueued = false;
    measure();
  });
}

/** Scroll-linked progress for one element. Returns a disposer. */
export function track(el: HTMLElement, cb: (p: number) => void, opts: TrackOptions = {}) {
  install();
  const t: Track = {
    el,
    start: opts.start ?? { el: 0, vp: 1 },
    end: opts.end ?? { el: 1, vp: 0 },
    scrub: opts.scrub ?? 0,
    top: 0,
    height: 0,
    value: -1,
    target: 0,
    cb,
  };
  tracks.add(t);
  queueMeasure();
  return () => {
    tracks.delete(t);
  };
}

/** Raw scroll position listener (runs on scroll and after every measure). */
export function onScroll(listener: GlobalListener, onMeasure?: () => void) {
  install();
  globals.add(listener);
  if (onMeasure) measureListeners.add(onMeasure);
  queueMeasure();
  return () => {
    globals.delete(listener);
    if (onMeasure) measureListeners.delete(onMeasure);
  };
}

export const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
