"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { DISTRICTS, SCALE, SETS, TREE_TINT, type FixType, type Placement } from "./city-layout";
import { CASES, CASE_IDS } from "./cases";
import { caseState } from "./city-state";
import { frame } from "./frame-state";
import { cityLabels, serviceLabels } from "./world-store";
import { CHAPTER } from "./chapters";
import { createBatch, createPaletteMaterial, useModels, releaseBatch } from "./models";
import { mulberry32 } from "./terrain-math";
import { beatWeight, faceCamera, fogPuffs, pointScale, questionMark, ringMaterial, overlay, smooth } from "./fx";
import { narrator } from "./districts/copy";
import { Farm } from "./districts/Farm";
import { Yard } from "./districts/Yard";
import { Hospital } from "./districts/Hospital";
import { Plant } from "./districts/Plant";
import { LIME, RED, TEAL } from "./districts/kit";
import type { Tier } from "./Scene";

/**
 * The large sites of the city, and the story marks they share:
 *   · Farm, Yard, Hospital, Plant — each acts out its real cases (districts/*)
 *   · the open district (uncharted lots) and the markets (Deal Lens)
 *   · per case: a red ring where the problem is, the scan when our team
 *     starts measuring, the fork of four kinds of fix with the right one
 *     chosen, and confetti the moment it works
 *   · the services chapter pins each kind of fix to a case that used it
 */

const FIX_ORDER: FixType[] = ["software", "hardware", "process", "data"];
/** Services chapter: where each kind of fix was used. */
const SERVICE_AT: Record<FixType, [number, number, number]> = {
  software: CASES.pumps.focus,
  hardware: CASES.leaks.focus,
  process: CASES.discharge.focus,
  data: CASES.opd.focus,
};

const confettiVertex = /* glsl */ `
  attribute vec3 aVel; attribute vec3 aCol; attribute float aSpin;
  uniform float uAge; uniform float uScale;
  varying vec3 vCol; varying float vA;
  void main() {
    vec3 p = position + aVel * uAge + vec3(sin(uAge * 3.0 + aSpin * 9.0) * 0.25, -1.6 * uAge * uAge, cos(uAge * 2.6 + aSpin * 7.0) * 0.25);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = 0.09 * (0.6 + 0.4 * abs(sin(uAge * 8.0 + aSpin * 20.0))) * uScale / -mv.z;
    vCol = aCol;
    vA = 1.0 - smoothstep(1.4, 2.4, uAge);
  }
`;
const confettiFragment = /* glsl */ `
  varying vec3 vCol; varying float vA;
  void main() {
    vec2 q = abs(gl_PointCoord - 0.5);
    if (q.x > 0.45 || q.y > 0.22) discard;
    if (vA < 0.02) discard;
    gl_FragColor = vec4(vCol, vA);
    #include <colorspace_fragment>
  }
`;

/** The survey of the uncharted lots: contour lines that appear inside a sweeping ring. */
const surveyFragment = /* glsl */ `
  uniform float uSweep; uniform float uOpacity; uniform vec3 uColor;
  varying vec2 vUv;
  void main() {
    vec2 c = vUv - 0.5;
    float r = length(c) * 2.0;
    if (r > 1.0) discard;
    float h = sin(c.x * 9.0 + sin(c.y * 7.0) * 1.4) * 0.5 + sin(c.y * 11.0 - c.x * 3.0) * 0.35 + r * 1.2;
    float f = fract(h * 6.0);
    float lines = 1.0 - smoothstep(0.0, 1.5 * fwidth(h * 6.0), min(f, 1.0 - f));
    vec2 gq = abs(fract(c * 8.0 + 0.5) - 0.5);
    float grid = (1.0 - smoothstep(0.0, 0.03, min(gq.x, gq.y))) * 0.25;
    float inside = 1.0 - smoothstep(uSweep - 0.02, uSweep, r);
    float ring = (1.0 - smoothstep(0.0, 0.03, abs(r - uSweep))) * step(uSweep, 0.995) * step(0.001, uSweep);
    float a = ((lines * 0.75 + grid) * inside + ring) * uOpacity;
    if (a < 0.01) discard;
    gl_FragColor = vec4(uColor, a);
    #include <colorspace_fragment>
  }
`;

export function Districts({ tier }: { tier: Tier }) {
  const geos = useModels();

  const built = useMemo(() => {
    const rand = mulberry32(911);
    const pick = <T,>(a: readonly T[]) => a[Math.floor(rand() * a.length) % a.length];
    const material = createPaletteMaterial(tier);
    const P: Placement[] = [];
    const tree = (x: number, z: number, s = 1) => P.push({ m: pick(SETS.tree), x, z, ry: rand() * 6.28, s: SCALE.tree * s * (0.8 + rand() * 0.4), tint: pick(TREE_TINT) });

    /* Markets: office towers around the exchange, a market street. */
    const M = DISTRICTS.markets;
    P.push({ m: "proc-exchange", x: M.x + 0.6, z: M.z, ry: -Math.PI / 2, s: 1 });
    const towers: [number, number, number][] = [
      [M.x - 1.0, M.z - 3.4, 1.5],
      [M.x + 2.2, M.z - 3.6, 1.35],
      [M.x + 3.6, M.z - 1.8, 1.6],
      [M.x + 3.6, M.z + 1.6, 1.4],
      [M.x + 2.4, M.z + 3.6, 1.55],
      [M.x - 1.0, M.z + 3.4, 1.3],
    ];
    towers.forEach(([x, z, s], i) => P.push({ m: SETS.tall[i % 5], x, z, ry: (i % 4) * (Math.PI / 2), s, tint: pick([0xffffff, 0xe6f2ff, 0xfff1e0, 0xe8fff4]) }));
    for (let i = 0; i < 5; i++) P.push({ m: (["proc-stall0", "proc-stall1", "proc-stall2"] as const)[i % 3], x: M.x - 3.6 + (i % 2) * 0.7, z: M.z - 1.8 + i * 0.8, ry: 0, s: 1 });
    for (let i = 0; i < 6; i++) tree(M.x - 2.4, M.z - 2.6 + i * 1.05, 0.7);

    /* Open: staked-out lots, an idle tower crane, a survey tent. */
    const O = DISTRICTS.open;
    const crane = { x: O.x + 1.2, z: O.z - 1.2 };
    for (const [ox, oz] of [[-3.2, -2.2], [2.0, -3.0], [-2.6, 2.6], [2.6, 2.4]]) {
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * Math.PI * 2;
        const sx = Math.cos(a) > 0.7 ? 1 : Math.cos(a) < -0.7 ? -1 : Math.cos(a) * 1.4;
        const sz = Math.sin(a) > 0.7 ? 1 : Math.sin(a) < -0.7 ? -1 : Math.sin(a) * 1.4;
        P.push({ m: "proc-stake", x: O.x + ox + sx * 1.4, z: O.z + oz + sz * 1.4, ry: 0, s: 1 });
      }
    }
    P.push({ m: "nat-tent_detailedOpen", x: O.x - 0.6, z: O.z + 0.4, ry: 0.6, s: 0.9 });
    for (let i = 0; i < 5; i++) P.push({ m: "road-construction-cone", x: O.x + 3.6 + i * 0.25, z: O.z + 0.2, ry: 0, s: 1.6 });
    for (let i = 0; i < 4; i++) P.push({ m: "road-construction-barrier", x: O.x - 4.8, z: O.z - 0.6 + i * 0.4, ry: Math.PI / 2, s: 1.6 });
    for (let i = 0; i < 8; i++) P.push({ m: pick(["nat-rock_largeA", "nat-rock_smallA", "nat-grass_large"] as const), x: O.x + (rand() - 0.5) * 11, z: O.z + (rand() - 0.5) * 11, ry: rand() * 6, s: 0.6 + rand() * 0.5 });
    P.push({ m: "proc-crane-mast", x: crane.x, z: crane.z, ry: 0, s: 1 });
    for (let z = O.z0 + 0.6; z < O.z1; z += 1.3) tree(O.x0 + 0.4, z);
    for (let x = O.x0 + 1.5; x < O.x1; x += 1.4) tree(x, O.z0 + 0.4);
    const batch = createBatch(geos, P, material);
    const jib = new THREE.Mesh(geos["proc-crane-jib"], material);
    jib.castShadow = true;
    jib.position.set(crane.x, 4.78, crane.z);

    const openFog = fogPuffs(tier === "high" ? 70 : 40, [O.x - 6, 0.4, O.z - 6], [O.x + 6, 2.4, O.z + 6], [2.6, 5.2], 77);
    const qGeo = questionMark();
    const qMat = new THREE.MeshBasicMaterial({ color: "#e0442f", toneMapped: false, transparent: true, opacity: 0 });
    const surveyMat = overlay(surveyFragment, { uSweep: { value: 0 }, uOpacity: { value: 0 }, uColor: { value: new THREE.Color("#0b7c81") } });
    const beaconRing = ringMaterial(LIME);

    /* Story marks per case, and the celebration. */
    const marks = CASE_IDS.map(() => ({ red: ringMaterial(RED, 0.18), scan: ringMaterial(TEAL), warn: new THREE.MeshBasicMaterial({ color: RED.clone(), transparent: true, opacity: 0, toneMapped: false }) }));
    const cn = tier === "high" ? 160 : 90;
    const cPos = new Float32Array(cn * 3), cVel = new Float32Array(cn * 3), cCol = new Float32Array(cn * 3), cSpin = new Float32Array(cn);
    const palette = ["#9bdc28", "#12a4ab", "#f2b33d", "#ff8a5c", "#ffffff", "#2f74c8"].map((c) => new THREE.Color(c));
    for (let i = 0; i < cn; i++) {
      const a = rand() * Math.PI * 2, out = 0.4 + rand() * 1.4;
      cVel.set([Math.cos(a) * out, 1.6 + rand() * 1.8, Math.sin(a) * out], i * 3);
      const c = palette[i % palette.length];
      cCol.set([c.r, c.g, c.b], i * 3);
      cSpin[i] = rand();
    }
    const confettiGeo = new THREE.BufferGeometry();
    confettiGeo.setAttribute("position", new THREE.BufferAttribute(cPos, 3));
    confettiGeo.setAttribute("aVel", new THREE.BufferAttribute(cVel, 3));
    confettiGeo.setAttribute("aCol", new THREE.BufferAttribute(cCol, 3));
    confettiGeo.setAttribute("aSpin", new THREE.BufferAttribute(cSpin, 1));
    const confettiMat = new THREE.ShaderMaterial({ vertexShader: confettiVertex, fragmentShader: confettiFragment, transparent: true, depthWrite: false, uniforms: { uAge: { value: 9 }, uScale: { value: 1 } } });

    return { material, batch, jib, openFog, qGeo, qMat, surveyMat, beaconRing, marks, confettiGeo, confettiMat };
  }, [geos, tier]);

  useEffect(
    () => () => {
      const b = built;
      releaseBatch(b.batch.mesh);
      [b.material, b.openFog.material, b.qMat, b.surveyMat, b.beaconRing, b.confettiMat].forEach((m) => m.dispose());
      b.marks.forEach((m) => [m.red, m.scan, m.warn].forEach((x) => x.dispose()));
      [b.openFog.geometry, b.qGeo, b.confettiGeo].forEach((g) => g.dispose());
    },
    [built],
  );

  const R = useRef<{ marks: { red: THREE.Mesh | null; scan: THREE.Mesh | null; warn: THREE.Mesh | null }[]; q: THREE.Mesh | null; beacon: THREE.Mesh | null; beaconRing: THREE.Mesh | null; lens: THREE.Mesh | null; confetti: THREE.Object3D | null }>({
    marks: [], q: null, beacon: null, beaconRing: null, lens: null, confetti: null,
  });
  const T = useRef({ v: new THREE.Vector3(), a: new THREE.Vector3(), b: new THREE.Vector3(), right: new THREE.Vector3(), resultWas: {} as Record<string, boolean>, burstAt: -10 }).current;
  const openSay = useMemo(() => narrator("open"), []);

  useFrame((state) => {
    const b = built;
    const t = state.clock.elapsedTime;
    const cam = state.camera;
    const W = state.size.width, H = state.size.height;
    const N = R.current;
    const quiet = 1 - frame.process;
    b.jib.rotation.y = Math.sin(t * 0.12) * 0.6 + 0.8;

    /* ---------------- Open ---------------- */
    {
      const O = DISTRICTS.open;
      const st = caseState.open;
      const s = st.s, n = st.near;
      const clear = smooth(0.24, 0.42, s);
      b.openFog.material.uniforms.uTime.value = t;
      b.openFog.material.uniforms.uClear.value = clear;
      b.openFog.material.uniforms.uOpacity.value = clear < 0.999 ? Math.max(n, 0.35) : 0;
      b.openFog.material.uniforms.uScale.value = pointScale(state);
      const qv = beatWeight(s, 0) * n;
      b.qMat.opacity = qv;
      if (N.q) {
        N.q.visible = qv > 0.01;
        N.q.position.set(O.x, 2.9 + Math.sin(t * 1.5) * 0.15, O.z);
        faceCamera(N.q, cam);
        N.q.scale.setScalar(2.4);
      }
      b.surveyMat.uniforms.uSweep.value = smooth(0.28, 0.5, s);
      b.surveyMat.uniforms.uOpacity.value = smooth(0.26, 0.3, s) * n;
      if (N.beacon) {
        N.beacon.rotation.y = t * 0.7;
        N.beacon.position.y = 2.2 + Math.sin(t * 1.2) * 0.15;
        (N.beacon.material as THREE.MeshBasicMaterial).color.copy(TEAL).lerp(LIME, smooth(0.76, 0.84, s));
        N.beacon.scale.setScalar(1 + smooth(0.76, 0.84, s) * 0.4);
      }
      if (N.beaconRing) {
        const rip = (t * 0.5) % 1;
        b.beaconRing.uniforms.uOpacity.value = beatWeight(s, 3) * n * (1 - rip);
        N.beaconRing.scale.setScalar(1 + rip * 8);
      }
      openSay.line(0, "ink", [O.x, 5.6, O.z]);
      openSay.line(1, "teal", [O.x + 3, 0.8, O.z + 2]);
      openSay.line(2, "ink", [O.x + 2.6, 0.9, O.z + 2.4]);
      openSay.line(3, "lime", [O.x, 3.3, O.z]);
    }

    /* Markets: the lens over the exchange appears once Deal Lens has played. */
    if (N.lens) {
      N.lens.rotation.z = t * 0.6;
      N.lens.scale.setScalar(Math.max(0.001, smooth(CHAPTER.deallens + 0.15, CHAPTER.deallens + 0.45, frame.chapter)));
    }

    /* ---------------- Marks, the celebration ---------------- */
    CASE_IDS.forEach((id, i) => {
      const st = caseState[id];
      const m = b.marks[i];
      const r = N.marks[i];
      const pulse = (t * 0.9) % 1;
      const show = st.near * quiet;
      m.red.uniforms.uOpacity.value = st.problem * show * (0.6 + 0.4 * Math.sin(t * 5)) * (1 - smooth(0.45, 0.55, st.s));
      m.warn.opacity = st.problem * show * (1 - smooth(0.45, 0.55, st.s));
      m.scan.uniforms.uOpacity.value = beatWeight(st.s, 1) * show * (1 - pulse) * 0.8;
      if (r?.scan) r.scan.scale.setScalar(0.4 + pulse * 3.4);
      if (r?.red) r.red.scale.setScalar(1 + Math.sin(t * 5) * 0.08);
      if (r?.warn) {
        r.warn.position.y = 1.9 + Math.sin(t * 3) * 0.12;
        r.warn.rotation.y = t * 2;
        r.warn.scale.setScalar(Math.max(0.001, m.warn.opacity));
      }
      // the moment it works (on the way forward only)
      const done = st.result > 0.5;
      if (done && !T.resultWas[id] && show > 0.5 && CASES[id].fix) {
        T.burstAt = t;
        const [x, , z] = CASES[id].focus;
        N.confetti?.position.set(x, 1.0, z);
      }
      T.resultWas[id] = done;
    });
    const age = t - T.burstAt;
    b.confettiMat.uniforms.uAge.value = Math.min(age, 9);
    b.confettiMat.uniforms.uScale.value = pointScale(state);
    if (N.confetti) N.confetti.visible = age < 2.5;

    // The fork: four kinds of fix in a row over the problem; the right one is chosen.
    const fid = frame.process > 0.5 ? null : caseState.focus;
    const fs = fid ? caseState[fid] : null;
    const spec = fid ? CASES[fid] : null;
    // (phones skip the row: the step bar already names the fix, and the row would crowd the chart)
    const forkOn = fs && spec && W >= 700 ? smooth(0.36, 0.42, fs.s) * (1 - smooth(0.7, 0.76, fs.s)) * fs.near * quiet : 0;
    if (fs && spec && forkOn > 0.001) {
      T.right.setFromMatrixColumn(cam.matrixWorld, 0).setY(0).normalize();
      T.a.set(spec.focus[0], 0.5, spec.focus[2]);
      FIX_ORDER.forEach((fx, k) => {
        T.b.copy(T.a).addScaledVector(T.right, (k - 1.5) * 1.35);
        T.b.y += 3.6;
        const chosen = spec.fix === fx && fs.s > 0.52;
        const dim = fs.s > 0.52 && !chosen && spec.fix !== null;
        const el = cityLabels.fork[k];
        if (!el) return;
        T.v.copy(T.b).project(cam);
        const x = (T.v.x * 0.5 + 0.5) * W, y = (-T.v.y * 0.5 + 0.5) * H;
        el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
        el.style.opacity = String(T.v.z < 1 ? forkOn * (dim ? 0.55 : 1) : 0);
        el.dataset.state = chosen ? "chosen" : dim ? "dim" : "idle";
      });
    } else cityLabels.fork.forEach((el) => el && (el.style.opacity = "0"));

    // Services chapter: each kind of fix pinned to a case that used it.
    const showServices = smooth(CHAPTER.services - 0.35, CHAPTER.services - 0.1, frame.chapter) * (1 - smooth(CHAPTER.services + 0.45, CHAPTER.services + 0.7, frame.chapter));
    FIX_ORDER.forEach((fx, k) => {
      const el = serviceLabels[k];
      if (!el) return;
      const [x, y, z] = SERVICE_AT[fx];
      T.v.set(x, y + 2.4, z).project(cam);
      const sx = Math.min(W - 150, Math.max(150, (T.v.x * 0.5 + 0.5) * W)), sy = Math.min(H - 40, Math.max(110, (-T.v.y * 0.5 + 0.5) * H));
      el.style.transform = `translate3d(${sx.toFixed(1)}px, ${sy.toFixed(1)}px, 0)`;
      el.style.opacity = String(T.v.z < 1 && W >= 700 ? showServices : 0);
    });
  });

  const O = DISTRICTS.open;
  const M = DISTRICTS.markets;
  return (
    <group>
      <Farm tier={tier} />
      <Yard tier={tier} />
      <Hospital tier={tier} />
      <Plant tier={tier} />

      <primitive object={built.batch.mesh} />
      <primitive object={built.jib} />
      <mesh ref={(m) => void (R.current.lens = m)} position={[M.x + 0.6, 4.3, M.z]} rotation-x={Math.PI / 2}>
        <torusGeometry args={[1.3, 0.06, 8, 48]} />
        <meshBasicMaterial color={LIME} toneMapped={false} />
      </mesh>
      <points geometry={built.openFog.geometry} material={built.openFog.material} renderOrder={8} frustumCulled={false} />
      <mesh ref={(m) => void (R.current.q = m)} geometry={built.qGeo} material={built.qMat} visible={false} renderOrder={9} />
      <mesh position={[O.x, 0.07, O.z]} rotation-x={-Math.PI / 2} material={built.surveyMat} renderOrder={3}>
        <planeGeometry args={[13, 13]} />
      </mesh>
      <mesh ref={(m) => void (R.current.beacon = m)} position={[O.x, 2.2, O.z]}>
        <octahedronGeometry args={[0.45, 0]} />
        <meshBasicMaterial color={TEAL} wireframe toneMapped={false} />
      </mesh>
      <mesh ref={(m) => void (R.current.beaconRing = m)} position={[O.x, 0.08, O.z]} rotation-x={-Math.PI / 2} renderOrder={3} material={built.beaconRing}>
        <planeGeometry args={[1, 1]} />
      </mesh>

      {CASE_IDS.map((id, i) => {
        const [x, , z] = CASES[id].focus;
        const set = (k: "red" | "scan" | "warn") => (m: THREE.Mesh | null) => void (R.current.marks[i] = { ...(R.current.marks[i] ?? { red: null, scan: null, warn: null }), [k]: m });
        return (
          <group key={id} position={[x, 0.05, z]}>
            <mesh rotation-x={-Math.PI / 2} material={built.marks[i].red} renderOrder={3} ref={set("red")}>
              <planeGeometry args={[1.8, 1.8]} />
            </mesh>
            <mesh rotation-x={-Math.PI / 2} material={built.marks[i].scan} renderOrder={3} ref={set("scan")}>
              <planeGeometry args={[1.8, 1.8]} />
            </mesh>
            <mesh material={built.marks[i].warn} ref={set("warn")}>
              <octahedronGeometry args={[0.18, 0]} />
            </mesh>
          </group>
        );
      })}
      <points ref={(m) => void (R.current.confetti = m)} geometry={built.confettiGeo} material={built.confettiMat} frustumCulled={false} visible={false} renderOrder={9} />
    </group>
  );
}
