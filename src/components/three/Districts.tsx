"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { DISTRICTS, DISTRICT_LIST, LOGISTICS_BYPASS, type DistrictId, type FixType } from "./city-layout";
import { cityState } from "./city-state";
import { frame } from "./frame-state";
import { cityLabels, serviceLabels } from "./world-store";
import { CHAPTER } from "./landmarks";
import { focus } from "@/content/site-content";

/**
 * District landmarks plus the story each one plays:
 * a red bottleneck → a diagnostic scan → a fork of four possible fixes →
 * the right one builds and the jam clears.
 */

const CYAN = new THREE.Color("#65e4e8");
const LIME = new THREE.Color("#c7f36b");
const RED = new THREE.Color("#ff6b5e");
const SLATE = new THREE.Color("#9fb3c4");
const BODY = new THREE.Color(0.045, 0.057, 0.07);
const FIX_ORDER: FixType[] = ["software", "hardware", "process", "data"];

/** Focus-area copy keyed by district, for the problem label. */
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

/** A holographic panel: kind 0 = a selector (rows, one picked), kind 1 = a forecast chart. */
const holoFragment = /* glsl */ `
  uniform float uAmount; uniform float uTime; uniform float uKind;
  uniform vec3 uCyan; uniform vec3 uLime;
  varying vec2 vUv;
  float box(vec2 p, vec2 a, vec2 b) { return step(a.x, p.x) * step(p.x, b.x) * step(a.y, p.y) * step(p.y, b.y); }
  void main() {
    vec2 p = vUv;
    float edgeD = min(min(p.x, 1.0 - p.x), min(p.y, 1.0 - p.y));
    float frameL = 1.0 - smoothstep(0.0, 0.018, edgeD);
    vec2 g = abs(fract(p * vec2(10.0, 6.0) - 0.5) - 0.5) / fwidth(p * vec2(10.0, 6.0));
    float grid = 1.0 - min(min(g.x, g.y), 1.0);
    vec3 col = uCyan * (frameL * 0.9 + grid * 0.08 + 0.05);
    float a = frameL * 0.9 + grid * 0.08 + 0.12;
    if (uKind < 0.5) {
      // selector: input fields on top, result rows below, one row picked
      col += uCyan * box(p, vec2(0.08, 0.78), vec2(0.42, 0.86)) * 0.5;
      col += uCyan * box(p, vec2(0.52, 0.78), vec2(0.92, 0.86)) * 0.5;
      for (int i = 0; i < 4; i++) {
        float y = 0.14 + float(i) * 0.14;
        float picked = float(i == 2) * step(0.6, uAmount);
        float w = 0.45 + 0.4 * fract(sin(float(i) * 12.9) * 43.7);
        float r = box(p, vec2(0.08, y), vec2(0.08 + w * 0.84, y + 0.07));
        col += mix(uCyan * 0.45, uLime * 1.3, picked) * r;
        a += r * (0.35 + picked * 0.5);
      }
    } else {
      // chart: arrival bars and a forecast line through them
      for (int i = 0; i < 8; i++) {
        float x = 0.1 + float(i) * 0.105;
        float h = (0.25 + 0.5 * fract(sin(float(i) * 7.3) * 91.1)) * uAmount * 0.75;
        float r = box(p, vec2(x, 0.12), vec2(x + 0.07, 0.12 + h));
        col += uCyan * r * 0.55;
        a += r * 0.4;
      }
      float line = 0.12 + (0.35 + 0.18 * sin(p.x * 7.0 + 1.0)) * uAmount * 0.75;
      float l = 1.0 - smoothstep(0.0, 0.012, abs(p.y - line));
      col += uLime * l * 1.4 * step(0.1, p.x) * step(p.x, 0.92);
      a += l * 0.8;
    }
    float scan = 1.0 - smoothstep(0.0, 0.04, abs(p.y - fract(uTime * 0.45)));
    col += uCyan * scan * 0.35;
    a = clamp(a + scan * 0.2, 0.0, 1.0) * uAmount;
    gl_FragColor = vec4(col * uAmount, a);
  }
`;

const ringFragment = /* glsl */ `
  uniform vec3 uColor; uniform float uOpacity; varying vec2 vUv;
  void main() {
    float d = length(vUv - 0.5) * 2.0;
    float a = (1.0 - smoothstep(0.0, 0.06, abs(d - 0.9))) * uOpacity;
    gl_FragColor = vec4(uColor * a, a);
  }
`;

const drawVertex = /* glsl */ `attribute float aT; varying float vT; void main() { vT = aT; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const drawFragment = /* glsl */ `
  uniform float uDraw; uniform vec3 uColor; uniform float uOpacity; varying float vT;
  void main() { if (vT > uDraw) discard; gl_FragColor = vec4(uColor * uOpacity, uOpacity); }
`;

const additive = (fragmentShader: string, uniforms: Record<string, THREE.IUniform>, vertexShader = flatVertex) =>
  new THREE.ShaderMaterial({ vertexShader, fragmentShader, uniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });

/** Polylines (x, y, z) → LineSegments geometry with draw order aT. */
function drawLines(polys: THREE.Vector3[][]) {
  const pos: number[] = [];
  const t: number[] = [];
  const total = polys.reduce((n, p) => n + p.length - 1, 0);
  let k = 0;
  polys.forEach((poly) => {
    for (let i = 0; i < poly.length - 1; i++, k++) {
      pos.push(poly[i].x, poly[i].y, poly[i].z, poly[i + 1].x, poly[i + 1].y, poly[i + 1].z);
      t.push(k / total, (k + 1) / total);
    }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("aT", new THREE.Float32BufferAttribute(t, 1));
  return g;
}

/* ------------------------------------------------------------------ */
/* Landmark parts: dark solids with glowing edges                     */
/* ------------------------------------------------------------------ */

type Part = { geo: THREE.BufferGeometry; pos: [number, number, number]; rot?: number; tag?: string };

const box = (w: number, h: number, d: number, x: number, z: number, y = 0, rot = 0, tag?: string): Part => {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(0, h / 2, 0);
  return { geo: g, pos: [x, y, z], rot, tag };
};
const cyl = (rt: number, rb: number, h: number, x: number, z: number, seg = 16, tag?: string): Part => {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg);
  g.translate(0, h / 2, 0);
  return { geo: g, pos: [x, 0, z], tag };
};
const coolingTower = (x: number, z: number): Part => {
  const pts = [0, 0.2, 0.45, 0.7, 1].map((t) => new THREE.Vector2(0.95 - Math.sin(t * Math.PI * 0.85) * 0.38 + t * 0.05, t * 2.6));
  return { geo: new THREE.LatheGeometry(pts, 20), pos: [x, 0, z] };
};

function partsFor(id: DistrictId): Part[] {
  const d = DISTRICTS[id];
  switch (id) {
    case "farms":
      return [
        ...[0, 1, 2].flatMap((c) => [0, 1].map((r) => box(2.9, 0.03, 2.9, d.x - 5.2 + c * 3.2, d.z - 1.7 + r * 3.4, 0, 0, "field"))),
        ...[-2, 0, 2].map((o, i) => cyl(0.16, 0.2, 0.55, d.x + 4.6, d.z + o, 10, `pump${i}`)),
        cyl(0.55, 0.55, 2.1, d.x + 5.5, d.z + 5.2),
        box(1.8, 0.9, 1.2, d.x + 3.2, d.z + 5.4),
      ];
    case "logistics":
      return [
        box(4.2, 1.1, 1.6, d.x + 1.5, d.z + 3.2),
        box(4.2, 1.1, 1.6, d.x + 1.5, d.z + 0.6),
        box(3.4, 0.9, 1.4, d.x + 2.2, d.z - 3.4),
        box(1.1, 0.5, 1.4, d.x - 3.0, d.z, 0, 0, "dock1"),
        box(1.1, 0.5, 1.4, d.x - 2.2, d.z - 3.2, 0, 0, "dock2"),
      ];
    case "healthcare":
      return [
        box(4.6, 1.5, 1.5, d.x, d.z),
        box(1.5, 1.5, 4.6, d.x, d.z),
        box(1.6, 0.04, 0.45, d.x, d.z, 1.52, 0, "cross"),
        box(0.45, 0.04, 1.6, d.x, d.z, 1.52, 0, "cross"),
        box(1.2, 0.7, 1.2, d.x + 4, d.z + 3),
        box(1.2, 0.7, 1.2, d.x - 3.6, d.z - 3.2),
      ];
    case "energy":
      return [
        coolingTower(d.x + 3.4, d.z + 2.2),
        coolingTower(d.x + 3.4, d.z - 2.0),
        box(2.2, 1.4, 3.2, d.x + 0.4, d.z),
        ...[0, 1, 2, 3, 4, 5].map((i) => box(0.42, 0.42, 0.42, d.x - 4.6 + (i % 3) * 0.7, d.z + 1.1 + Math.floor(i / 3) * 0.7, 0, 0, "sub")),
        ...[0, 1, 2, 3].map((i) => box(0.12, 1.8, 0.12, 2.2 + i * 1.6, d.z - 1.3, 0, 0, `pylon${i}`)),
      ];
    case "markets":
      return [box(1.8, 5.6, 1.8, d.x, d.z), box(1.2, 0.8, 1.2, d.x, d.z, 5.6), box(0.1, 1.2, 0.1, d.x, d.z, 6.4)];
    case "open":
      return [];
  }
}

/* ------------------------------------------------------------------ */
/* Districts                                                          */
/* ------------------------------------------------------------------ */

export function Districts() {
  const built = useMemo(() => {
    const groups = DISTRICT_LIST.map((d) => {
      const parts = partsFor(d.id);
      const body = new THREE.MeshBasicMaterial({ color: BODY.clone() });
      const edge = new THREE.LineBasicMaterial({ color: CYAN.clone(), transparent: true, opacity: 0.15 });
      // Parts that change colour with the story get their own edge material.
      const special = (tag?: string) => tag === "sub" || tag === "pump1" || tag === "cross";
      const meshes = parts.map((p) => ({ ...p, edges: new THREE.EdgesGeometry(p.geo, 25), edgeMat: special(p.tag) ? edge.clone() : edge }));
      return { d, meshes, body, edge };
    });

    // Farms: furrows that glow once water reaches them.
    const F = DISTRICTS.farms;
    const furrowPolys: THREE.Vector3[][] = [];
    for (let c = 0; c < 3; c++)
      for (let r = 0; r < 2; r++)
        for (let k = 0; k < 7; k++) {
          const cx = F.x - 5.2 + c * 3.2, cz = F.z - 1.7 + r * 3.4 - 1.25 + k * 0.42;
          furrowPolys.push([new THREE.Vector3(cx - 1.3, 0.05, cz), new THREE.Vector3(cx + 1.3, 0.05, cz)]);
        }
    const furrows = drawLines(furrowPolys);
    const furrowMat = additive(drawFragment, { uDraw: { value: 1.01 }, uColor: { value: CYAN.clone() }, uOpacity: { value: 0.1 } }, drawVertex);

    // Logistics: the bypass lane (process fix) draws itself in.
    const bypass = drawLines([LOGISTICS_BYPASS.slice(2).map(([x, z]) => new THREE.Vector3(x, 0.06, z))]);
    const bypassMat = additive(drawFragment, { uDraw: { value: 0 }, uColor: { value: LIME.clone() }, uOpacity: { value: 0.9 } }, drawVertex);

    // Energy: cables between pylon tops.
    const E = DISTRICTS.energy;
    const cablePolys: THREE.Vector3[][] = [];
    for (let i = 0; i < 4; i++) {
      const x0 = i === 0 ? 0.6 : 2.2 + (i - 1) * 1.6;
      const x1 = 2.2 + i * 1.6;
      const pts: THREE.Vector3[] = [];
      for (let k = 0; k <= 10; k++) {
        const t = k / 10;
        pts.push(new THREE.Vector3(x0 + (x1 - x0) * t, 1.75 - Math.sin(t * Math.PI) * 0.25, E.z - 1.3));
      }
      cablePolys.push(pts);
    }
    const cables = drawLines(cablePolys);
    const cableMat = additive(drawFragment, { uDraw: { value: 1.01 }, uColor: { value: CYAN.clone() }, uOpacity: { value: 0.3 } }, drawVertex);

    // Open: dashed empty lots.
    const O = DISTRICTS.open;
    const lotPolys: THREE.Vector3[][] = [];
    [[-3, -2], [1.5, -2.5], [-2, 2.5], [2.5, 2]].forEach(([ox, oz]) => {
      const x = O.x + ox, z = O.z + oz, w = 1.6;
      const corners = [[x - w, z - w], [x + w, z - w], [x + w, z + w], [x - w, z + w], [x - w, z - w]];
      for (let i = 0; i < 4; i++)
        for (let k = 0; k < 6; k += 2) {
          const [ax, az] = corners[i], [bx, bz] = corners[i + 1];
          lotPolys.push([new THREE.Vector3(ax + ((bx - ax) * k) / 6, 0.04, az + ((bz - az) * k) / 6), new THREE.Vector3(ax + ((bx - ax) * (k + 1)) / 6, 0.04, az + ((bz - az) * (k + 1)) / 6)]);
        }
    });
    const lots = drawLines(lotPolys);
    const lotMat = additive(drawFragment, { uDraw: { value: 1.01 }, uColor: { value: SLATE.clone() }, uOpacity: { value: 0.35 } }, drawVertex);

    // Story pieces per district with a fix.
    const holoSoftware = additive(holoFragment, { uAmount: { value: 0 }, uTime: { value: 0 }, uKind: { value: 0 }, uCyan: { value: CYAN.clone() }, uLime: { value: LIME.clone() } });
    const holoData = additive(holoFragment, { uAmount: { value: 0 }, uTime: { value: 0 }, uKind: { value: 1 }, uCyan: { value: CYAN.clone() }, uLime: { value: LIME.clone() } });
    const markers = DISTRICT_LIST.map(() => ({
      red: additive(ringFragment, { uColor: { value: RED.clone() }, uOpacity: { value: 0 } }),
      scan: additive(ringFragment, { uColor: { value: CYAN.clone() }, uOpacity: { value: 0 } }),
      beam: new THREE.MeshBasicMaterial({ color: RED.clone(), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }),
    }));
    const sensorRing = additive(ringFragment, { uColor: { value: LIME.clone() }, uOpacity: { value: 0 } });

    // The fork: four branches from the bottleneck to the four fix labels (positions set per frame).
    const forkGeo = new THREE.BufferGeometry();
    forkGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(4 * 2 * 3), 3));
    forkGeo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(4 * 2 * 3), 3));
    const forkMat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0, depthWrite: false });

    return { groups, furrows, furrowMat, bypass, bypassMat, cables, cableMat, lots, lotMat, holoSoftware, holoData, markers, sensorRing, forkGeo, forkMat };
  }, []);

  useEffect(
    () => () => {
      const seen = new Set<unknown>();
      const visit = (v: unknown) => {
        if (!v || typeof v !== "object" || seen.has(v)) return;
        seen.add(v);
        if (Array.isArray(v)) return v.forEach(visit);
        if (v instanceof THREE.BufferGeometry || v instanceof THREE.Material) return v.dispose();
        Object.values(v).forEach(visit);
      };
      visit(built);
    },
    [built],
  );

  const builtRef = useRef(built);
  useEffect(() => {
    builtRef.current = built;
  }, [built]);

  const partRefs = useRef<Record<string, THREE.Object3D | null>>({});
  const holoRefs = useRef<{ software: THREE.Mesh | null; data: THREE.Mesh | null }>({ software: null, data: null });
  const markerRefs = useRef<{ red: THREE.Mesh | null; scan: THREE.Mesh | null; beam: THREE.Mesh | null }[]>([]);
  const sensorRefs = useRef<(THREE.Group | null)[]>([]);
  const lens = useRef<THREE.Mesh>(null);
  const beacon = useRef<THREE.Mesh>(null);
  const tmp = useRef({ v: new THREE.Vector3(), right: new THREE.Vector3(), up: new THREE.Vector3(), a: new THREE.Vector3(), lastFocus: "" as string });

  useFrame((state) => {
    const b = builtRef.current;
    const t = state.clock.elapsedTime;
    const cam = state.camera;
    const T = tmp.current;
    const W = state.size.width, H = state.size.height;
    // Screen position, kept inside the viewport so labels never get cut off.
    const project = (p: THREE.Vector3, padX = 150) => {
      T.v.copy(p).project(cam);
      const x = (T.v.x * 0.5 + 0.5) * W;
      const y = (-T.v.y * 0.5 + 0.5) * H;
      return {
        x: Math.min(W - padX, Math.max(padX, x)),
        y: Math.min(H - 40, Math.max(110, y)),
        ok: T.v.z < 1 && Math.abs(T.v.x) < 1.15 && Math.abs(T.v.y) < 1.15,
      };
    };

    // District materials follow their light.
    b.groups.forEach(({ d, edge, meshes }) => {
      const o = 0.3 + 0.65 * cityState[d.id].lit;
      edge.opacity = o;
      meshes.forEach((m) => (m.edgeMat.opacity = o));
    });

    const farms = cityState.farms, logi = cityState.logistics, health = cityState.healthcare, energy = cityState.energy, markets = cityState.markets;
    b.furrowMat.uniforms.uOpacity.value = 0.06 + 0.5 * farms.fixed * farms.lit;
    b.bypassMat.uniforms.uDraw.value = logi.fixed * 1.001;
    b.cableMat.uniforms.uOpacity.value = 0.12 + 0.4 * energy.lit;
    const dock2 = partRefs.current["logistics:dock2"];
    if (dock2) dock2.scale.y = Math.max(0.001, logi.fixed);

    // Problem colours on the landmarks themselves.
    b.groups.forEach(({ meshes }) => {
      meshes.forEach((m, i) => {
        if (m.tag === "sub") m.edgeMat.color.copy(CYAN).lerp(RED, energy.problem * (0.5 + 0.5 * Math.sin(t * 18 + i)));
        if (m.tag === "pump1") m.edgeMat.color.copy(CYAN).lerp(LIME, farms.fixed);
        if (m.tag === "cross") m.edgeMat.color.copy(CYAN).lerp(RED, health.problem * 0.7);
      });
    });

    // Holograms (software: farms selector; data: healthcare forecast) face the camera.
    const hs = holoRefs.current.software, hd = holoRefs.current.data;
    b.holoSoftware.uniforms.uAmount.value = farms.fixed;
    b.holoSoftware.uniforms.uTime.value = t;
    b.holoData.uniforms.uAmount.value = health.fixed;
    b.holoData.uniforms.uTime.value = t;
    if (hs) {
      hs.quaternion.copy(cam.quaternion);
      hs.scale.set(1, Math.max(0.001, farms.fixed), 1);
    }
    if (hd) {
      hd.quaternion.copy(cam.quaternion);
      hd.scale.set(1, Math.max(0.001, health.fixed), 1);
    }

    // Hardware: sensors on the pylons, signalling.
    sensorRefs.current.forEach((g, i) => {
      if (!g) return;
      const k = THREE.MathUtils.clamp(energy.fixed * 4 - i * 0.6, 0, 1);
      g.scale.setScalar(Math.max(0.001, k));
      g.rotation.y = t * 1.5;
    });
    b.sensorRing.uniforms.uOpacity.value = energy.fixed * (1 - ((t * 0.8) % 1));

    // Markets: the lens that sorts the data.
    if (lens.current) {
      lens.current.rotation.z = t * 0.6;
      lens.current.scale.setScalar(Math.max(0.001, markets.fixed));
    }
    if (beacon.current) {
      beacon.current.rotation.y = t * 0.7;
      beacon.current.position.y = 1.6 + Math.sin(t * 1.2) * 0.15;
    }

    // Bottleneck markers + diagnostic scan.
    DISTRICT_LIST.forEach((d, i) => {
      const s = cityState[d.id];
      const m = b.markers[i];
      const r = markerRefs.current[i];
      const pulse = (t * 0.9) % 1;
      m.red.uniforms.uOpacity.value = s.problem * (0.5 + 0.5 * Math.sin(t * 5));
      m.beam.opacity = s.problem * 0.45;
      m.scan.uniforms.uOpacity.value = s.diagnose * (1 - pulse);
      if (r?.scan) r.scan.scale.setScalar(0.4 + pulse * 3.2);
      if (r?.red) r.red.scale.setScalar(1 + Math.sin(t * 5) * 0.08);
    });

    /* ---- Labels ---- */
    const fid = cityState.focus;
    const fd = fid ? DISTRICTS[fid] : null;
    const fs = fid ? cityState[fid] : null;

    // Problem label (red) at the focused district's bottleneck.
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
        const p = project(T.a.set(fd.jam[0], 0.9, fd.jam[1]));
        pl.style.transform = `translate3d(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px, 0)`;
        op = p.ok ? Math.min(1, show * 1.4) * (1 - fs.fixed) : 0;
      }
      pl.style.opacity = String(op);
    }

    // The fork: four branches fanning up from the bottleneck, the right one chosen.
    const pos = b.forkGeo.attributes.position as THREE.BufferAttribute;
    const col = b.forkGeo.attributes.color as THREE.BufferAttribute;
    let forkOp = 0;
    if (fd && fs) {
      forkOp = fs.diagnose;
      T.right.setFromMatrixColumn(cam.matrixWorld, 0).setY(0).normalize();
      const origin = new THREE.Vector3(fd.jam[0], 0.5, fd.jam[1]);
      FIX_ORDER.forEach((fx, k) => {
        const end = origin.clone().addScaledVector(T.right, (k - 1.5) * 1.55).add(new THREE.Vector3(0, 2.4 + (k === 1 || k === 2 ? 0.45 : 0), 0));
        pos.setXYZ(k * 2, origin.x, origin.y, origin.z);
        pos.setXYZ(k * 2 + 1, end.x, end.y, end.z);
        const chosen = fd.fix === fx && fs.fixed > 0.45;
        const dim = fs.fixed > 0.45 && !chosen;
        const c = chosen ? LIME : dim ? SLATE.clone().multiplyScalar(0.35) : CYAN.clone().multiplyScalar(0.7);
        col.setXYZ(k * 2, c.r, c.g, c.b);
        col.setXYZ(k * 2 + 1, c.r, c.g, c.b);
        const el = cityLabels.fork[k];
        if (el) {
          const p = project(end, 70);
          el.style.transform = `translate3d(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px, 0)`;
          el.style.opacity = String(p.ok ? forkOp : 0);
          el.dataset.state = chosen ? "chosen" : dim ? "dim" : "idle";
        }
      });
      pos.needsUpdate = true;
      col.needsUpdate = true;
    } else {
      cityLabels.fork.forEach((el) => el && (el.style.opacity = "0"));
    }
    b.forkMat.opacity = forkOp * 0.9;

    // Services chapter: each solution type pinned to where it was used in the city.
    const showServices = THREE.MathUtils.smoothstep(frame.chapter, CHAPTER.services - 0.35, CHAPTER.services - 0.1) * (1 - THREE.MathUtils.smoothstep(frame.chapter, CHAPTER.services + 0.45, CHAPTER.services + 0.7));
    const anchors: THREE.Vector3[] = [
      new THREE.Vector3(DISTRICTS.farms.jam[0], 2.6, DISTRICTS.farms.jam[1]),
      new THREE.Vector3(4.6, 2.4, DISTRICTS.energy.z - 1.3),
      new THREE.Vector3(7.6, 0.8, -2.6),
      new THREE.Vector3(DISTRICTS.healthcare.jam[0], 2.8, DISTRICTS.healthcare.jam[1]),
    ];
    anchors.forEach((a, k) => {
      const el = serviceLabels[k];
      if (!el) return;
      const p = project(a);
      el.style.transform = `translate3d(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px, 0)`;
      // Narrow screens: the service cards carry this, labels would collide with the copy.
      el.style.opacity = String(p.ok && W >= 700 ? showServices : 0);
    });
  });

  const E = DISTRICTS.energy;
  const M = DISTRICTS.markets;
  const O = DISTRICTS.open;
  const Fm = DISTRICTS.farms;
  const Hc = DISTRICTS.healthcare;

  return (
    <group>
      {built.groups.map(({ d, meshes, body }) =>
        meshes.map((m, i) => (
          <group
            key={`${d.id}${i}`}
            position={m.pos}
            rotation-y={m.rot ?? 0}
            ref={(o) => {
              partRefs.current[`${d.id}:${m.tag ?? i}`] = o;
            }}
          >
            <mesh geometry={m.geo} material={body} />
            <lineSegments geometry={m.edges} material={m.edgeMat} />
          </group>
        )),
      )}

      <lineSegments geometry={built.furrows} material={built.furrowMat} renderOrder={2} />
      <lineSegments geometry={built.bypass} material={built.bypassMat} renderOrder={2} />
      <lineSegments geometry={built.cables} material={built.cableMat} renderOrder={2} />
      <lineSegments geometry={built.lots} material={built.lotMat} renderOrder={2} />

      {/* Software: a selector hologram over the farms' bottleneck */}
      <mesh
        ref={(m) => {
          holoRefs.current.software = m;
        }}
        position={[Fm.jam[0], 1.9, Fm.jam[1]]}
        material={built.holoSoftware}
        renderOrder={4}
      >
        <planeGeometry args={[2.3, 1.45]} />
      </mesh>
      {/* Data & AI: a forecast hologram over the hospital entrance */}
      <mesh
        ref={(m) => {
          holoRefs.current.data = m;
        }}
        position={[Hc.jam[0], 2.1, Hc.jam[1]]}
        material={built.holoData}
        renderOrder={4}
      >
        <planeGeometry args={[2.3, 1.45]} />
      </mesh>

      {/* Hardware: sensors on the pylon tops */}
      {[0, 1, 2, 3].map((i) => (
        <group
          key={i}
          position={[2.2 + i * 1.6, 1.95, E.z - 1.3]}
          ref={(g) => {
            sensorRefs.current[i] = g;
          }}
        >
          <mesh>
            <octahedronGeometry args={[0.13, 0]} />
            <meshBasicMaterial color={LIME} />
          </mesh>
          <mesh rotation-x={-Math.PI / 2} material={built.sensorRing}>
            <planeGeometry args={[1.1, 1.1]} />
          </mesh>
        </group>
      ))}

      {/* Markets: the lens over the exchange (Deal Lens) */}
      <mesh ref={lens} position={[M.x, 7.6, M.z]} rotation-x={Math.PI / 2}>
        <torusGeometry args={[1.25, 0.05, 8, 48]} />
        <meshBasicMaterial color={LIME} transparent opacity={0.9} />
      </mesh>

      {/* Uncharted: a beacon over empty lots */}
      <mesh ref={beacon} position={[O.x, 1.6, O.z]}>
        <octahedronGeometry args={[0.45, 0]} />
        <meshBasicMaterial color={SLATE} wireframe transparent opacity={0.7} />
      </mesh>

      {/* Bottleneck markers and scans */}
      {DISTRICT_LIST.map((d, i) => (
        <group key={d.id} position={[d.jam[0], 0.05, d.jam[1]]}>
          <mesh
            rotation-x={-Math.PI / 2}
            material={built.markers[i].red}
            ref={(m) => {
              markerRefs.current[i] = { ...(markerRefs.current[i] ?? { red: null, scan: null, beam: null }), red: m };
            }}
          >
            <planeGeometry args={[1.6, 1.6]} />
          </mesh>
          <mesh
            rotation-x={-Math.PI / 2}
            material={built.markers[i].scan}
            ref={(m) => {
              markerRefs.current[i] = { ...(markerRefs.current[i] ?? { red: null, scan: null, beam: null }), scan: m };
            }}
          >
            <planeGeometry args={[1.6, 1.6]} />
          </mesh>
          <mesh position={[0, 1.2, 0]} material={built.markers[i].beam}>
            <cylinderGeometry args={[0.03, 0.03, 2.4, 6, 1, true]} />
          </mesh>
        </group>
      ))}

      {/* The fork */}
      <lineSegments geometry={built.forkGeo} material={built.forkMat} renderOrder={5} frustumCulled={false} />
    </group>
  );
}
