import * as THREE from "three";

/**
 * Short narration labels pinned to points in the 3D scene ("14 cars
 * waiting", "Cause: failed controller"). Layers request them every frame;
 * the renderer lays them out once per frame, just before drawing, into a
 * fixed pool of DOM elements (see WorldLayer). Text only touches the DOM
 * when it changes.
 */

export type CalloutTone = "red" | "teal" | "lime" | "ink";

type Request = { key: string; text: string; tone: CalloutTone; x: number; y: number; z: number; opacity: number };

const POOL = 10;
const requests: Request[] = [];
/** DOM pool, registered by WorldLayer. */
export const calloutEls: (HTMLElement | null)[] = Array(POOL).fill(null);
const shown: { key: string; text: string; tone: string }[] = Array.from({ length: POOL }, () => ({ key: "", text: "", tone: "" }));

/** Keeps callouts clear of a card on the left of the screen (CSS px from the left edge). */
export const calloutSafe = { left: 0 };

export function callout(key: string, text: string, tone: CalloutTone, at: THREE.Vector3 | [number, number, number], opacity: number) {
  if (opacity < 0.01 || requests.length >= POOL) return;
  const [x, y, z] = Array.isArray(at) ? at : [at.x, at.y, at.z];
  requests.push({ key, text, tone, x, y, z, opacity: Math.min(1, opacity) });
}

const v = new THREE.Vector3();

/** Projects this frame's requests and writes them to the DOM; called once per frame by the renderer. */
export function flushCallouts(camera: THREE.Camera, W: number, H: number) {
  // Keep each key in the slot it had last frame, so labels don't jump between elements.
  const slots: (Request | null)[] = Array(POOL).fill(null);
  const rest: Request[] = [];
  for (const r of requests) {
    const i = shown.findIndex((s, k) => s.key === r.key && !slots[k]);
    if (i >= 0) slots[i] = r;
    else rest.push(r);
  }
  for (const r of rest) {
    const i = slots.findIndex((s, k) => !s && !requests.some((q) => q.key === shown[k].key));
    const j = i >= 0 ? i : slots.findIndex((s) => !s);
    if (j >= 0) slots[j] = r;
  }
  requests.length = 0;

  const left = Math.max(24, calloutSafe.left);
  for (let k = 0; k < POOL; k++) {
    const el = calloutEls[k];
    const r = slots[k];
    if (!el) continue;
    if (!r) {
      if (el.style.opacity !== "0") el.style.opacity = "0";
      continue;
    }
    v.set(r.x, r.y, r.z).project(camera);
    const visible = v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1;
    const sx = Math.min(W - 24, Math.max(left, (v.x * 0.5 + 0.5) * W));
    const sy = Math.min(H - 24, Math.max(96, (-v.y * 0.5 + 0.5) * H));
    el.style.transform = `translate3d(${sx.toFixed(1)}px, ${sy.toFixed(1)}px, 0)`;
    el.style.opacity = visible ? r.opacity.toFixed(3) : "0";
    const s = shown[k];
    if (s.text !== r.text) {
      const t = el.querySelector("[data-text]");
      if (t) t.textContent = r.text;
      s.text = r.text;
    }
    if (s.tone !== r.tone) {
      el.dataset.tone = r.tone;
      s.tone = r.tone;
    }
    s.key = r.key;
  }
}
