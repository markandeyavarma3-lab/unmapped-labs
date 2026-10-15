"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { DISTRICTS, DISTRICT_LIST, LOGISTICS_BYPASS, type DistrictId, type FixType } from "./city-layout";
import { buildDistrictScenes } from "./district-scenes";
import { cityState } from "./city-state";
import { frame } from "./frame-state";
import { cityLabels, serviceLabels } from "./world-store";
import { CHAPTER } from "./landmarks";
import { MODELS } from "./models.generated";
import { createBatch, createPaletteMaterial, useModels, releaseBatch } from "./models";
import { PYLON_ATTACH } from "./procedural";
import { mulberry32 } from "./terrain-math";
import { focus } from "@/content/site-content";
import type { Tier } from "./Scene";

/**
 * The five districts as living miniature scenes, and the story each plays:
 * a red bottleneck → a diagnostic scan → a fork of four possible fixes →
 * the right one arrives and the scene comes right.
 */

const TEAL = new THREE.Color("#12a4ab");
const LIME = new THREE.Color("#9bdc28");
const RED = new THREE.Color("#ff4b3a");
const SLATE = new THREE.Color("#8b97a3");
const FIX_ORDER: FixType[] = ["software", "hardware", "process", "data"];

const PROBLEM_TEXT: Partial<Record<DistrictId, string>> = {
  farms: focus.areas[0].scenario.problem,
  logistics: focus.areas[1].scenario.problem,
  healthcare: focus.areas[2].scenario.problem,
  energy: focus.areas[3].scenario.problem,
  open: focus.areas[4].scenario.problem,
  markets: "Raw disclosures: no history, and no idea who is really trading.",
};

/* ------------------------------------------------------------------ */
/* Shaders                                                            */
/* ------------------------------------------------------------------ */

const flatVertex = /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

/** A screen floating over the scene: kind 0 = a selector (rows, one picked), kind 1 = a forecast chart. */
const screenFragment = /* glsl */ `
  uniform float uAmount; uniform float uTime; uniform float uKind;
  uniform vec3 uTeal; uniform vec3 uLime;
  varying vec2 vUv;
  float box(vec2 p, vec2 a, vec2 b) { return step(a.x, p.x) * step(p.x, b.x) * step(a.y, p.y) * step(p.y, b.y); }
  void main() {
    vec2 p = vUv;
    float edgeD = min(min(p.x, 1.0 - p.x), min(p.y, 1.0 - p.y));
    vec3 col = vec3(0.03, 0.09, 0.11);
    float a = 0.82;
    col = mix(col, uTeal, 1.0 - smoothstep(0.0, 0.02, edgeD));
    vec2 g = abs(fract(p * vec2(10.0, 6.0) - 0.5) - 0.5) / fwidth(p * vec2(10.0, 6.0));
    col += uTeal * (1.0 - min(min(g.x, g.y), 1.0)) * 0.12;
    if (uKind < 0.5) {
      col += uTeal * box(p, vec2(0.08, 0.76), vec2(0.42, 0.88)) * 0.6;
      col += uTeal * box(p, vec2(0.52, 0.76), vec2(0.92, 0.88)) * 0.6;
      for (int i = 0; i < 4; i++) {
        float y = 0.12 + float(i) * 0.145;
        float picked = float(i == 2) * step(0.6, uAmount);
        float w = 0.45 + 0.4 * fract(sin(float(i) * 12.9) * 43.7);
        float r = box(p, vec2(0.08, y), vec2(0.08 + w * 0.84, y + 0.075));
        col = mix(col, mix(uTeal * 0.8, uLime, picked), r);
      }
    } else {
      for (int i = 0; i < 8; i++) {
        float x = 0.1 + float(i) * 0.105;
        float h = (0.25 + 0.5 * fract(sin(float(i) * 7.3) * 91.1)) * uAmount * 0.72;
        col = mix(col, uTeal * 0.85, box(p, vec2(x, 0.12), vec2(x + 0.07, 0.12 + h)));
      }
      float line = 0.12 + (0.35 + 0.18 * sin(p.x * 7.0 + 1.0)) * uAmount * 0.72;
      float l = 1.0 - smoothstep(0.0, 0.014, abs(p.y - line));
      col = mix(col, uLime, l * step(0.1, p.x) * step(p.x, 0.92));
    }
    col += uTeal * (1.0 - smoothstep(0.0, 0.04, abs(p.y - fract(uTime * 0.45)))) * 0.25;
    gl_FragColor = vec4(col, a * uAmount);
    #include <colorspace_fragment>
  }
`;

const ringFragment = /* glsl */ `
  uniform vec3 uColor; uniform float uOpacity; uniform float uFill; varying vec2 vUv;
  void main() {
    float d = length(vUv - 0.5) * 2.0;
    float ring = 1.0 - smoothstep(0.0, 0.07, abs(d - 0.88));
    float fill = (1.0 - smoothstep(0.75, 0.9, d)) * uFill;
    float a = max(ring, fill) * uOpacity;
    if (a < 0.003) discard;
    gl_FragColor = vec4(uColor, a);
    #include <colorspace_fragment>
  }
`;

const overlay = (fragmentShader: string, uniforms: Record<string, THREE.IUniform>) =>
  new THREE.ShaderMaterial({ vertexShader: flatVertex, fragmentShader, uniforms, transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });

/** Fields: dry, cracked earth until water reaches them, then green rows. */
function fieldMaterial(uniforms: { uWater: THREE.IUniform; uCanalZ: THREE.IUniform }) {
  const mat = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 1 });
  mat.onBeforeCompile = (s) => {
    s.uniforms.uWater = uniforms.uWater;
    s.uniforms.uCanalZ = uniforms.uCanalZ;
    s.vertexShader = s.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vFW;")
      .replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\nvFW = (modelMatrix * vec4(transformed, 1.0)).xyz;");
    s.fragmentShader = s.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vFW; uniform float uWater; uniform float uCanalZ;")
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
        {
          float rows = abs(fract(vFW.z / 0.42) - 0.5) * 2.0;
          vec3 dry = mix(vec3(0.55, 0.38, 0.19), vec3(0.68, 0.5, 0.27), rows);
          float crack = step(0.93, fract(sin(dot(floor(vFW.xz * 9.0), vec2(12.9, 78.2))) * 437.5));
          dry *= 1.0 - crack * 0.25;
          vec3 wet = mix(vec3(0.16, 0.1, 0.05), vec3(0.24, 0.42, 0.1), smoothstep(0.25, 0.6, rows));
          // water spreads outward from the canal
          float reach = uWater * 6.5;
          float wetness = 1.0 - smoothstep(reach - 0.6, reach, abs(vFW.z - uCanalZ));
          diffuseColor.rgb = mix(dry, wet, wetness);
        }`,
      );
  };
  return mat;
}

function canalMaterial(uniforms: { uFill: THREE.IUniform; uTime: THREE.IUniform }) {
  const mat = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.25 });
  mat.onBeforeCompile = (s) => {
    s.uniforms.uFill = uniforms.uFill;
    s.uniforms.uTime = uniforms.uTime;
    s.vertexShader = s.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vCW;")
      .replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\nvCW = (modelMatrix * vec4(transformed, 1.0)).xyz;");
    s.fragmentShader = s.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vCW; uniform float uFill; uniform float uTime;")
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
        {
          vec3 mud = vec3(0.36, 0.25, 0.14);
          vec3 water = vec3(0.12, 0.45, 0.62);
          float ripple = 0.5 + 0.5 * sin(vCW.x * 9.0 + uTime * 4.0 + sin(vCW.z * 30.0));
          water += vec3(0.25, 0.3, 0.3) * pow(ripple, 8.0) * 0.6;
          // a trickle while the pump is wrong; full flow once it's fixed
          float level = mix(0.18, 1.0, uFill);
          diffuseColor.rgb = mix(mud, water, level);
        }`,
      );
  };
  return mat;
}

/* ------------------------------------------------------------------ */

const catenary = (a: THREE.Vector3, b: THREE.Vector3, sag: number, n = 12) => {
  const pts: THREE.Vector3[] = [];
  for (let k = 0; k <= n; k++) {
    const t = k / n;
    pts.push(new THREE.Vector3().lerpVectors(a, b, t).add(new THREE.Vector3(0, -Math.sin(t * Math.PI) * sag, 0)));
  }
  return pts;
};

export function Districts({ tier }: { tier: Tier }) {
  const geos = useModels();

  const built = useMemo(() => {
    const scenes = buildDistrictScenes();
    const material = createPaletteMaterial(tier);
    const placements = [
      ...scenes.placements,
      ...scenes.pylons.map((p) => ({ m: "proc-pylon" as const, x: p.x, z: p.z, ry: p.ry, s: 1 })),
      ...scenes.turbines.map((t) => ({ m: "ind-windmill" as const, x: t.x, z: t.z, ry: 0, s: t.s, tint: 0xfaf8f4 })),
      { m: "proc-ship" as const, x: scenes.ship.x, z: scenes.ship.z, ry: 0, s: 1 },
      { m: "proc-crane-mast" as const, x: scenes.crane.x, z: scenes.crane.z, ry: 0, s: 1 },
    ];
    const batch = createBatch(geos, placements, material);
    const tagged = (tag: string) => scenes.placements.map((p, i) => (p.tag === tag ? i : -1)).filter((i) => i >= 0).map((i) => ({ p: scenes.placements[i], id: batch.instances[i] }));

    // Farms: fields, crops and the canal.
    const water = { uWater: { value: 0 }, uCanalZ: { value: scenes.canal.z } };
    const fieldMat = fieldMaterial(water);
    const fieldGeos = scenes.fields.map((f) => {
      const g = new THREE.PlaneGeometry(f.x1 - f.x0, f.z1 - f.z0);
      g.rotateX(-Math.PI / 2);
      g.translate((f.x0 + f.x1) / 2, 0.012, (f.z0 + f.z1) / 2);
      return g;
    });
    const rand = mulberry32(31);
    const cropSpots: { x: number; z: number; r: number }[] = [];
    for (const f of scenes.fields)
      for (let z = f.z0 + 0.25; z < f.z1 - 0.15; z += 0.42)
        for (let x = f.x0 + 0.2; x < f.x1 - 0.15; x += tier === "high" ? 0.3 : 0.45) cropSpots.push({ x: x + (rand() - 0.5) * 0.06, z, r: rand() });
    const cropMat = createPaletteMaterial(tier);
    const crops = new THREE.InstancedMesh(geos["nat-crops_leafsStageB"], cropMat, cropSpots.length);
    crops.castShadow = true;
    crops.receiveShadow = true;
    crops.setColorAt(0, new THREE.Color());
    const canalU = { uFill: { value: 0 }, uTime: { value: 0 } };
    const canalGeo = new THREE.PlaneGeometry(scenes.canal.x1 - scenes.canal.x0, scenes.canal.w);
    canalGeo.rotateX(-Math.PI / 2);
    canalGeo.translate((scenes.canal.x0 + scenes.canal.x1) / 2, 0.022, scenes.canal.z);
    const canalMat = canalMaterial(canalU);

    // Quay deck.
    const q = scenes.quay;
    const quayGeo = new THREE.BoxGeometry(q.x1 - q.x0, 0.2, q.z1 - q.z0);
    quayGeo.translate((q.x0 + q.x1) / 2, 0.02, (q.z0 + q.z1) / 2);
    const quayMat = new THREE.MeshStandardMaterial({ color: "#c9c2b6", roughness: 0.95 });

    // Energy: cables between the pylons, and from the last one into the substation.
    const E = DISTRICTS.energy;
    const tubes: THREE.BufferGeometry[] = [];
    const cablePts: THREE.Vector3[][] = [];
    for (let i = 0; i < scenes.pylons.length; i++) {
      const a = scenes.pylons[i];
      const b = scenes.pylons[i + 1] ?? { x: E.x - 0.6, z: a.z };
      for (const [ax, ay] of PYLON_ATTACH) {
        const p0 = new THREE.Vector3(a.x + ax, ay, a.z);
        const p1 = new THREE.Vector3(b.x + ax, i + 1 < scenes.pylons.length ? ay : 1.4, b.z);
        const pts = catenary(p0, p1, 0.28);
        cablePts.push(pts);
        tubes.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.012, 4, false));
      }
    }
    const cableGeo = mergeTubes(tubes);
    const cableMat = new THREE.MeshStandardMaterial({ color: "#3c4148", roughness: 0.6 });
    const cableCurves = cablePts.map((p) => new THREE.CatmullRomCurve3(p));
    // Energy pulses riding the line (white → lime once sensors watch it).
    const pulseCount = cableCurves.length * 3;
    const pulses = new THREE.InstancedMesh(new THREE.SphereGeometry(0.045, 8, 6), new THREE.MeshBasicMaterial({ color: "#ffffff", toneMapped: false }), pulseCount);
    pulses.setColorAt(0, new THREE.Color());

    // Turbine blades (each spins about its hub).
    const pivot = MODELS["ind-windmill-blades"].pivot;
    const blades = new THREE.InstancedMesh(geos["ind-windmill-blades"], material, scenes.turbines.length);
    blades.castShadow = true;

    // Open district: the idle tower crane's jib.
    const jib = new THREE.Mesh(geos["proc-crane-jib"], material);
    jib.castShadow = true;
    jib.position.set(scenes.crane.x, 4.78, scenes.crane.z);

    /* story pieces */
    const screens = {
      software: overlay(screenFragment, { uAmount: { value: 0 }, uTime: { value: 0 }, uKind: { value: 0 }, uTeal: { value: TEAL.clone() }, uLime: { value: LIME.clone() } }),
      data: overlay(screenFragment, { uAmount: { value: 0 }, uTime: { value: 0 }, uKind: { value: 1 }, uTeal: { value: TEAL.clone() }, uLime: { value: LIME.clone() } }),
    };
    const markers = DISTRICT_LIST.map(() => ({
      red: overlay(ringFragment, { uColor: { value: RED.clone() }, uOpacity: { value: 0 }, uFill: { value: 0.18 } }),
      scan: overlay(ringFragment, { uColor: { value: TEAL.clone() }, uOpacity: { value: 0 }, uFill: { value: 0 } }),
      warn: new THREE.MeshBasicMaterial({ color: RED.clone(), transparent: true, opacity: 0, toneMapped: false }),
    }));
    const sensorRing = overlay(ringFragment, { uColor: { value: LIME.clone() }, uOpacity: { value: 0 }, uFill: { value: 0 } });
    const bypassGeo = (() => {
      // the new lane: a road strip that unrolls along the bypass
      const pts = LOGISTICS_BYPASS.slice(2);
      const parts: THREE.BufferGeometry[] = [];
      for (let i = 0; i < pts.length - 1; i++) {
        const [x0, z0] = pts[i], [x1, z1] = pts[i + 1];
        const len = Math.hypot(x1 - x0, z1 - z0);
        const g = new THREE.PlaneGeometry(0.6, len + 0.6);
        g.rotateX(-Math.PI / 2);
        g.rotateY(Math.atan2(x1 - x0, z1 - z0));
        g.translate((x0 + x1) / 2, 0.025, (z0 + z1) / 2);
        parts.push(g);
      }
      return mergeTubes(parts);
    })();
    const bypassMat = new THREE.MeshStandardMaterial({ color: "#3a3d44", roughness: 0.9, transparent: true, opacity: 0 });
    const forkMats = FIX_ORDER.map(() => new THREE.MeshBasicMaterial({ color: TEAL.clone(), transparent: true, opacity: 0, toneMapped: false, depthWrite: false }));

    return {
      scenes, material, batch, tagged: { dock2: tagged("dock2"), transformer: tagged("transformer"), cross: tagged("cross") },
      water, fieldMat, fieldGeos, crops, cropMat, cropSpots, canalU, canalGeo, canalMat, quayGeo, quayMat,
      cableGeo, cableMat, cableCurves, pulses, pulseCount, blades, pivot, jib,
      screens, markers, sensorRing, bypassGeo, bypassMat, forkMats,
    };
  }, [geos, tier]);

  useEffect(
    () => () => {
      const b = built;
      releaseBatch(b.batch.mesh);
      [b.material, b.fieldMat, b.cropMat, b.canalMat, b.quayMat, b.cableMat, b.sensorRing, b.bypassMat, b.screens.software, b.screens.data, ...b.forkMats].forEach((m) => m.dispose());
      b.markers.forEach((m) => [m.red, m.scan, m.warn].forEach((x) => x.dispose()));
      [...b.fieldGeos, b.canalGeo, b.quayGeo, b.cableGeo, b.bypassGeo, b.pulses.geometry].forEach((g) => g.dispose());
      (b.pulses.material as THREE.Material).dispose();
      b.crops.dispose();
      b.pulses.dispose();
      b.blades.dispose();
    },
    [built],
  );

  const ref = useRef(built);
  useEffect(() => {
    ref.current = built;
  }, [built]);

  const screenRefs = useRef<{ software: THREE.Mesh | null; data: THREE.Mesh | null }>({ software: null, data: null });
  const markerRefs = useRef<{ red: THREE.Mesh | null; scan: THREE.Mesh | null; warn: THREE.Mesh | null }[]>([]);
  const sensorRefs = useRef<(THREE.Group | null)[]>([]);
  const forkRefs = useRef<(THREE.Mesh | null)[]>([]);
  const lens = useRef<THREE.Mesh>(null);
  const beacon = useRef<THREE.Mesh>(null);
  const tmp = useRef({
    v: new THREE.Vector3(), a: new THREE.Vector3(), b: new THREE.Vector3(), right: new THREE.Vector3(), up: new THREE.Vector3(0, 1, 0),
    m: new THREE.Matrix4(), q: new THREE.Quaternion(), p: new THREE.Vector3(), s: new THREE.Vector3(), c: new THREE.Color(), e: new THREE.Euler(),
    lastFocus: "", lastWater: -1,
  });

  useFrame((state) => {
    const b = ref.current;
    const t = state.clock.elapsedTime;
    const cam = state.camera;
    const T = tmp.current;
    const W = state.size.width, H = state.size.height;
    const project = (p: THREE.Vector3, padX = 150) => {
      T.v.copy(p).project(cam);
      const x = (T.v.x * 0.5 + 0.5) * W;
      const y = (-T.v.y * 0.5 + 0.5) * H;
      return { x: Math.min(W - padX, Math.max(padX, x)), y: Math.min(H - 40, Math.max(110, y)), ok: T.v.z < 1 && Math.abs(T.v.x) < 1.15 && Math.abs(T.v.y) < 1.15 };
    };
    const farms = cityState.farms, logi = cityState.logistics, health = cityState.healthcare, energy = cityState.energy, markets = cityState.markets;

    /* Farms: water spreads from the canal, crops stand up and turn green. */
    b.water.uWater.value = farms.fixed;
    b.canalU.uFill.value = farms.fixed;
    b.canalU.uTime.value = t;
    if (Math.abs(T.lastWater - farms.fixed) > 0.002) {
      T.lastWater = farms.fixed;
      const reach = farms.fixed * 6.5;
      b.cropSpots.forEach((c, i) => {
        const wet = THREE.MathUtils.clamp((reach - Math.abs(c.z - b.scenes.canal.z)) / 0.8, 0, 1);
        const s = 0.32 + 0.36 * wet + c.r * 0.06;
        T.q.setFromAxisAngle(T.up, c.r * 6.28);
        b.crops.setMatrixAt(i, T.m.compose(T.p.set(c.x, 0.01, c.z), T.q, T.s.set(s, s * (0.7 + wet * 0.5), s)));
        // dry: straw yellow; watered: fresh green (the kit's greens lean teal, so pull the blue down)
        b.crops.setColorAt(i, T.c.setRGB(3.0 - wet * 1.7, 0.78 + wet * 0.22, 0.2 + wet * 0.22));
      });
      b.crops.instanceMatrix.needsUpdate = true;
      if (b.crops.instanceColor) b.crops.instanceColor.needsUpdate = true;
    }

    /* Logistics: the second dock rises; the new lane unrolls. */
    for (const { p, id } of b.tagged.dock2) {
      const k = Math.max(0.001, logi.fixed);
      T.q.setFromAxisAngle(T.up, p.ry);
      b.batch.mesh.setMatrixAt(id, T.m.compose(T.p.set(p.x, 0, p.z), T.q, T.s.set(p.s, p.s * k, p.s)));
    }
    b.bypassMat.opacity = Math.min(1, logi.fixed * 1.5);

    /* Healthcare: the cross pulses red while patients pile up. */
    for (const { id } of b.tagged.cross) b.batch.mesh.setColorAt(id, T.c.setRGB(1, 1, 1).lerp(new THREE.Color(1.6, 0.4, 0.35), health.problem * (0.5 + 0.5 * Math.sin(t * 5))));

    /* Energy: transformers flicker red under overload; sensors arrive; pulses ride the line. */
    b.tagged.transformer.forEach(({ id }, i) => {
      const over = energy.problem * (0.5 + 0.5 * Math.sin(t * 17 + i * 1.7));
      b.batch.mesh.setColorAt(id, T.c.setRGB(1 + over * 1.2, 1 - over * 0.6, 1 - over * 0.65));
    });
    const lime = energy.fixed;
    for (let i = 0; i < b.pulseCount; i++) {
      const curve = b.cableCurves[i % b.cableCurves.length];
      const u = (t * 0.25 + Math.floor(i / b.cableCurves.length) / 3) % 1;
      curve.getPointAt(u, T.p);
      const s = 0.6 + 0.4 * Math.sin(t * 6 + i);
      b.pulses.setMatrixAt(i, T.m.compose(T.p, T.q.identity(), T.s.setScalar(s * (0.5 + energy.lit * 0.5))));
      b.pulses.setColorAt(i, T.c.setRGB(1, 1, 1).lerp(new THREE.Color(0.6, 0.95, 0.15), lime).lerp(new THREE.Color(1, 0.3, 0.2), energy.problem * (Math.sin(t * 9) > 0 ? 1 : 0)));
    }
    b.pulses.instanceMatrix.needsUpdate = true;
    if (b.pulses.instanceColor) b.pulses.instanceColor.needsUpdate = true;
    sensorRefs.current.forEach((g, i) => {
      if (!g) return;
      const k = THREE.MathUtils.clamp(energy.fixed * 4 - i * 0.6, 0, 1);
      g.scale.setScalar(Math.max(0.001, k));
      g.rotation.y = t * 1.5;
    });
    b.sensorRing.uniforms.uOpacity.value = energy.fixed * (1 - ((t * 0.8) % 1));

    /* Turbines spin (offshore ones a little faster). */
    b.scenes.turbines.forEach((tb, i) => {
      T.e.set((t * (1.1 + (i % 3) * 0.15) + i) % (Math.PI * 2), 0, 0);
      T.q.setFromEuler(T.e);
      T.p.set(tb.x + b.pivot[0] * tb.s, b.pivot[1] * tb.s, tb.z + b.pivot[2] * tb.s);
      b.blades.setMatrixAt(i, T.m.compose(T.p, T.q, T.s.setScalar(tb.s)));
    });
    b.blades.instanceMatrix.needsUpdate = true;
    b.jib.rotation.y = Math.sin(t * 0.12) * 0.6 + 0.8;

    /* Screens: the selector (software, farms) and the forecast (data, healthcare) face the camera. */
    const ss = screenRefs.current.software, sd = screenRefs.current.data;
    b.screens.software.uniforms.uAmount.value = farms.fixed * (1 - THREE.MathUtils.smoothstep(frame.chapter, 5.9, 6.4));
    b.screens.software.uniforms.uTime.value = t;
    b.screens.data.uniforms.uAmount.value = health.fixed * (1 - THREE.MathUtils.smoothstep(frame.chapter, 7.9, 8.4));
    b.screens.data.uniforms.uTime.value = t;
    if (ss) {
      ss.quaternion.copy(cam.quaternion);
      ss.scale.set(1, Math.max(0.001, farms.fixed), 1);
    }
    if (sd) {
      sd.quaternion.copy(cam.quaternion);
      sd.scale.set(1, Math.max(0.001, health.fixed), 1);
    }

    /* Markets: the lens that sorts the data. Open: a slow beacon. */
    if (lens.current) {
      lens.current.rotation.z = t * 0.6;
      lens.current.scale.setScalar(Math.max(0.001, markets.fixed));
    }
    if (beacon.current) {
      beacon.current.rotation.y = t * 0.7;
      beacon.current.position.y = 2.2 + Math.sin(t * 1.2) * 0.15;
    }

    /* Bottleneck markers and the diagnostic scan. */
    DISTRICT_LIST.forEach((d, i) => {
      const s = cityState[d.id];
      const m = b.markers[i];
      const r = markerRefs.current[i];
      const pulse = (t * 0.9) % 1;
      m.red.uniforms.uOpacity.value = s.problem * (0.6 + 0.4 * Math.sin(t * 5));
      m.warn.opacity = s.problem;
      m.scan.uniforms.uOpacity.value = s.diagnose * (1 - pulse);
      if (r?.scan) r.scan.scale.setScalar(0.4 + pulse * 3.2);
      if (r?.red) r.red.scale.setScalar(1 + Math.sin(t * 5) * 0.08);
      if (r?.warn) {
        r.warn.position.y = 1.5 + Math.sin(t * 3) * 0.12;
        r.warn.rotation.y = t * 2;
        r.warn.scale.setScalar(Math.max(0.001, s.problem));
      }
    });

    /* ---- Labels ---- */
    const quiet = 1 - frame.process;
    const fid = frame.process > 0.5 ? null : cityState.focus;
    const fd = fid ? DISTRICTS[fid] : null;
    const fs = fid ? cityState[fid] : null;

    const pl = cityLabels.problem;
    if (pl) {
      if (fid && fid !== T.lastFocus) {
        const txt = pl.querySelector("[data-text]");
        if (txt) txt.textContent = PROBLEM_TEXT[fid] ?? "";
        T.lastFocus = fid;
      }
      let op = 0;
      if (fd && fs) {
        const show = fd.fix ? fs.problem : fs.diagnose;
        const p = project(T.a.set(fd.jam[0], 1.9, fd.jam[1]));
        pl.style.transform = `translate3d(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px, 0)`;
        op = p.ok ? Math.min(1, show * 1.4) * (1 - fs.fixed) * quiet : 0;
      }
      pl.style.opacity = String(op);
    }

    // The fork: four branches rising from the bottleneck; the right one is chosen.
    if (fd && fs) {
      T.right.setFromMatrixColumn(cam.matrixWorld, 0).setY(0).normalize();
      T.a.set(fd.jam[0], 0.5, fd.jam[1]);
      FIX_ORDER.forEach((fx, k) => {
        T.b.copy(T.a).addScaledVector(T.right, (k - 1.5) * 1.55);
        T.b.y += 2.4 + (k === 1 || k === 2 ? 0.45 : 0);
        const chosen = fd.fix === fx && fs.fixed > 0.45;
        const dim = fs.fixed > 0.45 && !chosen;
        const mesh = forkRefs.current[k];
        const mat = b.forkMats[k];
        mat.color.copy(chosen ? LIME : dim ? SLATE : TEAL);
        mat.opacity = fs.diagnose * (dim ? 0.35 : 0.95) * quiet;
        if (mesh) {
          const len = T.a.distanceTo(T.b);
          mesh.position.copy(T.a).add(T.b).multiplyScalar(0.5);
          mesh.quaternion.setFromUnitVectors(T.up, T.v.copy(T.b).sub(T.a).normalize());
          mesh.scale.set(chosen ? 1.8 : 1, len, chosen ? 1.8 : 1);
          mesh.visible = fs.diagnose > 0.01;
        }
        const el = cityLabels.fork[k];
        if (el) {
          const p = project(T.b, 70);
          el.style.transform = `translate3d(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px, 0)`;
          el.style.opacity = String(p.ok ? fs.diagnose * quiet : 0);
          el.dataset.state = chosen ? "chosen" : dim ? "dim" : "idle";
        }
      });
    } else {
      forkRefs.current.forEach((m) => m && (m.visible = false));
      cityLabels.fork.forEach((el) => el && (el.style.opacity = "0"));
    }

    // Services chapter: each fix type pinned to where it was used in the city.
    const showServices = THREE.MathUtils.smoothstep(frame.chapter, CHAPTER.services - 0.35, CHAPTER.services - 0.1) * (1 - THREE.MathUtils.smoothstep(frame.chapter, CHAPTER.services + 0.45, CHAPTER.services + 0.7));
    const E = DISTRICTS.energy;
    const anchors: [number, number, number][] = [
      [DISTRICTS.farms.jam[0] - 1, 2.6, DISTRICTS.farms.jam[1]],
      [b.scenes.pylons[1].x, 3.2, E.z - 3.3],
      [LOGISTICS_BYPASS[3][0], 1.4, LOGISTICS_BYPASS[3][1]],
      [DISTRICTS.healthcare.jam[0] - 1, 3.4, DISTRICTS.healthcare.jam[1]],
    ];
    anchors.forEach(([x, y, z], k) => {
      const el = serviceLabels[k];
      if (!el) return;
      const p = project(T.a.set(x, y, z));
      el.style.transform = `translate3d(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px, 0)`;
      el.style.opacity = String(p.ok && W >= 700 ? showServices : 0);
    });
  });

  const S = built.scenes;
  const Fm = DISTRICTS.farms;
  const Hc = DISTRICTS.healthcare;
  const M = DISTRICTS.markets;
  const O = DISTRICTS.open;

  return (
    <group>
      <primitive object={built.batch.mesh} />
      {built.fieldGeos.map((g, i) => (
        <mesh key={i} geometry={g} material={built.fieldMat} receiveShadow />
      ))}
      <primitive object={built.crops} />
      <mesh geometry={built.canalGeo} material={built.canalMat} receiveShadow />
      <mesh geometry={built.quayGeo} material={built.quayMat} receiveShadow castShadow />
      <mesh geometry={built.cableGeo} material={built.cableMat} castShadow />
      <mesh geometry={built.bypassGeo} material={built.bypassMat} receiveShadow />
      <primitive object={built.pulses} />
      <primitive object={built.blades} />
      <primitive object={built.jib} />

      {/* Software: the pump selector over the farms' gate */}
      <mesh ref={(m) => void (screenRefs.current.software = m)} position={[Fm.jam[0] - 0.6, 2.2, Fm.jam[1] - 0.6]} material={built.screens.software} renderOrder={4}>
        <planeGeometry args={[2.3, 1.45]} />
      </mesh>
      {/* Data & AI: the arrivals forecast over the hospital gate */}
      <mesh ref={(m) => void (screenRefs.current.data = m)} position={[Hc.jam[0] - 0.6, 2.4, Hc.jam[1] - 0.6]} material={built.screens.data} renderOrder={4}>
        <planeGeometry args={[2.3, 1.45]} />
      </mesh>

      {/* Hardware: sensors on the pylon tops */}
      {S.pylons.map((p, i) => (
        <group key={i} position={[p.x, 2.62, p.z]} ref={(g) => void (sensorRefs.current[i] = g)}>
          <mesh>
            <octahedronGeometry args={[0.13, 0]} />
            <meshBasicMaterial color={LIME} toneMapped={false} />
          </mesh>
          <mesh rotation-x={-Math.PI / 2} material={built.sensorRing}>
            <planeGeometry args={[1.2, 1.2]} />
          </mesh>
        </group>
      ))}

      {/* Markets: the lens over the exchange (Deal Lens) */}
      <mesh ref={lens} position={[M.x + 0.6, 4.3, M.z]} rotation-x={Math.PI / 2}>
        <torusGeometry args={[1.3, 0.06, 8, 48]} />
        <meshBasicMaterial color={LIME} toneMapped={false} />
      </mesh>

      {/* Uncharted: a beacon over the empty lots */}
      <mesh ref={beacon} position={[O.x, 2.2, O.z]}>
        <octahedronGeometry args={[0.45, 0]} />
        <meshBasicMaterial color={TEAL} wireframe toneMapped={false} />
      </mesh>

      {/* Bottleneck markers and scans */}
      {DISTRICT_LIST.map((d, i) => (
        <group key={d.id} position={[d.jam[0], 0.04, d.jam[1]]}>
          <mesh rotation-x={-Math.PI / 2} material={built.markers[i].red} renderOrder={3} ref={(m) => void (markerRefs.current[i] = { ...(markerRefs.current[i] ?? { red: null, scan: null, warn: null }), red: m })}>
            <planeGeometry args={[1.7, 1.7]} />
          </mesh>
          <mesh rotation-x={-Math.PI / 2} material={built.markers[i].scan} renderOrder={3} ref={(m) => void (markerRefs.current[i] = { ...(markerRefs.current[i] ?? { red: null, scan: null, warn: null }), scan: m })}>
            <planeGeometry args={[1.7, 1.7]} />
          </mesh>
          <mesh material={built.markers[i].warn} ref={(m) => void (markerRefs.current[i] = { ...(markerRefs.current[i] ?? { red: null, scan: null, warn: null }), warn: m })}>
            <octahedronGeometry args={[0.18, 0]} />
          </mesh>
        </group>
      ))}

      {/* The fork */}
      {FIX_ORDER.map((fx, k) => (
        <mesh key={fx} material={built.forkMats[k]} ref={(m) => void (forkRefs.current[k] = m)} visible={false} renderOrder={5}>
          <cylinderGeometry args={[0.035, 0.035, 1, 6, 1, true]} />
        </mesh>
      ))}
    </group>
  );
}

function mergeTubes(parts: THREE.BufferGeometry[]) {
  // Plain merge of geometries sharing position/normal.
  const pos: number[] = [], nrm: number[] = [];
  for (const p of parts) {
    const g = p.index ? p.toNonIndexed() : p;
    pos.push(...(g.attributes.position.array as Float32Array));
    nrm.push(...(g.attributes.normal.array as Float32Array));
    if (g !== p) g.dispose();
    p.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute("normal", new THREE.Float32BufferAttribute(nrm, 3));
  return out;
}
