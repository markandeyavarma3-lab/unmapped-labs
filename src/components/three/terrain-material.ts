import * as THREE from "three";
import { NODES, SURVEY_DISCS, UNMAPPED_HOLD, discRadius } from "./landmarks";
import { DISC_SLOTS, NODE_SLOTS, hexToVec3, terrainFragment, terrainVertex } from "./shaders";
import { frame } from "./frame-state";

const INK = hexToVec3("#080b0e");
const LINE = hexToVec3("#9fb3c4");
const CYAN = hexToVec3("#65e4e8");
const FOG: [number, number] = [16, 62];
const FOG_TINT = hexToVec3("#16212a");

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

