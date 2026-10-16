import * as THREE from "three";
import type { Geometries } from "../models";

/**
 * Shared pieces for the case scenes:
 *   · a crew — people who can hold real instruments (our team wears teal);
 *   · chart boards — bar charts that face the camera and morph from the
 *     "before" data to the "after" data, with an optional limit line;
 *   · puffs — short bursts (air leaks, steam) from fixed points.
 */

export const TEAL = new THREE.Color("#12a4ab");
export const LIME = new THREE.Color("#9bdc28");
export const RED = new THREE.Color("#ff4b3a");
export const SLATE = new THREE.Color("#9aa4ad");
export const TEAM_SHIRT = 0x12a4ab;

export const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
export const lerp = THREE.MathUtils.lerp;

/* ------------------------------------------------------------------ */
/* Crew                                                                */
/* ------------------------------------------------------------------ */

export type Tool = "none" | "clipboard" | "tablet" | "meter" | "probe" | "detector" | "laptop" | "counter" | "crate";

/** Size (w, h, d), colour and where it is held (height, reach forward). */
const TOOLS: Record<Exclude<Tool, "none">, { size: [number, number, number]; color: number; y: number; reach: number }> = {
  clipboard: { size: [0.055, 0.07, 0.006], color: 0xfdfbf6, y: 0.1, reach: 0.045 },
  tablet: { size: [0.075, 0.052, 0.007], color: 0x2b3036, y: 0.1, reach: 0.045 },
  meter: { size: [0.03, 0.055, 0.022], color: 0xf2c230, y: 0.095, reach: 0.05 },
  probe: { size: [0.008, 0.008, 0.1], color: 0xc9ced3, y: 0.07, reach: 0.07 },
  detector: { size: [0.032, 0.036, 0.1], color: 0x1f6f74, y: 0.09, reach: 0.07 },
  laptop: { size: [0.085, 0.008, 0.06], color: 0x8a9096, y: 0.075, reach: 0.06 },
  counter: { size: [0.026, 0.032, 0.02], color: 0xd8dde2, y: 0.095, reach: 0.045 },
  crate: { size: [0.11, 0.06, 0.08], color: 0xd9822b, y: 0.1, reach: 0.05 },
};

export type Crew = ReturnType<typeof createCrew>;

/** `count` people (instanced), each optionally holding one tool. Scale ≈ 1.6 reads at district distance. */
export function createCrew(geos: Geometries, count: number, shirts: number[], material: THREE.Material) {
  const people = new THREE.InstancedMesh(geos["proc-person"], material, count);
  const tools = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ roughness: 0.6 }), count);
  const c = new THREE.Color();
  for (let i = 0; i < count; i++) {
    people.setColorAt(i, c.setHex(shirts[i % shirts.length]));
    tools.setColorAt(i, c.setHex(0xffffff));
  }
  people.castShadow = true;
  people.frustumCulled = false;
  tools.frustumCulled = false;
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  const hide = new THREE.Matrix4().makeScale(0, 0, 0);
  const lastTool: (Tool | null)[] = Array(count).fill(null);
  return {
    people,
    tools,
    /** Place person i at (x, z) facing `heading`, at size `k` (0 hides), holding `tool`. `bob` lifts them (walking, cheering). */
    set(i: number, x: number, z: number, heading: number, k: number, tool: Tool = "none", bob = 0, y = 0) {
      if (k < 0.002) {
        people.setMatrixAt(i, hide);
        tools.setMatrixAt(i, hide);
        return;
      }
      const sc = 1.9 * k;
      q.setFromAxisAngle(up, heading);
      people.setMatrixAt(i, m.compose(p.set(x, y + bob, z), q, s.setScalar(sc)));
      if (tool === "none") {
        tools.setMatrixAt(i, hide);
        return;
      }
      const t = TOOLS[tool];
      p.set(x + Math.sin(heading) * t.reach * sc, y + bob + t.y * sc, z + Math.cos(heading) * t.reach * sc);
      tools.setMatrixAt(i, m.compose(p, q, s.set(t.size[0] * sc, t.size[1] * sc, t.size[2] * sc)));
      if (lastTool[i] !== tool) {
        lastTool[i] = tool;
        tools.setColorAt(i, c.setHex(t.color));
        if (tools.instanceColor) tools.instanceColor.needsUpdate = true;
      }
    },
    commit() {
      people.instanceMatrix.needsUpdate = true;
      tools.instanceMatrix.needsUpdate = true;
    },
    dispose() {
      people.dispose();
      tools.geometry.dispose();
      (tools.material as THREE.Material).dispose();
      tools.dispose();
    },
  };
}

/** Walk between waypoints: position along a closed or open path at distance d. */
export function walk(path: [number, number][], d: number, loop = true) {
  const seg: number[] = [];
  let total = 0;
  const n = loop ? path.length : path.length - 1;
  for (let i = 0; i < n; i++) {
    const [ax, az] = path[i], [bx, bz] = path[(i + 1) % path.length];
    seg.push(Math.hypot(bx - ax, bz - az));
    total += seg[i];
  }
  let u = loop ? ((d % total) + total) % total : Math.min(Math.max(d, 0), total - 1e-4);
  for (let i = 0; i < n; i++) {
    if (u <= seg[i]) {
      const [ax, az] = path[i], [bx, bz] = path[(i + 1) % path.length];
      const k = u / (seg[i] || 1);
      return { x: ax + (bx - ax) * k, z: az + (bz - az) * k, heading: Math.atan2(bx - ax, bz - az) };
    }
    u -= seg[i];
  }
  return { x: path[0][0], z: path[0][1], heading: 0 };
}

/* ------------------------------------------------------------------ */
/* Chart boards                                                        */
/* ------------------------------------------------------------------ */

const dashFragment = /* glsl */ `
  uniform vec3 uColor; uniform float uOpacity; varying vec2 vUv;
  void main() {
    if (fract(vUv.x * 22.0) > 0.55) discard;
    gl_FragColor = vec4(uColor, uOpacity);
    #include <colorspace_fragment>
  }
`;
const flatVertex = /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

export type BarTone = "teal" | "red" | "lime" | "slate";
const TONES: Record<BarTone, THREE.Color> = { teal: TEAL, red: RED, lime: LIME, slate: SLATE };

export type Chart = ReturnType<typeof createChart>;

/**
 * A board of `n` bars, `w` × `h` world units, that stands upright and turns
 * to the camera. Values are 0 … 1 of the board's height. An optional limit
 * line (0 … 1) is drawn dashed across it.
 */
export function createChart(n: number, w: number, h: number, opts: { limit?: number; labels?: string[] } = {}) {
  const group = new THREE.Group();
  // Charts are overlays: always drawn on top of the city.
  const plateMat = new THREE.MeshBasicMaterial({ color: "#fffdf8", transparent: true, opacity: 0, depthWrite: false, depthTest: false });
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(w + 0.5, h + (opts.labels ? 0.85 : 0.55)), plateMat);
  if (opts.labels) plate.position.y = -0.15;
  plate.position.set(0, 0.02, -0.04);
  plate.renderOrder = 5;
  const barMat = new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0, toneMapped: false, depthTest: false });
  const bars = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 0.06), barMat, n);
  bars.setColorAt(0, new THREE.Color());
  bars.frustumCulled = false;
  bars.renderOrder = 6;
  const axisMat = new THREE.MeshBasicMaterial({ color: "#2b2f35", transparent: true, opacity: 0, depthWrite: false, depthTest: false });
  const axis = new THREE.Mesh(new THREE.PlaneGeometry(w + 0.2, 0.03), axisMat);
  axis.position.y = -h / 2;
  axis.renderOrder = 6;
  const limitMat = new THREE.ShaderMaterial({ vertexShader: flatVertex, fragmentShader: dashFragment, transparent: true, depthWrite: false, depthTest: false, toneMapped: false, uniforms: { uColor: { value: RED.clone() }, uOpacity: { value: 0 } } });
  const limit = new THREE.Mesh(new THREE.PlaneGeometry(w + 0.2, 0.035), limitMat);
  limit.renderOrder = 7;
  limit.visible = opts.limit !== undefined;
  group.add(plate, bars, axis, limit);
  // bar labels, drawn once on a canvas strip under the axis
  let labelMat: THREE.MeshBasicMaterial | null = null;
  let labelTex: THREE.CanvasTexture | null = null;
  if (opts.labels) {
    const cw = 1024, chh = 96;
    const cv = document.createElement("canvas");
    cv.width = cw;
    cv.height = chh;
    const g = cv.getContext("2d")!;
    g.fillStyle = "#4b5560";
    g.font = `500 ${opts.labels.length > 6 ? 30 : 34}px ui-sans-serif, system-ui, sans-serif`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    opts.labels.forEach((l, i) => g.fillText(l, ((i + 0.5) / opts.labels!.length) * cw, chh / 2));
    labelTex = new THREE.CanvasTexture(cv);
    labelTex.colorSpace = THREE.SRGBColorSpace;
    labelMat = new THREE.MeshBasicMaterial({ map: labelTex, transparent: true, opacity: 0, depthWrite: false, depthTest: false });
    const labels = new THREE.Mesh(new THREE.PlaneGeometry(w, (w * chh) / cw), labelMat);
    labels.position.y = -h / 2 - 0.22;
    labels.renderOrder = 7;
    group.add(labels);
  }
  group.visible = false;

  const m = new THREE.Matrix4(), p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3(), col = new THREE.Color();
  const step = w / n;
  return {
    group,
    w,
    h,
    /** World point at (u, v) ∈ [0, 1]² on the board (for callouts). */
    at(u: number, v: number, out = new THREE.Vector3()) {
      return group.localToWorld(out.set((u - 0.5) * w, (v - 0.5) * h, 0.05));
    },
    /** Top of bar i (for callouts). */
    barTop(i: number, value: number, out = new THREE.Vector3()) {
      return group.localToWorld(out.set(-w / 2 + (i + 0.5) * step, -h / 2 + value * h + 0.12, 0.05));
    },
    update(o: { opacity: number; grow: number; values: (i: number) => number; tone: (i: number) => BarTone; limit?: number; camera: THREE.Camera; at: THREE.Vector3 }) {
      group.visible = o.opacity > 0.01;
      if (!group.visible) return;
      group.position.copy(o.at);
      p.copy(o.camera.position).sub(group.position);
      group.rotation.set(0, Math.atan2(p.x, p.z), 0);
      group.updateMatrixWorld();
      plateMat.opacity = o.opacity * 0.92;
      barMat.opacity = o.opacity;
      axisMat.opacity = o.opacity;
      limitMat.uniforms.uOpacity.value = o.opacity;
      if (labelMat) labelMat.opacity = o.opacity;
      if (o.limit !== undefined) limit.position.y = -h / 2 + o.limit * h;
      for (let i = 0; i < n; i++) {
        const g = Math.min(1, Math.max(0, o.grow * 1.6 - (i / n) * 0.6));
        const v = Math.max(0.012, o.values(i) * g) * h;
        q.identity();
        bars.setMatrixAt(i, m.compose(p.set(-w / 2 + (i + 0.5) * step, -h / 2 + v / 2, 0), q, s.set(step * 0.7, v, 1)));
        bars.setColorAt(i, col.copy(TONES[o.tone(i)]));
      }
      bars.instanceMatrix.needsUpdate = true;
      if (bars.instanceColor) bars.instanceColor.needsUpdate = true;
    },
    dispose() {
      group.traverse((o) => (o as THREE.Mesh).geometry?.dispose());
      [plateMat, barMat, axisMat, limitMat].forEach((x) => x.dispose());
      labelMat?.dispose();
      labelTex?.dispose();
      bars.dispose();
    },
  };
}

/* ------------------------------------------------------------------ */
/* Puffs                                                               */
/* ------------------------------------------------------------------ */

const puffVertex = /* glsl */ `
  attribute vec3 aOrigin; attribute vec3 aDir; attribute float aPhase; attribute float aSource;
  uniform float uTime; uniform float uScale; uniform float uOn[16];
  varying float vAlpha;
  void main() {
    float on = uOn[int(aSource)];
    float age = fract(uTime * 1.4 + aPhase);
    vec3 p = aOrigin + aDir * age * 0.5 + vec3(0.0, age * 0.12, 0.0);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = (0.09 + age * 0.26) * uScale / -mv.z;
    vAlpha = (1.0 - age) * on * 0.95;
  }
`;
const puffFragment = /* glsl */ `
  uniform vec3 uColor; varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = (1.0 - smoothstep(0.15, 0.5, d)) * vAlpha;
    if (a < 0.02) discard;
    gl_FragColor = vec4(uColor, a);
    #include <colorspace_fragment>
  }
`;

/** Little bursts from up to 16 sources; `on[i]` (0 … 1) turns each one on. */
export function createPuffs(sources: { at: [number, number, number]; dir: [number, number, number] }[], perSource = 14, color = "#f4f6f8") {
  const n = sources.length * perSource;
  const origin = new Float32Array(n * 3), dir = new Float32Array(n * 3), phase = new Float32Array(n), src = new Float32Array(n);
  sources.forEach((s, k) => {
    for (let i = 0; i < perSource; i++) {
      const j = k * perSource + i;
      origin.set(s.at, j * 3);
      const jitter = () => (Math.sin(j * 12.9898 + k * 78.233) * 43758.5453) % 0.25;
      dir.set([s.dir[0] + jitter(), s.dir[1] + jitter() * 0.5, s.dir[2] - jitter()], j * 3);
      phase[j] = i / perSource;
      src[j] = k;
    }
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(origin.slice(), 3));
  geometry.setAttribute("aOrigin", new THREE.BufferAttribute(origin, 3));
  geometry.setAttribute("aDir", new THREE.BufferAttribute(dir, 3));
  geometry.setAttribute("aPhase", new THREE.BufferAttribute(phase, 1));
  geometry.setAttribute("aSource", new THREE.BufferAttribute(src, 1));
  const material = new THREE.ShaderMaterial({
    vertexShader: puffVertex,
    fragmentShader: puffFragment,
    transparent: true,
    depthWrite: false,
    uniforms: { uTime: { value: 0 }, uScale: { value: 1 }, uOn: { value: new Array(16).fill(0) }, uColor: { value: new THREE.Color(color) } },
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  return { points, material, geometry, on: material.uniforms.uOn.value as number[] };
}
