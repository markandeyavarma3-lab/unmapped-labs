import * as THREE from "three";
import { NODES, SURVEY_DISCS, UNMAPPED_HOLD, discRadius } from "./landmarks";
import { DISC_SLOTS, NODE_SLOTS, hexToVec3, terrainFragment, terrainVertex } from "./shaders";
import { frame } from "./frame-state";

const INK = hexToVec3("#080b0e");
const LINE = hexToVec3("#9fb3c4");
const CYAN = hexToVec3("#65e4e8");
const FOG: [number, number] = [16, 62];
const FOG_TINT = hexToVec3("#16212a");

/**
 * A tileable value-noise texture (R, G, B = 1×, 2×, 4× frequency), built once.
 * Sampling it replaces several procedural noise evaluations per pixel.
 */
let noiseTexture: THREE.DataTexture | null = null;
export function getNoiseTexture() {
  if (noiseTexture) return noiseTexture;
  const N = 256;
  const data = new Uint8Array(N * N * 4);
  const lattice = (cells: number, seed: number) => {
    const v = new Float32Array(cells * cells);
    let a = seed >>> 0;
    for (let i = 0; i < v.length; i++) {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      v[i] = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    return (x: number, y: number) => {
      const fx = (x / N) * cells, fy = (y / N) * cells;
      const ix = Math.floor(fx), iy = Math.floor(fy);
      const tx = fx - ix, ty = fy - iy;
      const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
      const at = (i: number, j: number) => v[((j + cells) % cells) * cells + ((i + cells) % cells)];
      const top = at(ix, iy) + (at(ix + 1, iy) - at(ix, iy)) * sx;
      const bot = at(ix, iy + 1) + (at(ix + 1, iy + 1) - at(ix, iy + 1)) * sx;
      return top + (bot - top) * sy;
    };
  };
  const o1 = lattice(16, 11), o2 = lattice(32, 23), o3 = lattice(64, 37);
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const i = (y * N + x) * 4;
      data[i] = o1(x, y) * 255;
      data[i + 1] = o2(x, y) * 255;
      data[i + 2] = o3(x, y) * 255;
      data[i + 3] = 255;
    }
  noiseTexture = new THREE.DataTexture(data, N, N, THREE.RGBAFormat);
  noiseTexture.wrapS = noiseTexture.wrapT = THREE.RepeatWrapping;
  noiseTexture.magFilter = THREE.LinearFilter;
  noiseTexture.minFilter = THREE.LinearFilter;
  noiseTexture.needsUpdate = true;
  return noiseTexture;
}

/** One terrain material recipe for the ground and the title relief. */
export function makeTerrainMaterial(range: [number, number], title = false) {
  return new THREE.ShaderMaterial({
    vertexShader: terrainVertex,
    fragmentShader: terrainFragment,
    defines: title ? { TITLE: "" } : {},
    polygonOffset: title,
    polygonOffsetFactor: title ? -2 : 0,
    polygonOffsetUnits: title ? -2 : 0,
    uniforms: {
      uTime: { value: 0 },
      uNoise: { value: getNoiseTexture() },
      uIntro: { value: 0 },
      uFocus: { value: new THREE.Vector2() },
      uPointer: { value: new THREE.Vector2(999, 999) },
      uPointerStrength: { value: 0 },
      uNodes: { value: Array.from({ length: NODE_SLOTS }, () => new THREE.Vector3(999, 999, 0)) },
      uDiscs: { value: Array.from({ length: DISC_SLOTS }, () => new THREE.Vector4(0, 0, 0, 0)) },
      uHold: { value: new THREE.Vector3(UNMAPPED_HOLD.x, UNMAPPED_HOLD.z, UNMAPPED_HOLD.r) },
      uHeightRange: { value: new THREE.Vector2(...range) },
      uBg: { value: new THREE.Vector3(...INK) },
      uLine: { value: new THREE.Vector3(...LINE) },
      uCyan: { value: new THREE.Vector3(...CYAN) },
      uFogTint: { value: new THREE.Vector3(...FOG_TINT) },
      uFog: { value: new THREE.Vector2(...FOG) },
      uSweep: { value: -1 },
      uFinale: { value: 0 },
      uRise: { value: 0 },
      uTitleGlow: { value: 0 },
      uTitleGain: { value: 1 },
    },
  });
}

/** Per-frame uniforms shared by every terrain-like surface. */
export function updateTerrainUniforms(u: Record<string, THREE.IUniform>, time: number) {
  const f = frame;
  u.uTime.value = time;
  u.uIntro.value = f.introT;
  u.uSweep.value = f.introT < 1 ? f.introT : -1;
  u.uFinale.value = f.finale;
  (u.uFocus.value as THREE.Vector2).set(f.focusX, f.focusZ);
  (u.uPointer.value as THREE.Vector2).set(f.pointerX, f.pointerZ);
  u.uPointerStrength.value = f.pointerStrength;
  const discs = u.uDiscs.value as THREE.Vector4[];
  SURVEY_DISCS.forEach((d, i) => {
    if (i < DISC_SLOTS) discs[i].set(d.x, d.z, discRadius(d, f.chapter), 0);
  });
  const nodes = u.uNodes.value as THREE.Vector3[];
  NODES.forEach((n, i) => {
    if (i < NODE_SLOTS) nodes[i].set(n.x, n.z, f.nodeStrength[i]);
  });
}

