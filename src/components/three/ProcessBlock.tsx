"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { PROCESS_BLOCK, SCALE, SETS, FACADE, footprint, type AnyModel, type Placement } from "./city-layout";
import { createBatch, createDynamicBatch, createPaletteMaterial, useModels, releaseBatch } from "./models";
import { beam, box, cyl, merge } from "./procedural";
import { frame } from "./frame-state";
import { MAIN_GREEN, islandState } from "./views";
import { mulberry32 } from "./terrain-math";
import { callout, calloutSafe, type CalloutTone } from "./callouts";
import { signalGreen } from "./Life";
import { approach } from "@/content/site-content";
import { createChart, createCrew, type BarTone } from "./districts/kit";

/**
 * The process, played out the way it is really done, at one junction that
 * jams every evening (an illustrative example). Progress comes from the
 * Approach section (islandState.progress, 0 … 5):
 *   00 Unknown    — the queue backs up; everyone has a theory
 *   01 Observe    — our team on the corners: tally counters, a stopwatch on the signal, a camera on a tripod
 *   02 Map        — the counts become a hand-drawn turning-movement sketch; flows marked on the road
 *   03 Understand — two causes: the main road gets a quarter of the green for three quarters of the
 *                   traffic, and autos stopping on the corner take the left lane
 *   04 Build      — a new timing plan loaded at the controller cabinet; the auto stand moved to the side street
 *   05 Validate   — re-counted: shorter queues, evening delay down by the typical ~13% (FHWA)
 */

const B = PROCESS_BLOCK;
const [JX, JZ] = B.junction;
const SC = approach.scene;
const CENTER = new THREE.Vector3(5.2, 0, 22.4);

/** The controller cabinet and the tripod camera, both on the north-east corner. */
const CABINET: [number, number] = [JX + 0.95, JZ + 0.5];
const TRIPOD: [number, number] = [JX + 0.95, JZ + 1.55];
/** Autos stop on the corner (before) → a marked stand on the side street (after). */
const AUTO_CORNER: [number, number][] = [
  [JX - 0.47, JZ + 1.0],
  [JX - 0.47, JZ + 1.45],
  [JX - 0.47, JZ + 1.9],
];
const AUTO_STAND: [number, number][] = [
  [JX - 2.4, JZ + 0.46],
  [JX - 2.85, JZ + 0.46],
  [JX - 3.3, JZ + 0.46],
];

/**
 * One steady shot: the camera orbits the junction, sweeping slowly round as
 * the steps go by. Each step only nudges how far, how high and where it looks.
 * θ in degrees, measured in the x–z plane.
 */
const ORBIT: { a: number; r: number; h: number; t: [number, number, number] }[] = [
  /* 00 unknown    */ { a: 158, r: 11.5, h: 9.5, t: [6.8, 0.3, 22.4] },
  /* 01 observe    */ { a: 146, r: 9.0, h: 7.0, t: [7.0, 0.3, 21.8] },
  /* 02 map        */ { a: 132, r: 8.5, h: 9.5, t: [6.2, 1.2, 21.8] },
  /* 03 understand */ { a: 118, r: 8.8, h: 7.6, t: [6.2, 0.6, 21.2] },
  /* 04 build      */ { a: 96, r: 9.0, h: 7.4, t: [7.0, 0.4, 21.0] },
  /* 05 validate   */ { a: 72, r: 11.0, h: 9.0, t: [6.6, 0.4, 21.8] },
];
export const PROCESS_STAGES = ORBIT.length;

/** Camera position and target for process progress p (0 … 5). */
export function processCamera(p: number, pos: THREE.Vector3, target: THREE.Vector3) {
  const i = Math.min(Math.max(Math.floor(p), 0), ORBIT.length - 2);
  const k0 = THREE.MathUtils.clamp(p - i, 0, 1);
  const k = k0 * k0 * (3 - 2 * k0);
  const a = ORBIT[i], b = ORBIT[i + 1];
  const ang = THREE.MathUtils.degToRad(THREE.MathUtils.lerp(a.a, b.a, k));
  const r = THREE.MathUtils.lerp(a.r, b.r, k), h = THREE.MathUtils.lerp(a.h, b.h, k);
  target.set(THREE.MathUtils.lerp(a.t[0], b.t[0], k), THREE.MathUtils.lerp(a.t[1], b.t[1], k), THREE.MathUtils.lerp(a.t[2], b.t[2], k));
  pos.set(target.x + Math.cos(ang) * r, target.y + h, target.z + Math.sin(ang) * r);
}

const TEAL = new THREE.Color("#0fa3aa");
const LIME = new THREE.Color("#8fd61f");
const RED = new THREE.Color("#ff3b2f");

const ss = THREE.MathUtils.smoothstep;
const lerp = THREE.MathUtils.lerp;
/** 0 → 1 → 0 around stage i. */
const around = (p: number, i: number, inW = 0.55, outW = 0.55) => ss(p, i - inW, i - 0.05) * (1 - ss(p, i + outW, i + outW + 0.4));
/** The colour of each step's "hit" (the shockwave when it starts). */
const HIT_COLORS = ["#ff3b2f", "#0fa3aa", "#2f7fd8", "#ff3b2f", "#8fd61f", "#8fd61f"].map((c) => new THREE.Color(c));
const STAGE_TITLES = [approach.unknown, ...approach.stages].map((st) => `${st.index} · ${st.title}`);


/* ------------------------------------------------------------------ */
/* Shaders                                                             */
/* ------------------------------------------------------------------ */

const flatVertex = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`;
const ringFragment = /* glsl */ `
  uniform vec3 uColor; uniform float uOpacity; uniform float uFill; varying vec2 vUv;
  void main() {
    float d = length(vUv - 0.5) * 2.0;
    float a = max(1.0 - smoothstep(0.0, 0.1, abs(d - 0.82)), (1.0 - smoothstep(0.7, 0.8, d)) * uFill) * uOpacity;
    if (a < 0.01) discard;
    gl_FragColor = vec4(uColor, a);
    #include <colorspace_fragment>
  }
`;
/** The sketch: revealed left to right, as if drawn. */
const sketchFragment = /* glsl */ `
  uniform sampler2D uMap; uniform float uReveal; uniform float uOpacity; varying vec2 vUv;
  void main() {
    vec4 c = texture2D(uMap, vUv);
    float ink = 1.0 - smoothstep(uReveal - 0.04, uReveal, vUv.x);
    vec3 paper = vec3(0.99, 0.98, 0.94);
    vec3 col = mix(paper, c.rgb, ink * c.a);
    float edge = 1.0 - smoothstep(0.0, 0.01, min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y)));
    col = mix(col, vec3(0.78, 0.75, 0.68), edge);
    gl_FragColor = vec4(col, uOpacity);
    #include <colorspace_fragment>
  }
`;

/* ------------------------------------------------------------------ */
/* The sketch, drawn on a canvas                                       */
/* ------------------------------------------------------------------ */

/** A hand-drawn turning-movement sketch of the junction: approach volumes as arrow widths. */
function drawSketch() {
  const W = 640, H = 400;
  const cv = document.createElement("canvas");
  cv.width = W;
  cv.height = H;
  const g = cv.getContext("2d")!;
  g.clearRect(0, 0, W, H);
  const rand = mulberry32(7);
  const jitter = () => (rand() - 0.5) * 2.2;
  const line = (pts: [number, number][], w: number, col: string) => {
    g.strokeStyle = col;
    g.lineWidth = w;
    g.lineCap = "round";
    g.lineJoin = "round";
    g.beginPath();
    pts.forEach(([x, y], i) => (i ? g.lineTo(x + jitter(), y + jitter()) : g.moveTo(x + jitter(), y + jitter())));
    g.stroke();
  };
  const ink = "#23303a";
  // the two roads, as kerb lines
  const cx = 330, cy = 200, rw = 44;
  line([[40, cy - rw], [cx - rw, cy - rw], [cx - rw, 24]], 3, ink);
  line([[cx + rw, 24], [cx + rw, cy - rw], [610, cy - rw]], 3, ink);
  line([[40, cy + rw], [cx - rw, cy + rw], [cx - rw, 360]], 3, ink);
  line([[cx + rw, 360], [cx + rw, cy + rw], [610, cy + rw]], 3, ink);
  // approach flows: width ∝ count
  const arrow = (x0: number, y0: number, x1: number, y1: number, w: number, col: string) => {
    line([[x0, y0], [x1, y1]], w, col);
    const a = Math.atan2(y1 - y0, x1 - x0);
    const h = 10 + w * 0.6;
    line([[x1 - Math.cos(a - 0.5) * h, y1 - Math.sin(a - 0.5) * h], [x1, y1], [x1 - Math.cos(a + 0.5) * h, y1 - Math.sin(a + 0.5) * h]], Math.max(3, w * 0.5), col);
  };
  arrow(cx - 18, 34, cx - 18, cy - rw - 14, 22, "#d8432f"); // southbound: heavy, queueing
  arrow(cx + 18, 352, cx + 18, cy + rw + 14, 15, "#0f8a90");
  arrow(590, cy - 18, cx + rw + 14, cy - 18, 6, "#0f8a90");
  arrow(70, cy + 18, cx - rw - 14, cy + 18, 5, "#0f8a90");
  // counts (per 15 minutes)
  g.fillStyle = ink;
  g.font = "italic 600 26px Georgia, serif";
  g.fillText("412", cx - 96, 66);
  g.fillText("268", cx + 44, 336);
  g.fillText("58", 548, cy - 32);
  g.fillText("47", 70, cy + 56);
  // the queue, ringed
  g.strokeStyle = "#d8432f";
  g.lineWidth = 3;
  g.beginPath();
  g.ellipse(cx - 18, 90, 32, 66, 0, 0, Math.PI * 2);
  g.stroke();
  g.font = "italic 600 22px Georgia, serif";
  g.fillStyle = "#d8432f";
  g.fillText("queue: 18", cx - 220, 110);
  g.fillText("autos stop here", cx - 250, cy - rw - 22);
  line([[cx - 80, cy - rw - 28], [cx - 34, cy - rw - 8]], 2, "#d8432f");
  // a header
  g.fillStyle = ink;
  g.font = "600 18px ui-monospace, Menlo, monospace";
  g.fillText("JUNCTION 7 · 6–7 PM · VEHICLES / 15 MIN", 40, 390);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/* ------------------------------------------------------------------ */

/** Vehicles on the main road's southbound approach (a closed loop, so the queue length reflects the signal). */
const QUEUE_MODELS: AnyModel[] = ["car-sedan", "proc-bike", "car-hatchback-sports", "proc-auto", "car-taxi", "proc-bike", "car-suv", "proc-bike", "car-van", "proc-auto", "car-sedan", "proc-bike", "car-hatchback-sports", "car-taxi", "proc-bike", "car-delivery"];
const QUEUE_X = JX - 0.22;
const GAP = 0.42;
const TOP = 9.0;
const BOTTOM = -4.5;
const STOP_LINE = 0.95;

/* Flow arrows (Map, Validate): four approaches through the junction, keep-left. */
type FlowLane = { from: [number, number]; to: [number, number]; stop: number; weight: number };
const OFF = 0.27;
const LANES: FlowLane[] = [
  { from: [JX - OFF, JZ + 8], to: [JX - OFF, JZ - 5], stop: 8 - 0.75, weight: 1.35 }, // southbound (heavy)
  { from: [JX + OFF, JZ - 5], to: [JX + OFF, JZ + 8], stop: 5 - 0.75, weight: 1.1 }, // northbound
  { from: [JX - 6.5, JZ - OFF + 0.02], to: [JX + 5, JZ - OFF + 0.02], stop: 6.5 - 0.8, weight: 0.75 }, // eastbound
  { from: [JX + 5, JZ + OFF - 0.02], to: [JX - 6.5, JZ + OFF - 0.02], stop: 5 - 0.8, weight: 0.75 }, // westbound
];
const ARROWS_PER = 9;

/** Timing chart: traffic share vs green share, main road then side street. */
const TIMING_BEFORE = [0.75, 0.25, 0.25, 0.62];
const TIMING_AFTER = [0.75, 0.55, 0.25, 0.32];
/** Delay per 15 minutes, 5–7 pm: before → after re-timing (about −13%). */
const DELAY_BEFORE = [0.38, 0.52, 0.7, 0.86, 0.94, 0.82, 0.6, 0.42];
const DELAY_AFTER = DELAY_BEFORE.map((v) => v * 0.87);

export function ProcessBlock() {
  const geos = useModels();

  const built = useMemo(() => {
    const rand = mulberry32(55);
    // Buildings around the block's edge.
    const placements: Placement[] = [];
    const edge = (z: number, ry: number, dir: number) => {
      let x = B.minX;
      while (x < B.maxX - 0.6) {
        const p: Placement = { m: SETS.mid[Math.floor(rand() * SETS.mid.length)], x: 0, z: 0, ry, s: SCALE.building, tint: FACADE[Math.floor(rand() * FACADE.length)] };
        const f = footprint(p);
        if (x + f.w > B.maxX) break;
        p.x = x + f.w / 2;
        p.z = z + (dir * f.d) / 2;
        placements.push(p);
        x += f.w + 0.05;
      }
    };
    edge(B.minZ, Math.PI, 1);
    edge(B.maxZ, 0, -1);
    placements.push({ m: "nat-tree_oak", x: 2.4, z: 24.0, ry: 1, s: 0.6, tint: 0xc9f0b4 }, { m: "nat-tree_default", x: 3.3, z: 24.7, ry: 2, s: 0.55, tint: 0xb8e6a0 });
    const material = createPaletteMaterial("high");
    const blockBatch = createBatch(geos, placements, material);

    // Signals at the junction's four corners, the controller cabinet, the tripod camera.
    const poleGeo = merge([cyl(0.03, 0.03, 0.8, 0x3d434b), box(0.1, 0.26, 0.1, 0x2b2f35, 0, 0.72, 0)]);
    const poles = new THREE.InstancedMesh(poleGeo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6 }), 4);
    const lamps = new THREE.InstancedMesh(new THREE.SphereGeometry(0.055, 10, 8), new THREE.MeshBasicMaterial({ color: "#ffffff", toneMapped: false }), 4);
    lamps.setColorAt(0, new THREE.Color());
    const corners: [number, number, boolean][] = [
      [JX - 0.85, JZ + 0.85, true],
      [JX + 0.85, JZ - 0.85, true],
      [JX + 0.85, JZ + 0.85, false],
      [JX - 0.85, JZ - 0.85, false],
    ];
    const m4 = new THREE.Matrix4();
    corners.forEach(([x, z], i) => poles.setMatrixAt(i, m4.makeTranslation(x, 0, z)));
    poles.castShadow = true;
    const cabinetGeo = merge([box(0.24, 0.42, 0.16, 0x8a9096), box(0.26, 0.03, 0.18, 0x6e767e, 0, 0.42, 0), box(0.18, 0.12, 0.005, 0xf2c230, 0, 0.22, 0.083)]);
    const cabinetMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6 });
    const tripodGeo = merge([
      beam(new THREE.Vector3(0, 0.36, 0), new THREE.Vector3(-0.07, 0, -0.05), 0.012, 0x2b2f35),
      beam(new THREE.Vector3(0, 0.36, 0), new THREE.Vector3(0.07, 0, -0.05), 0.012, 0x2b2f35),
      beam(new THREE.Vector3(0, 0.36, 0), new THREE.Vector3(0, 0, 0.08), 0.012, 0x2b2f35),
      box(0.08, 0.06, 0.12, 0x30363d, 0, 0.36, 0),
      box(0.04, 0.04, 0.02, 0x0fa3aa, 0, 0.37, 0.07),
    ]);
    const tripodMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6 });

    // Traffic on the main road's southbound approach, the corner autos, the new auto stand.
    const dyn = createDynamicBatch(geos, [...new Set([...QUEUE_MODELS, "proc-auto" as AnyModel])], QUEUE_MODELS.length + AUTO_CORNER.length, createPaletteMaterial("high"));
    const tints = [0xffffff, 0xffe0d0, 0xd0e4ff, 0xfff4c0, 0xe4ffe0];
    const queue = QUEUE_MODELS.map((m, i) => ({ id: dyn.add(m, tints[i % tints.length]), m, u: 1.0 + i * 0.5, len: m === "proc-bike" ? 0.28 : m === "proc-auto" ? 0.42 : 0.55 }));
    const autos = AUTO_CORNER.map(() => dyn.add("proc-auto"));
    const standGeo = new THREE.PlaneGeometry(1.5, 0.36);
    standGeo.rotateX(-Math.PI / 2);
    const standMat = new THREE.ShaderMaterial({
      vertexShader: flatVertex,
      fragmentShader: `uniform float uOpacity; varying vec2 vUv;
        void main(){ vec2 q = min(vUv, 1.0 - vUv); float edge = 1.0 - smoothstep(0.0, 0.04, min(q.x * 4.0, q.y));
          float hatch = step(0.75, fract((vUv.x * 6.0 + vUv.y) * 2.0)) * 0.35;
          float a = max(edge, hatch) * uOpacity; if (a < 0.01) discard;
          gl_FragColor = vec4(0.96, 0.76, 0.18, a);
          #include <colorspace_fragment>
        }`,
      transparent: true,
      depthWrite: false,
      uniforms: { uOpacity: { value: 0 } },
    });

    // People: three bystanders with opinions, our team (teal), the signal technician, people crossing.
    const shirts = [0xe4483c, 0x2f74c8, 0xf2b33d, 0x0fa3aa, 0x0fa3aa, 0x0fa3aa, 0xf08a2a, 0x8e5ac8, 0x3b9c6a, 0xff8a5c];
    const crew = createCrew(geos, shirts.length, shirts, createPaletteMaterial("high"));

    // Rings under counted vehicles (Observe, Validate) and around the corner autos (Understand).
    const ringMat = new THREE.ShaderMaterial({ vertexShader: flatVertex, fragmentShader: ringFragment, transparent: true, depthWrite: false, toneMapped: false, uniforms: { uColor: { value: TEAL.clone() }, uOpacity: { value: 0 }, uFill: { value: 0.15 } } });
    const ringGeo = new THREE.PlaneGeometry(0.62, 0.62);
    ringGeo.rotateX(-Math.PI / 2);
    const rings = new THREE.InstancedMesh(ringGeo, ringMat, QUEUE_MODELS.length);
    rings.frustumCulled = false;
    const autoRingMat = ringMat.clone();
    autoRingMat.uniforms.uColor.value = RED.clone();
    autoRingMat.uniforms.uFill.value = 0.22;
    const autoRing = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.8), autoRingMat);
    autoRing.rotation.x = -Math.PI / 2;
    autoRing.position.set(AUTO_CORNER[1][0], 0.05, AUTO_CORNER[1][1]);
    autoRing.renderOrder = 4;

    // Flow arrows on the road.
    const chevron = new THREE.Shape();
    chevron.moveTo(-0.13, -0.12);
    chevron.lineTo(0, 0.02);
    chevron.lineTo(0.13, -0.12);
    chevron.lineTo(0.13, 0.0);
    chevron.lineTo(0, 0.14);
    chevron.lineTo(-0.13, 0.0);
    chevron.closePath();
    const arrowGeo = new THREE.ShapeGeometry(chevron);
    arrowGeo.rotateX(-Math.PI / 2);
    arrowGeo.rotateY(Math.PI);
    const arrowMat = new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0, depthWrite: false, toneMapped: false });
    const arrows = new THREE.InstancedMesh(arrowGeo, arrowMat, LANES.length * ARROWS_PER);
    arrows.setColorAt(0, new THREE.Color());
    arrows.frustumCulled = false;

    // The sketch, and the two charts.
    const sketchTex = drawSketch();
    const sketchMat = new THREE.ShaderMaterial({ vertexShader: flatVertex, fragmentShader: sketchFragment, transparent: true, depthWrite: false, side: THREE.DoubleSide, uniforms: { uMap: { value: sketchTex }, uReveal: { value: 0 }, uOpacity: { value: 0 } } });
    const timing = createChart(4, 2.6, 1.5, { labels: ["Main: traffic", "Main: green", "Side: traffic", "Side: green"] });
    const delay = createChart(DELAY_BEFORE.length, 2.8, 1.4, { labels: ["5:00", "", "5:30", "", "6:00", "", "6:30", ""] });

    // The hit: a shockwave across the junction when a step starts.
    const hitMat = new THREE.ShaderMaterial({ vertexShader: flatVertex, fragmentShader: ringFragment, transparent: true, depthWrite: false, toneMapped: false, uniforms: { uColor: { value: new THREE.Color() }, uOpacity: { value: 0 }, uFill: { value: 0.08 } } });

    // Validate: a check over the junction.
    const check = new THREE.Shape();
    check.moveTo(-0.32, 0.02);
    check.lineTo(-0.12, -0.2);
    check.lineTo(0.34, 0.26);
    check.lineTo(0.26, 0.34);
    check.lineTo(-0.12, -0.04);
    check.lineTo(-0.24, 0.1);
    check.closePath();
    const checkGeo = new THREE.ExtrudeGeometry(check, { depth: 0.08, bevelEnabled: false });
    checkGeo.center();
    const badgeGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.06, 32);
    badgeGeo.rotateX(Math.PI / 2);
    const badgeMat = new THREE.MeshBasicMaterial({ color: LIME.clone(), toneMapped: false, transparent: true, opacity: 0 });
    const checkMat = new THREE.MeshBasicMaterial({ color: "#ffffff", toneMapped: false, transparent: true, opacity: 0 });

    return {
      material, blockBatch, poles, lamps, corners, cabinetGeo, cabinetMat, tripodGeo, tripodMat, dyn, queue, autos, standGeo, standMat,
      crew, ringMat, ringGeo, rings, autoRingMat, autoRing, arrowGeo, arrowMat, arrows, sketchTex, sketchMat, timing, delay, hitMat, checkGeo, badgeGeo, badgeMat, checkMat,
    };
  }, [geos]);

  useEffect(() => {
    const b = built;
    return () => {
      releaseBatch(b.blockBatch.mesh);
      releaseBatch(b.dyn.mesh);
      [b.material, b.cabinetMat, b.tripodMat, b.standMat, b.ringMat, b.autoRingMat, b.arrowMat, b.sketchMat, b.hitMat, b.badgeMat, b.checkMat, b.dyn.mesh.material as THREE.Material, b.poles.material as THREE.Material, b.lamps.material as THREE.Material, b.crew.people.material as THREE.Material].forEach((m) => m.dispose());
      [b.cabinetGeo, b.tripodGeo, b.standGeo, b.ringGeo, b.arrowGeo, b.checkGeo, b.badgeGeo, b.autoRing.geometry, b.poles.geometry, b.lamps.geometry].forEach((g) => g.dispose());
      [b.poles, b.lamps, b.rings, b.arrows].forEach((m) => m.dispose());
      b.sketchTex.dispose();
      b.crew.dispose();
      b.timing.dispose();
      b.delay.dispose();
    };
  }, [built]);

  const r = useRef<{ badge: THREE.Group | null; hit: THREE.Mesh | null; sketch: THREE.Mesh | null; tripod: THREE.Mesh | null; stand: THREE.Mesh | null }>({ badge: null, hit: null, sketch: null, tripod: null, stand: null });
  const H = useRef({ stage: -1, at: -10 });
  const T = useRef({ m: new THREE.Matrix4(), q: new THREE.Quaternion(), p: new THREE.Vector3(), s: new THREE.Vector3(), c: new THREE.Color(), y: new THREE.Vector3(0, 1, 0), v: new THREE.Vector3(), v2: new THREE.Vector3(), hide: new THREE.Matrix4().makeScale(0, 0, 0) }).current;

  useFrame((state, delta) => {
    const b = built;
    const t = state.clock.elapsedTime;
    const dt = Math.min(delta, 1 / 20);
    const w = frame.process;
    const p = islandState.progress;
    const R = r.current;
    const on = w > 0.01;
    const cam = state.camera;
    calloutSafe.left = w > 0.5 ? islandState.cardRight : 0;
    const say = (key: string, text: string, tone: CalloutTone, at: THREE.Vector3 | [number, number, number], amount: number) => callout(`pb-${key}`, text, tone, at, amount * w);
    const retimed = p > MAIN_GREEN.retimedAt;
    const mesh = b.dyn.mesh;
    const set = (id: number, x: number, z: number, ry: number, sc: number) => {
      T.q.setFromAxisAngle(T.y, ry);
      mesh.setMatrixAt(id, sc < 0.002 ? T.hide : T.m.compose(T.p.set(x, 0, z), T.q, T.s.setScalar(sc)));
    };
    islandState.hide.on = on;

    /* The main road's southbound queue: vehicles stop at red and behind each other. */
    {
      const green = signalGreen(true, JX, JZ, t);
      const q = b.queue;
      // order by distance to the stop line (u: + before it, − past it)
      const order = q.map((_, i) => i).sort((i, k) => q[i].u - q[k].u);
      let ahead = -Infinity, aheadLen = 0;
      for (const i of order) {
        const v = q[i];
        let next = v.u - 1.25 * dt;
        // keep a gap to the vehicle ahead
        next = Math.max(next, ahead + (aheadLen + v.len) / 2 + 0.05);
        // stop at the line on red (only if not already over it)
        if (!green && v.u >= STOP_LINE - 0.001) next = Math.max(next, STOP_LINE);
        v.u = Math.min(v.u, next);
        ahead = v.u;
        aheadLen = v.len;
      }
      // past the junction and out of view → join the back of the line
      let back = Math.max(...q.map((v) => v.u));
      for (const v of q)
        if (v.u < BOTTOM) {
          v.u = Math.max(TOP, back + GAP);
          back = v.u;
        }
      const counted = around(p, 1, 0.5, 0.5) + around(p, 5, 0.4, 0.5);
      q.forEach((v, i) => {
        const fade = ss(v.u, BOTTOM, BOTTOM + 0.6) * (1 - ss(v.u, TOP - 0.6, TOP));
        const sc = (v.m.startsWith("proc-") ? 1 : SCALE.car) * fade * (on ? 1 : 0);
        set(v.id, QUEUE_X, JZ + v.u, Math.PI, sc);
        const rk = counted * (v.u > 0.6 && v.u < 7 ? 1 : 0) * w;
        b.rings.setMatrixAt(i, rk > 0.01 ? T.m.compose(T.p.set(QUEUE_X, 0.05, JZ + v.u), T.q.identity(), T.s.setScalar(1)) : T.hide);
      });
      b.rings.instanceMatrix.needsUpdate = true;
      b.ringMat.uniforms.uOpacity.value = counted * w * (0.65 + 0.35 * Math.sin(t * 4));
    }

    /* Autos: on the corner until the stand moves. */
    {
      const move = ss(p, 4.2, 4.6);
      b.autos.forEach((id, i) => {
        const [ax, az] = AUTO_CORNER[i], [bx, bz] = AUTO_STAND[i];
        // down to the junction, then west along the side street
        const k = THREE.MathUtils.clamp(move * 1.3 - i * 0.12, 0, 1);
        const x = k < 0.45 ? ax : lerp(ax, bx, ss(k, 0.45, 1));
        const z = k < 0.45 ? lerp(az, bz, ss(k, 0, 0.45)) : bz;
        set(id, x, z, k < 0.45 ? Math.PI : -Math.PI / 2, on ? 1 : 0);
      });
      b.standMat.uniforms.uOpacity.value = ss(p, 4.1, 4.35) * w;
      if (R.stand) R.stand.position.set((AUTO_STAND[0][0] + AUTO_STAND[2][0]) / 2, 0.04, AUTO_STAND[0][1]);
      b.autoRingMat.uniforms.uOpacity.value = around(p, 3, 0.4, 0.4) * w * (0.7 + 0.3 * Math.sin(t * 5));
    }

    /* Signals: the main road's short green, then the new plan. */
    b.corners.forEach(([x, z, vertical], i) => {
      const green = signalGreen(vertical, JX, JZ, t);
      T.c.set(green ? "#5fe03a" : "#ff3b2f").multiplyScalar(1.6);
      b.lamps.setMatrixAt(i, T.m.makeTranslation(x, 0.78, z));
      b.lamps.setColorAt(i, T.c);
    });
    b.lamps.instanceMatrix.needsUpdate = true;
    if (b.lamps.instanceColor) b.lamps.instanceColor.needsUpdate = true;

    /* People. */
    const counting = Math.max(ss(p, 0.55, 0.85) * (1 - ss(p, 2.4, 2.7)), ss(p, 4.55, 4.85)) * w;
    {
      const C = b.crew;
      // 0–2: bystanders with opinions, at the north-west corner (Unknown)
      const opinions = around(p, 0, 0.5, 0.35) * w;
      for (let i = 0; i < 3; i++) {
        const x = JX - 1.25 - i * 0.35, z = JZ + 1.35 + (i % 2) * 0.3;
        const face = Math.atan2(JX - x, JZ - z) + Math.sin(t * 2 + i) * 0.5;
        C.set(i, x, z, face, opinions, "none", Math.max(0, Math.sin(t * 6 + i * 1.3)) * 0.02);
      }
      // 3: counts at the north-east corner (Observe, again in Validate); sketches during Map
      C.set(3, TRIPOD[0] + 0.25, TRIPOD[1] - 0.35, Math.atan2(JX - TRIPOD[0], JZ + 3 - TRIPOD[1]), counting, p > 1.6 && p < 2.6 ? "clipboard" : "counter");
      // 4: times the signal at the south-west pole, then reads the old plan at the cabinet
      const timer = ss(p, 0.6, 0.9) * (1 - ss(p, 3.7, 4.0)) * w;
      const atCab = ss(p, 2.55, 2.9);
      C.set(4, lerp(JX - 1.2, CABINET[0] + 0.32, atCab), lerp(JZ - 0.55, CABINET[1] - 0.05, atCab), atCab > 0.5 ? -Math.PI / 2 : Math.PI / 4, timer, atCab > 0.5 ? "tablet" : "clipboard");
      // 5: talks to the auto drivers on the corner (Understand → Build)
      const talk = ss(p, 2.7, 3.0) * (1 - ss(p, 4.5, 4.8)) * w;
      C.set(5, AUTO_CORNER[1][0] - 0.55, AUTO_CORNER[1][1] + 0.1, Math.PI / 2, talk, "clipboard");
      // 6: the signal technician loads the new plan (Build)
      const tech = ss(p, 3.55, 3.85) * (1 - ss(p, 4.6, 4.9)) * w;
      C.set(6, CABINET[0] + 0.3, CABINET[1] + 0.2, -Math.PI / 2, tech, "laptop");
      // 7–9: people crossing once the lights work properly
      for (let i = 0; i < 3; i++) {
        const lane = i % 2;
        const u = ((t * 0.3 + i * 0.41) % 1) * 2.2 - 1.1;
        const x = lane ? JX + u : JX - 0.95, z = lane ? JZ + 0.95 : JZ - u;
        const cross = ss(p, 4.65, 4.95) * w * (1 - ss(Math.abs(u), 0.95, 1.1));
        C.set(7 + i, x, z, lane ? Math.PI / 2 : Math.PI, cross, "none", Math.abs(Math.sin(t * 9 + i)) * 0.01);
      }
      C.commit();
      if (R.tripod) {
        R.tripod.visible = counting > 0.01;
        R.tripod.position.set(TRIPOD[0], 0, TRIPOD[1]);
        R.tripod.rotation.y = Math.atan2(JX - TRIPOD[0], JZ + 3 - TRIPOD[1]);
        R.tripod.scale.setScalar(1.4 * counting);
      }
    }

    /* Flow arrows on the road: heavy and stopped before, flowing after. */
    const map = ss(p, 1.45, 1.9) * (1 - ss(p, 2.55, 3.0)) * w;
    const flowOk = ss(p, 4.55, 4.9);
    const arrowsOn = Math.max(map, ss(p, 4.6, 4.95) * w * 0.85);
    b.arrowMat.opacity = arrowsOn * 0.95;
    if (arrowsOn > 0.01) {
      LANES.forEach((lane, li) => {
        const [x0, z0] = lane.from, [x1, z1] = lane.to;
        const len = Math.hypot(x1 - x0, z1 - z0);
        const dx = (x1 - x0) / len, dz = (z1 - z0) / len;
        const heading = Math.atan2(dx, dz);
        for (let k = 0; k < ARROWS_PER; k++) {
          const u = (t * 0.18 + k / ARROWS_PER + li * 0.13) % 1;
          let d = u * len;
          let jam = 0;
          if (flowOk < 0.5 && li === 0) {
            const queue = lane.stop - (ARROWS_PER - 1 - k) * 0.42;
            d = Math.min(u * lane.stop, queue);
            jam = THREE.MathUtils.clamp(1 - (lane.stop - d) / 2.4, 0, 1);
          }
          T.q.setFromAxisAngle(T.y, heading);
          T.p.set(x0 + dx * d, 0.07, z0 + dz * d);
          const edge = Math.min(d, len - d);
          b.arrows.setMatrixAt(li * ARROWS_PER + k, T.m.compose(T.p, T.q, T.s.setScalar(THREE.MathUtils.clamp(edge / 0.6, 0, 1) * 1.15 * lane.weight)));
          T.c.copy(TEAL).lerp(RED, jam).lerp(LIME, flowOk);
          b.arrows.setColorAt(li * ARROWS_PER + k, T.c);
        }
      });
      b.arrows.instanceMatrix.needsUpdate = true;
      if (b.arrows.instanceColor) b.arrows.instanceColor.needsUpdate = true;
    }
    b.arrows.visible = arrowsOn > 0.01;

    /* The sketch (Map). */
    const sketch = ss(p, 1.4, 1.75) * (1 - ss(p, 2.6, 2.95)) * w;
    b.sketchMat.uniforms.uOpacity.value = sketch * 0.97;
    b.sketchMat.uniforms.uReveal.value = ss(p, 1.55, 2.05) * 1.05;
    if (R.sketch) {
      R.sketch.visible = sketch > 0.01;
      R.sketch.position.set(3.6, 3.1, 22.4);
      R.sketch.quaternion.copy(cam.quaternion);
    }

    /* The timing chart (Understand → Build) and the delay chart (Validate). */
    const timingOn = ss(p, 2.55, 2.85) * (1 - ss(p, 4.45, 4.75)) * w;
    b.timing.update({
      opacity: timingOn,
      grow: ss(p, 2.6, 2.95),
      values: (i) => lerp(TIMING_BEFORE[i], TIMING_AFTER[i], ss(p, 3.9, 4.3)),
      tone: (i): BarTone => (i % 2 === 0 ? "slate" : retimed ? "lime" : i === 1 ? "red" : "teal"),
      camera: cam,
      // over the courtyard while we read it; across the main road once the plan is being changed
      at: T.v.set(lerp(4.0, 9.9, ss(p, 3.35, 3.85)), 2.7, lerp(23.2, 24.2, ss(p, 3.35, 3.85))),
    });
    const delayOn = ss(p, 4.55, 4.85) * w;
    b.delay.update({
      opacity: delayOn,
      grow: ss(p, 4.6, 4.95),
      values: (i) => lerp(DELAY_BEFORE[i], DELAY_AFTER[i], ss(p, 4.75, 5.0)),
      tone: (): BarTone => (p > 4.8 ? "lime" : "red"),
      camera: cam,
      at: T.v.set(3.8, 2.9, 22.6),
    });

    /* Narration. */
    const unknown = around(p, 0, 0.5, 0.25);
    say("u0", SC.unknown[0], "red", [QUEUE_X, 0.9, JZ + 3.6], unknown);
    say("u1", SC.unknown[1], "ink", [JX - 1.25, 0.95, JZ + 1.35], unknown);
    say("u2", SC.unknown[2], "ink", [JX - 1.95, 0.95, JZ + 1.65], unknown);
    const observe = around(p, 1, 0.45, 0.45);
    say("o0", SC.observe[0], "teal", [TRIPOD[0] + 0.25, 1.0, TRIPOD[1] - 0.35], observe);
    say("o1", SC.observe[1], "red", [QUEUE_X, 0.9, JZ + 5.2], observe * ss(p, 0.75, 0.95));
    say("o2", SC.observe[2], "red", [JX - 0.85, 1.25, JZ - 0.85], observe * ss(p, 0.85, 1.05));
    const mapK = around(p, 2, 0.45, 0.45);
    say("m0", SC.sketch, "teal", [3.6, 4.35, 22.4], mapK * ss(p, 1.6, 1.8));
    say("m1", SC.map[0], "red", [JX - OFF, 0.4, JZ + 3.4], mapK * ss(p, 1.85, 2.0));
    say("m2", SC.map[1], "red", [AUTO_CORNER[2][0], 0.7, AUTO_CORNER[2][1]], mapK * ss(p, 1.9, 2.05));
    const und = around(p, 3, 0.45, 0.45);
    say("w0", SC.timing, "teal", b.timing.at(0.5, 1.12, T.v), und * ss(p, 2.75, 2.9));
    say("w1", SC.understand[1], "red", b.timing.barTop(1, 0.3, T.v2), und * ss(p, 2.85, 3.0));
    say("w2", SC.understand[2], "red", [AUTO_CORNER[0][0], 0.75, AUTO_CORNER[0][1]], und * ss(p, 2.95, 3.1));
    const bld = around(p, 4, 0.45, 0.35);
    say("b0", SC.build[0], "lime", [CABINET[0], 1.0, CABINET[1]], bld * ss(p, 3.7, 3.9));
    say("b1", SC.build[1], "lime", [AUTO_STAND[1][0], 0.75, AUTO_STAND[1][1]], bld * ss(p, 4.3, 4.45));
    const ok = ss(p, 4.55, 4.95);
    say("v0", SC.validate[0], "lime", b.delay.at(0.5, 1.12, T.v), ok);
    say("v1", SC.validate[1], "ink", [TRIPOD[0] + 0.25, 1.0, TRIPOD[1] - 0.35], ok * ss(p, 4.8, 5));

    /* The hit: when a step starts, a shockwave crosses the junction and its name pops up. */
    {
      const si = Math.round(THREE.MathUtils.clamp(p, 0, 5));
      const h = H.current;
      if (si !== h.stage) {
        if (h.stage >= 0 && w > 0.5) h.at = t;
        h.stage = si;
      }
      const age = t - h.at;
      const k = THREE.MathUtils.clamp(age / 1.1, 0, 1);
      b.hitMat.uniforms.uColor.value.copy(HIT_COLORS[si]);
      b.hitMat.uniforms.uOpacity.value = age < 1.1 ? (1 - k) * (1 - k) * w : 0;
      if (R.hit) R.hit.scale.setScalar(1 + k * 16);
      callout("pb-hit", STAGE_TITLES[si], si >= 4 ? "lime" : si === 0 || si === 3 ? "red" : "teal", [CENTER.x, 3.4, CENTER.z], age < 1.8 ? (1 - ss(age, 1.2, 1.8)) * w : 0);
    }

    /* Validate: a check over the junction. */
    b.badgeMat.opacity = ok * w;
    b.checkMat.opacity = ok * w;
    if (R.badge) {
      R.badge.visible = ok * w > 0.01;
      R.badge.position.set(JX + 1.4, 2.6 + Math.sin(t * 2) * 0.08, JZ - 1.4);
      R.badge.quaternion.copy(cam.quaternion);
      R.badge.scale.setScalar(0.6 + ok * 0.4);
    }
  });

  const B2 = built;
  return (
    <group>
      <primitive object={B2.blockBatch.mesh} />
      <primitive object={B2.dyn.mesh} />
      <primitive object={B2.poles} />
      <primitive object={B2.lamps} />
      <mesh geometry={B2.cabinetGeo} material={B2.cabinetMat} position={[CABINET[0], 0, CABINET[1]]} rotation-y={Math.PI} castShadow />
      <mesh ref={(m) => void (r.current.tripod = m)} geometry={B2.tripodGeo} material={B2.tripodMat} visible={false} castShadow />
      <mesh ref={(m) => void (r.current.stand = m)} geometry={B2.standGeo} material={B2.standMat} renderOrder={3} />
      <primitive object={B2.crew.people} />
      <primitive object={B2.crew.tools} />
      <primitive object={B2.rings} renderOrder={3} />
      <primitive object={B2.autoRing} />
      <primitive object={B2.arrows} renderOrder={4} />
      <mesh ref={(m) => void (r.current.sketch = m)} material={B2.sketchMat} renderOrder={6} visible={false}>
        <planeGeometry args={[3.2, 2.0]} />
      </mesh>
      <primitive object={B2.timing.group} />
      <primitive object={B2.delay.group} />
      <mesh ref={(m) => void (r.current.hit = m)} position={[CENTER.x, 0.09, CENTER.z]} rotation-x={-Math.PI / 2} material={B2.hitMat} renderOrder={4}>
        <planeGeometry args={[1, 1]} />
      </mesh>
      <group ref={(g) => void (r.current.badge = g)} visible={false}>
        <mesh geometry={B2.badgeGeo} material={B2.badgeMat} />
        <mesh geometry={B2.checkGeo} material={B2.checkMat} position={[0, 0, 0.06]} />
      </group>
    </group>
  );
}
