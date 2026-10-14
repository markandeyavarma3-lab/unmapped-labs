"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { terrainHeight } from "./terrain-math";
import { buildTitle, letterHeight, LETTER_HEIGHT, type TitleLayout } from "./title-glyphs";
import { frame } from "./frame-state";
import { makeTerrainMaterial, updateTerrainUniforms } from "./terrain-material";
import type { Tier } from "./Scene";

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/**
 * "UNMAPPED LABS", sculpted into the ground: a fine-resolution patch of the
 * same terrain with letter mesas added. The letters rise out of the fog
 * during the entrance and glow while the tagline is drawn.
 */
export function TitleRelief({ tier, introDelay }: { tier: Tier; introDelay: number }) {
  const mesh = useRef<THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>>(null);

  const { geometry, range } = useMemo(() => {
    const layout: TitleLayout = window.innerWidth / window.innerHeight < 0.9 ? "stacked" : "line";
    const shape = buildTitle(layout);
    const step = tier === "high" ? 0.09 : 0.14;
    const w = shape.maxX - shape.minX;
    const d = shape.maxZ - shape.minZ;
    const geo = new THREE.PlaneGeometry(w, d, Math.round(w / step), Math.round(d / step));
    geo.rotateX(-Math.PI / 2);
    geo.translate((shape.minX + shape.maxX) / 2, 0, (shape.minZ + shape.maxZ) / 2);

    const pos = geo.attributes.position as THREE.BufferAttribute;
    const letter = new Float32Array(pos.count);
    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const base = terrainHeight(x, z) + 0.05;
      const l = letterHeight(shape, x, z);
      letter[i] = l;
      // Normals are computed with the letters fully raised.
      pos.setY(i, base + l);
      min = Math.min(min, base);
      max = Math.max(max, base + l);
    }
    geo.computeVertexNormals();
    for (let i = 0; i < pos.count; i++) pos.setY(i, pos.getY(i) - letter[i]);
    geo.setAttribute("aLetter", new THREE.BufferAttribute(letter, 1));
    geo.computeBoundingSphere();
    return { geometry: geo, range: [min, max - LETTER_HEIGHT * 0.4] as [number, number] };
  }, [tier]);

  const material = useMemo(() => {
    const m = makeTerrainMaterial(range, true);
    // No bloom on the light tier: the letters carry their own extra brightness.
    m.uniforms.uTitleGain.value = tier === "high" ? 1 : 1.8;
    return m;
  }, [range, tier]);

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  useFrame((state) => {
    if (!mesh.current) return;
    const u = mesh.current.material.uniforms;
    const t = state.clock.elapsedTime;
    updateTerrainUniforms(u, t);
    // Rise: the name lifts out of the ground just after the entrance begins.
    const r = clamp01((t - introDelay - 0.35) / 2.6);
    u.uRise.value = 1 - Math.pow(1 - r, 4);
    // Glow peaks while the tagline is drawn, then settles.
    const c = frame.chapter;
    u.uTitleGlow.value = THREE.MathUtils.smoothstep(c, 0.15, 0.9) * (1 - THREE.MathUtils.smoothstep(c, 1.6, 2.6));
  });

  return <mesh ref={mesh} geometry={geometry} material={material} frustumCulled={false} renderOrder={1} />;
}
