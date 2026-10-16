"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { DEALLENS_AT, FLOWMATCH_AT } from "./landmarks";
import { frame } from "./frame-state";
import { STORY_CHAPTER, storySmooth } from "./story";
import { callout } from "./callouts";
import { beatWeight, faceCamera, overlay, pointScale, ringMaterial, smooth } from "./fx";
import { mulberry32 } from "./terrain-math";
import { work } from "@/content/site-content";
import type { Tier } from "./Scene";

/**
 * The two projects, acted out where they live in the city, each in four
 * beats while its section is pinned. Every number shown comes from the
 * project itself (site-content.ts).
 *   FlowMatch (by the farms' borewell): catalogue pages → 8,163 operating
 *     points forming pump curves → flow and depth narrow it down → one match.
 *   Deal Lens (at the exchange): raw deal slips swirl out → sorted into
 *     participant lanes → same-day round trips fall away → the rest stacks
 *     into a timeline since 2005.
 */

const LIME = new THREE.Color("#9bdc28");
const FM_SCENE = work.cases[0].scene;
const DL_SCENE = work.cases[1].scene;

/* ------------------------------------------------------------------ */
/* FlowMatch                                                           */
/* ------------------------------------------------------------------ */

const FM_C = new THREE.Vector3(...FLOWMATCH_AT);
const FM = { w: 4.6, h: 3.0 };
/** Chart space: flow 0–8 L/s across, head 0–100 m up. */
const QX = (q: number) => -1.9 + (q / 8) * 3.8;
const HY = (h: number) => -1.2 + (h / 100) * 2.4;
const TARGET = { q: 4, h: 55 };

const fmVertex = /* glsl */ `
  attribute vec3 aPage; attribute float aDelay; attribute float aMatch;
  uniform float uExtract; uniform float uSearch; uniform float uMatch; uniform float uScale; uniform float uTime; uniform vec2 uTarget;
  varying vec3 vCol; varying float vA;
  void main() {
    float e = smoothstep(aDelay, aDelay + 0.3, uExtract);
    vec3 p = mix(aPage, position, e);
    p.z += sin(e * 3.14159) * 0.6;
    vec3 ink = vec3(0.22, 0.25, 0.28);
    vec3 c = mix(ink, vec3(0.07, 0.6, 0.64), e);
    float near = 1.0 - smoothstep(0.0, 0.45, distance(position.xy, uTarget));
    float search = uSearch * (1.0 - uMatch);
    c = mix(c, vec3(0.05, 0.4, 0.45), near * search);
    c = mix(c, vec3(0.45, 0.78, 0.08), aMatch * uMatch);
    float a = smoothstep(aDelay - 0.03, aDelay + 0.02, uExtract);
    a *= mix(1.0, mix(0.25, 1.0, near), search);
    a *= mix(1.0, mix(0.14, 1.0, aMatch), uMatch);
    vCol = c; vA = a;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = 0.05 * (1.0 + aMatch * uMatch * 0.9 + near * search * 0.5) * uScale / -mv.z;
  }
`;
const dotFragment = /* glsl */ `
  uniform float uOpacity; varying vec3 vCol; varying float vA;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = (1.0 - smoothstep(0.35, 0.5, d)) * vA * uOpacity;
    if (a < 0.02) discard;
    gl_FragColor = vec4(vCol, a);
    #include <colorspace_fragment>
  }
`;
/** A catalogue page: a title bar, rows of figures and a small curve. */
const pageFragment = /* glsl */ `
  uniform float uOpacity; varying vec2 vUv;
  float box(vec2 p, vec2 a, vec2 b) { return step(a.x, p.x) * step(p.x, b.x) * step(a.y, p.y) * step(p.y, b.y); }
  void main() {
    vec2 p = vUv;
    vec3 col = vec3(0.99, 0.98, 0.95);
    col = mix(col, vec3(0.12, 0.47, 0.5), box(p, vec2(0.08, 0.86), vec2(0.62, 0.92)));
    float rows = step(0.5, fract(p.y * 22.0)) * box(p, vec2(0.08, 0.08), vec2(0.92, 0.46));
    col = mix(col, vec3(0.72, 0.72, 0.7), rows * 0.6);
    float curve = 0.55 + 0.25 * (1.0 - pow((p.x - 0.1) / 0.8, 2.0));
    col = mix(col, vec3(0.2, 0.22, 0.25), (1.0 - smoothstep(0.0, 0.012, abs(p.y - curve))) * box(p, vec2(0.1, 0.5), vec2(0.9, 0.84)));
    float edge = 1.0 - smoothstep(0.0, 0.015, min(min(p.x, 1.0 - p.x), min(p.y, 1.0 - p.y)));
    col = mix(col, vec3(0.75, 0.73, 0.68), edge);
    gl_FragColor = vec4(col, uOpacity);
    #include <colorspace_fragment>
  }
`;

/* ------------------------------------------------------------------ */
/* Deal Lens                                                           */
/* ------------------------------------------------------------------ */

const DL_C = new THREE.Vector3(...DEALLENS_AT);
const DL = { w: 5.4, h: 3.2 };
const TYPE_COLORS = ["#12a4ab", "#2f74c8", "#e9a52c", "#e2557a"].map((c) => new THREE.Color(c));
const YEARS = 20;

const dlVertex = /* glsl */ `
  attribute vec3 aSeed; attribute float aType; attribute float aRound; attribute float aYear; attribute float aStack;
  uniform float uLabel; uniform float uFilter; uniform float uMap; uniform float uTime; uniform float uScale;
  uniform vec3 uColors[4];
  varying vec3 vCol; varying float vA;
  void main() {
    float ang = aSeed.x * 6.2831 + uTime * (0.25 + aSeed.y * 0.35);
    float rad = 0.6 + aSeed.z * 2.0;
    vec3 raw = vec3(cos(ang) * rad, -0.5 + aSeed.y * 2.3 + sin(uTime * 0.8 + aSeed.x * 20.0) * 0.12, sin(ang) * rad * 0.5);
    float laneX = mod(aSeed.x * 4.8 + uTime * 0.22 * (0.6 + aSeed.z * 0.4), 4.8) - 2.4;
    vec3 lane = vec3(laneX, 1.1 - aType * 0.52 + (aSeed.y - 0.5) * 0.18, (aSeed.z - 0.5) * 0.12);
    float l = smoothstep(aSeed.z * 0.4, aSeed.z * 0.4 + 0.6, uLabel);
    vec3 p = mix(raw, lane, l);
    float fall = aRound * smoothstep(aSeed.y * 0.5, aSeed.y * 0.5 + 0.5, uFilter);
    p.y -= fall * 2.8;
    p.z += fall * 0.4;
    vec3 bar = vec3(-2.35 + (aYear + 0.5) * (4.7 / ${YEARS}.0) + (aSeed.x - 0.5) * 0.13, -1.35 + aStack * 0.036, 0.0);
    float m = (1.0 - aRound) * smoothstep(aSeed.x * 0.4, aSeed.x * 0.4 + 0.6, uMap);
    p = mix(p, bar, m);
    vec3 c = mix(vec3(0.82, 0.82, 0.8), uColors[int(aType)], l);
    c = mix(c, vec3(0.62, 0.62, 0.6), fall);
    vCol = c;
    vA = 1.0 - smoothstep(0.55, 1.0, fall);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = 0.075 * uScale / -mv.z;
  }
`;
const slipFragment = /* glsl */ `
  uniform float uOpacity; varying vec3 vCol; varying float vA;
  void main() {
    vec2 q = abs(gl_PointCoord - 0.5);
    if (q.x > 0.42 || q.y > 0.3) discard;
    float edge = step(0.36, q.x) + step(0.24, q.y);
    vec3 col = mix(vCol, vCol * 0.75, min(edge, 1.0));
    float a = vA * uOpacity;
    if (a < 0.02) discard;
    gl_FragColor = vec4(col, a);
    #include <colorspace_fragment>
  }
`;

/* ------------------------------------------------------------------ */

const plate = () => new THREE.MeshBasicMaterial({ color: "#fffdf8", transparent: true, opacity: 0, depthWrite: false });
const line = (color: THREE.ColorRepresentation) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false, toneMapped: false });

export function Projects({ tier }: { tier: Tier }) {
  const built = useMemo(() => {
    const rand = mulberry32(1203);
    const hi = tier === "high";

    /* FlowMatch: the operating points of ~40 pump curves; one passes through the target. */
    const curves: { h0: number; qm: number; match: boolean }[] = [];
    for (let i = 0; i < 40; i++) curves.push({ h0: 30 + rand() * 70, qm: 3.2 + rand() * 4.8, match: false });
    curves[17] = { h0: 55 / (1 - (TARGET.q / 7) ** 2), qm: 7, match: true };
    const per = hi ? 60 : 30;
    const n = curves.length * per;
    const pos = new Float32Array(n * 3), page = new Float32Array(n * 3), delay = new Float32Array(n), match = new Float32Array(n);
    curves.forEach((c, ci) => {
      for (let k = 0; k < per; k++) {
        const i = ci * per + k;
        const q = (k / (per - 1)) * c.qm;
        const h = c.h0 * (1 - (q / c.qm) ** 2);
        pos.set([QX(q), HY(h), 0.02], i * 3);
        const pg = Math.floor(rand() * 5);
        page.set([-1.25 + pg * 0.07 + (rand() - 0.5) * 0.95, (rand() - 0.5) * 1.35, 0.03 + pg * 0.02], i * 3);
        delay[i] = rand() * 0.65;
        match[i] = c.match ? 1 : 0;
      }
    });
    const fmGeo = new THREE.BufferGeometry();
    fmGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    fmGeo.setAttribute("aPage", new THREE.BufferAttribute(page, 3));
    fmGeo.setAttribute("aDelay", new THREE.BufferAttribute(delay, 1));
    fmGeo.setAttribute("aMatch", new THREE.BufferAttribute(match, 1));
    const fmMat = new THREE.ShaderMaterial({
      vertexShader: fmVertex,
      fragmentShader: dotFragment,
      transparent: true,
      depthWrite: false,
      uniforms: { uExtract: { value: 0 }, uSearch: { value: 0 }, uMatch: { value: 0 }, uScale: { value: 1 }, uTime: { value: 0 }, uOpacity: { value: 0 }, uTarget: { value: new THREE.Vector2(QX(TARGET.q), HY(TARGET.h)) } },
    });
    const pageMat = overlay(pageFragment, { uOpacity: { value: 0 } });
    const fmPlate = plate();
    const axisMat = line("#2b2f35");
    const flowMat = line("#0b7c81");
    const depthMat = line("#0b7c81");
    const hit = ringMaterial(LIME, 0.25);

    /* Deal Lens: deal slips, labelled, ~55% of them round trips, the rest stacked by year. */
    const m = hi ? 1500 : 800;
    const seed = new Float32Array(m * 3), type = new Float32Array(m), round = new Float32Array(m), year = new Float32Array(m), stack = new Float32Array(m);
    const counts = new Array(YEARS).fill(0);
    const kept: number[] = [];
    for (let i = 0; i < m; i++) {
      seed.set([rand(), rand(), rand()], i * 3);
      type[i] = Math.floor(rand() * 4);
      round[i] = rand() < 0.548 ? 1 : 0;
      // more deals in later years
      year[i] = Math.min(YEARS - 1, Math.floor(Math.pow(rand(), 0.7) * YEARS));
      if (!round[i]) kept.push(i);
    }
    // stack each year's column by participant type, so bars come out colour-banded
    kept.sort((a, b) => year[a] - year[b] || type[a] - type[b]);
    for (const i of kept) stack[i] = counts[year[i]]++;
    const dlGeo = new THREE.BufferGeometry();
    dlGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(m * 3), 3));
    dlGeo.setAttribute("aSeed", new THREE.BufferAttribute(seed, 3));
    dlGeo.setAttribute("aType", new THREE.BufferAttribute(type, 1));
    dlGeo.setAttribute("aRound", new THREE.BufferAttribute(round, 1));
    dlGeo.setAttribute("aYear", new THREE.BufferAttribute(year, 1));
    dlGeo.setAttribute("aStack", new THREE.BufferAttribute(stack, 1));
    const dlMat = new THREE.ShaderMaterial({
      vertexShader: dlVertex,
      fragmentShader: slipFragment,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      uniforms: { uLabel: { value: 0 }, uFilter: { value: 0 }, uMap: { value: 0 }, uTime: { value: 0 }, uScale: { value: 1 }, uOpacity: { value: 0 }, uColors: { value: TYPE_COLORS } },
    });
    const dlPlate = plate();
    const dlAxis = line("#2b2f35");
    dlPlate.depthTest = false;
    dlAxis.depthTest = false;
    const tallest = Math.max(...counts);

    return { fmGeo, fmMat, pageMat, fmPlate, axisMat, flowMat, depthMat, hit, dlGeo, dlMat, dlPlate, dlAxis, tallest };
  }, [tier]);

  useEffect(
    () => () => {
      const b = built;
      [b.fmGeo, b.dlGeo].forEach((g) => g.dispose());
      [b.fmMat, b.pageMat, b.fmPlate, b.axisMat, b.flowMat, b.depthMat, b.hit, b.dlMat, b.dlPlate, b.dlAxis].forEach((x) => x.dispose());
    },
    [built],
  );

  const R = useRef<{ fm: THREE.Group | null; pages: (THREE.Mesh | null)[]; flow: THREE.Mesh | null; depth: THREE.Mesh | null; hit: THREE.Mesh | null; dl: THREE.Group | null }>({
    fm: null, pages: [], flow: null, depth: null, hit: null, dl: null,
  });
  const v = useRef(new THREE.Vector3()).current;

  useFrame((state) => {
    const b = built;
    const t = state.clock.elapsedTime;
    const N = R.current;
    const quiet = 1 - frame.process;
    const scale = pointScale(state);
    const near = (id: "flowmatch" | "deallens") => (1 - smooth(0.3, 0.75, Math.abs(frame.chapter - STORY_CHAPTER[id]))) * quiet;
    const at = (g: THREE.Group, x: number, y: number) => g.localToWorld(v.set(x, y, 0)).clone();

    /* ---------------- FlowMatch ---------------- */
    {
      const s = storySmooth.flowmatch;
      const show = near("flowmatch") * (1 - smooth(0.97, 1, s));
      const g = N.fm;
      if (g) {
        g.visible = show > 0.01;
        g.position.copy(FM_C);
        faceCamera(g, state.camera);
        g.updateMatrixWorld();
      }
      const extract = smooth(0.26, 0.48, s);
      const search = smooth(0.52, 0.66, s);
      const matched = smooth(0.76, 0.84, s);
      b.fmMat.uniforms.uExtract.value = extract;
      b.fmMat.uniforms.uSearch.value = search;
      b.fmMat.uniforms.uMatch.value = matched;
      b.fmMat.uniforms.uScale.value = scale;
      b.fmMat.uniforms.uTime.value = t;
      b.fmMat.uniforms.uOpacity.value = show;
      b.fmPlate.opacity = show * 0.93;
      // pages fan open, then empty out as their figures are extracted
      const fan = smooth(0.02, 0.2, s);
      b.pageMat.uniforms.uOpacity.value = show * (1 - smooth(0.32, 0.5, s));
      N.pages.forEach((p, i) => {
        if (!p) return;
        p.position.set(-1.25 + i * 0.07 + (i - 2) * 0.22 * fan, (i - 2) * 0.03 * fan, 0.03 + i * 0.02);
        p.rotation.z = (i - 2) * 0.06 * fan;
        p.visible = b.pageMat.uniforms.uOpacity.value > 0.01;
      });
      b.axisMat.opacity = show * smooth(0.3, 0.42, s);
      const fx = QX(TARGET.q), hy = HY(TARGET.h);
      b.flowMat.opacity = show * smooth(0.5, 0.54, s);
      b.depthMat.opacity = show * smooth(0.56, 0.6, s);
      if (N.flow) N.flow.position.x = THREE.MathUtils.lerp(-1.9, fx, smooth(0.5, 0.6, s));
      if (N.depth) N.depth.position.y = THREE.MathUtils.lerp(1.2, hy, smooth(0.56, 0.66, s));
      b.hit.uniforms.uOpacity.value = show * smooth(0.64, 0.68, s) * (0.75 + 0.25 * Math.sin(t * 4));
      if (N.hit) N.hit.scale.setScalar(1 + matched * 0.3);
      if (g) {
        const w = (k: number) => beatWeight(s, k) * show;
        callout("p-fm0", FM_SCENE[0][0], "ink", at(g, -1.2, 1.0), w(0));
        callout("p-fm2", FM_SCENE[1][0], "teal", at(g, 1.2, 1.3), w(1) * smooth(0.32, 0.38, s));
        callout("p-fm4", FM_SCENE[2][0], "teal", at(g, fx, hy + 0.15), w(2) * smooth(0.6, 0.64, s));
        callout("p-fm6", FM_SCENE[3][0], "lime", at(g, fx, hy + 0.12), w(3));
      }
    }

    /* ---------------- Deal Lens ---------------- */
    {
      const s = storySmooth.deallens;
      const show = near("deallens") * (1 - smooth(0.97, 1, s));
      const g = N.dl;
      if (g) {
        g.visible = show > 0.01;
        g.position.copy(DL_C);
        faceCamera(g, state.camera);
        g.updateMatrixWorld();
      }
      b.dlMat.uniforms.uLabel.value = smooth(0.26, 0.46, s);
      b.dlMat.uniforms.uFilter.value = smooth(0.52, 0.7, s);
      b.dlMat.uniforms.uMap.value = smooth(0.76, 0.94, s);
      b.dlMat.uniforms.uTime.value = t;
      b.dlMat.uniforms.uScale.value = scale;
      b.dlMat.uniforms.uOpacity.value = show;
      b.dlPlate.opacity = show * smooth(0.74, 0.84, s) * 0.92;
      b.dlAxis.opacity = show * smooth(0.78, 0.86, s);
      if (g) {
        const w = (k: number) => beatWeight(s, k) * show;
        const lanes = w(1) + w(2) * 0.6;
        callout("p-dl0", DL_SCENE[0][0], "ink", at(g, -1.4, -1.0), w(0));
        callout("p-dl1", DL_SCENE[1][0], "teal", at(g, 0, 1.6), w(1) * smooth(0.3, 0.36, s));
        for (let k = 0; k < 4; k++) callout(`p-dl-l${k}`, DL_SCENE[1][k + 1], "ink", at(g, -2.6, 1.1 - k * 0.52), lanes * smooth(0.38, 0.44, s));
        callout("p-dl2", DL_SCENE[2][0], "red", at(g, 0.6, -1.3), w(2) * smooth(0.56, 0.62, s));
        const top = -1.35 + b.tallest * 0.036;
        callout("p-dl3", DL_SCENE[3][0], "lime", at(g, 1.6, top + 0.25), w(3) * smooth(0.86, 0.92, s));
      }
    }
  });

  return (
    <>
      <group ref={(g) => void (R.current.fm = g)} visible={false}>
        <mesh material={built.fmPlate} position={[0, 0, -0.05]} renderOrder={5}>
          <planeGeometry args={[FM.w, FM.h]} />
        </mesh>
        {[0, 1, 2, 3, 4].map((i) => (
          <mesh key={i} ref={(m) => void (R.current.pages[i] = m)} material={built.pageMat} renderOrder={6}>
            <planeGeometry args={[1.05, 1.42]} />
          </mesh>
        ))}
        <mesh material={built.axisMat} position={[-1.92, 0, 0]} renderOrder={6}>
          <planeGeometry args={[0.025, 2.5]} />
        </mesh>
        <mesh material={built.axisMat} position={[0, -1.22, 0]} renderOrder={6}>
          <planeGeometry args={[3.9, 0.025]} />
        </mesh>
        <points geometry={built.fmGeo} material={built.fmMat} renderOrder={7} frustumCulled={false} />
        <mesh ref={(m) => void (R.current.flow = m)} material={built.flowMat} position={[-1.9, 0, 0.04]} renderOrder={8}>
          <planeGeometry args={[0.03, 2.45]} />
        </mesh>
        <mesh ref={(m) => void (R.current.depth = m)} material={built.depthMat} position={[0, 1.2, 0.04]} renderOrder={8}>
          <planeGeometry args={[3.85, 0.03]} />
        </mesh>
        <mesh ref={(m) => void (R.current.hit = m)} material={built.hit} position={[QX(TARGET.q), HY(TARGET.h), 0.06]} renderOrder={9}>
          <planeGeometry args={[0.42, 0.42]} />
        </mesh>
      </group>

      <group ref={(g) => void (R.current.dl = g)} visible={false}>
        <mesh material={built.dlPlate} position={[0, -0.05, -0.12]} renderOrder={10}>
          <planeGeometry args={[DL.w, DL.h]} />
        </mesh>
        <mesh material={built.dlAxis} position={[0, -1.37, -0.02]} renderOrder={11}>
          <planeGeometry args={[4.8, 0.025]} />
        </mesh>
        <points geometry={built.dlGeo} material={built.dlMat} renderOrder={12} frustumCulled={false} />
      </group>
    </>
  );
}
