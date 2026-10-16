import * as THREE from "three";
import { CHAPTER } from "./chapters";

/**
 * Time passes along the journey: a fresh morning on the northern hills,
 * bright day through the city, golden hour around the last sections, and
 * sunset over the southern hills. One preset per moment; the scene blends
 * between them by chapter.
 */

type Preset = {
  /** Direction toward the sun. */
  sun: [number, number, number];
  sunColor: string;
  sunIntensity: number;
  hemiSky: string;
  hemiGround: string;
  hemiIntensity: number;
  horizon: string;
  mid: string;
  zenith: string;
  glow: string;
  haze: string;
};

const MORNING: Preset = {
  sun: [0.78, 0.3, 0.55],
  sunColor: "#ffdcb0",
  sunIntensity: 2.7,
  hemiSky: "#e4ecfa",
  hemiGround: "#7a725f",
  hemiIntensity: 1.2,
  horizon: "#f8e4cf",
  mid: "#e7ddd6",
  zenith: "#9cc3ea",
  glow: "#ffe6b8",
  haze: "#e9ddd0",
};
const DAY: Preset = {
  sun: [-0.38, 0.8, 0.46],
  sunColor: "#fff1dc",
  sunIntensity: 3.0,
  hemiSky: "#eef3fb",
  hemiGround: "#7f6f5a",
  hemiIntensity: 1.25,
  horizon: "#f6e6d0",
  mid: "#ecdfcc",
  zenith: "#86b4df",
  glow: "#fff2cc",
  haze: "#eee2cf",
};
const GOLDEN: Preset = {
  sun: [-0.62, 0.42, 0.66],
  sunColor: "#ffc98a",
  sunIntensity: 3.1,
  hemiSky: "#ffe9cc",
  hemiGround: "#7d6a55",
  hemiIntensity: 1.15,
  horizon: "#ffd8a8",
  mid: "#f9c9a0",
  zenith: "#8fb4d6",
  glow: "#ffd27a",
  haze: "#f3cfa0",
};
const SUNSET: Preset = {
  sun: [-0.5, 0.13, -0.86],
  sunColor: "#ff9150",
  sunIntensity: 2.7,
  hemiSky: "#ffd2ae",
  hemiGround: "#6b4c48",
  hemiIntensity: 0.95,
  horizon: "#ffa66c",
  mid: "#f2a07f",
  zenith: "#5e79ae",
  glow: "#ffb45c",
  haze: "#efab7c",
};

/** Chapter → preset. */
const KEYS: [number, Preset][] = [
  [CHAPTER.prologue, MORNING],
  [CHAPTER.title + 0.4, MORNING],
  [CHAPTER.intro + 0.5, DAY],
  [CHAPTER.services + 0.5, DAY],
  [CHAPTER.about + 0.2, GOLDEN],
  [CHAPTER.contact + 0.3, GOLDEN],
  [CHAPTER.epilogue, SUNSET],
];

type Live = {
  sun: THREE.Vector3;
  sunColor: THREE.Color;
  sunIntensity: number;
  hemiSky: THREE.Color;
  hemiGround: THREE.Color;
  hemiIntensity: number;
  horizon: THREE.Color;
  mid: THREE.Color;
  zenith: THREE.Color;
  glow: THREE.Color;
  haze: THREE.Color;
};

const cache = new Map<Preset, Record<string, THREE.Color>>();
const colorsOf = (p: Preset) => {
  let c = cache.get(p);
  if (!c) {
    c = {};
    for (const k of ["sunColor", "hemiSky", "hemiGround", "horizon", "mid", "zenith", "glow", "haze"] as const) c[k] = new THREE.Color(p[k]);
    cache.set(p, c);
  }
  return c;
};

/** The current light, blended for the smoothed chapter; read by the environment every frame. */
export const sky: Live = {
  sun: new THREE.Vector3(...MORNING.sun).normalize(),
  sunColor: new THREE.Color(MORNING.sunColor),
  sunIntensity: MORNING.sunIntensity,
  hemiSky: new THREE.Color(MORNING.hemiSky),
  hemiGround: new THREE.Color(MORNING.hemiGround),
  hemiIntensity: MORNING.hemiIntensity,
  horizon: new THREE.Color(MORNING.horizon),
  mid: new THREE.Color(MORNING.mid),
  zenith: new THREE.Color(MORNING.zenith),
  glow: new THREE.Color(MORNING.glow),
  haze: new THREE.Color(MORNING.haze),
};

const va = new THREE.Vector3(), vb = new THREE.Vector3();

export function updateSky(chapter: number) {
  let i = 0;
  while (i < KEYS.length - 2 && chapter > KEYS[i + 1][0]) i++;
  const [c0, a] = KEYS[i];
  const [c1, b] = KEYS[i + 1];
  const raw = THREE.MathUtils.clamp((chapter - c0) / (c1 - c0 || 1), 0, 1);
  const t = raw * raw * (3 - 2 * raw);
  const ca = colorsOf(a), cb = colorsOf(b);
  sky.sun.copy(va.set(...a.sun).normalize().lerp(vb.set(...b.sun).normalize(), t)).normalize();
  for (const k of ["sunColor", "hemiSky", "hemiGround", "horizon", "mid", "zenith", "glow", "haze"] as const) sky[k].copy(ca[k]).lerp(cb[k], t);
  sky.sunIntensity = THREE.MathUtils.lerp(a.sunIntensity, b.sunIntensity, t);
  sky.hemiIntensity = THREE.MathUtils.lerp(a.hemiIntensity, b.hemiIntensity, t);
}
