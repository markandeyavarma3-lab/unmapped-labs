"use client";

import { useMemo } from "react";
import { useLoader } from "@react-three/fiber";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import type { AnyModel, Placement } from "./city-layout";
import { buildProcGeometries } from "./procedural";

/**
 * The Kenney CC0 model library (public/models/city.glb, built by
 * scripts/build-models.mts): one untextured mesh per model, colours baked
 * into vertices. Loaded once, converted to plain float geometry so every
 * model can share a BatchedMesh.
 */

export const MODEL_URL = "/models/city.glb";

export type Geometries = Record<string, THREE.BufferGeometry>;
const cache = new WeakMap<object, Geometries>();

function toFloatGeometry(mesh: THREE.Mesh) {
  mesh.updateMatrix();
  const src = mesh.geometry;
  const g = new THREE.BufferGeometry();
  for (const name of ["position", "normal", "color"]) {
    const a = src.getAttribute(name);
    const arr = new Float32Array(a.count * 3);
    for (let i = 0; i < a.count; i++) {
      arr[i * 3] = a.getX(i);
      arr[i * 3 + 1] = a.getY(i);
      arr[i * 3 + 2] = a.getZ(i);
    }
    g.setAttribute(name, new THREE.BufferAttribute(arr, 3));
  }
  g.setIndex(new THREE.BufferAttribute(new Uint32Array(src.index!.array), 1));
  // Quantised meshes carry their dequantisation in the node transform.
  g.applyMatrix4(mesh.matrix);
  g.computeBoundingBox();
  g.computeBoundingSphere();
  return g;
}

export function useModels(): Geometries {
  const gltf = useLoader(GLTFLoader, MODEL_URL, (loader) => {
    (loader as GLTFLoader).setMeshoptDecoder(MeshoptDecoder);
  });
  return useMemo(() => {
    let geos = cache.get(gltf);
    if (!geos) {
      const out = {} as Geometries;
      // Converted on first use: only models the city actually places pay the cost.
      gltf.scene.traverse((o) => {
        if (!(o as THREE.Mesh).isMesh) return;
        let g: THREE.BufferGeometry | null = null;
        Object.defineProperty(out, o.name, { enumerable: true, get: () => (g ??= toFloatGeometry(o as THREE.Mesh)) });
      });
      Object.assign(out, buildProcGeometries());
      geos = out;
      cache.set(gltf, geos);
    }
    return geos;
  }, [gltf]);
}

/** The one material every model shares: vertex colours × per-instance tint, lit by the sun. */
export function createPaletteMaterial(tier: "high" | "low") {
  return tier === "high"
    ? new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82, metalness: 0 })
    : new THREE.MeshLambertMaterial({ vertexColors: true });
}

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();
const _c = new THREE.Color();
const _y = new THREE.Vector3(0, 1, 0);

export function composePlacement(p: Placement, out = _m) {
  _q.setFromAxisAngle(_y, p.ry);
  _p.set(p.x, p.y ?? 0, p.z);
  _s.set(p.s, p.s * (p.sy ?? 1), p.s);
  return out.compose(_p, _q, _s);
}

/**
 * Builds one BatchedMesh for a list of placements (each unique model's
 * geometry is stored once). Returns the mesh and each placement's instance id.
 */
export function createBatch(geos: Geometries, placements: Placement[], material: THREE.Material, extra = 0) {
  const used = [...new Set(placements.map((p) => p.m))];
  let verts = 0, indices = 0;
  for (const m of used) {
    verts += geos[m].attributes.position.count;
    indices += geos[m].index!.count;
  }
  const mesh = new THREE.BatchedMesh(placements.length + extra, verts, indices, material);
  const ids = new Map<AnyModel, number>();
  for (const m of used) ids.set(m, mesh.addGeometry(geos[m]));
  const instances = placements.map((p) => {
    const id = mesh.addInstance(ids.get(p.m)!);
    mesh.setMatrixAt(id, composePlacement(p));
    mesh.setColorAt(id, _c.setHex(p.tint ?? 0xffffff));
    return id;
  });
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return { mesh, instances, geometryIds: ids };
}

/** A batch for things that move: reserves geometry for each model up front. */
export function createDynamicBatch(geos: Geometries, models: AnyModel[], maxInstances: number, material: THREE.Material) {
  const used = [...new Set(models)];
  let verts = 0, indices = 0;
  for (const m of used) {
    verts += geos[m].attributes.position.count;
    indices += geos[m].index!.count;
  }
  const mesh = new THREE.BatchedMesh(maxInstances, verts, indices, material);
  const ids = new Map<AnyModel, number>();
  for (const m of used) ids.set(m, mesh.addGeometry(geos[m]));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.sortObjects = false;
  // Things that move: the whole-batch bounding sphere is computed once and cached, so it would
  // freeze wherever the instances happened to be on the first frame. Cull per instance instead.
  mesh.frustumCulled = false;
  return {
    mesh,
    add(m: AnyModel, tint = 0xffffff) {
      const id = mesh.addInstance(ids.get(m)!);
      mesh.setColorAt(id, _c.setHex(tint));
      return id;
    },
  };
}

/**
 * Frees a batch's GPU memory without breaking the object (BatchedMesh.dispose()
 * nulls its textures for good, which React's dev double-mount then trips on).
 */
export function releaseBatch(mesh: THREE.BatchedMesh) {
  mesh.geometry.dispose();
  const m = mesh as unknown as Record<string, THREE.Texture | null>;
  for (const k of ["_matricesTexture", "_colorsTexture", "_indirectTexture"]) m[k]?.dispose();
}
