import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/**
 * Low-poly pieces the Kenney kits don't have — pylons, cranes, ships, a
 * train, a helicopter, the exchange, people and birds — built from boxes
 * and cylinders with colours baked into vertices, so they share the city's
 * palette material and batches.
 */

type Part = THREE.BufferGeometry;
const _c = new THREE.Color();

function paint(g: THREE.BufferGeometry, hex: number | string) {
  g.deleteAttribute("uv");
  _c.set(hex);
  const n = g.attributes.position.count;
  const col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) col.set([_c.r, _c.g, _c.b], i * 3);
  g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  if (!g.index) {
    const idx = new Uint32Array(n).map((_, i) => i);
    g.setIndex(new THREE.BufferAttribute(idx, 1));
  }
  return g;
}

const place = (g: THREE.BufferGeometry, x: number, y: number, z: number, ry = 0, rx = 0, rz = 0) => {
  const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(1, 1, 1));
  return g.applyMatrix4(m);
};

/** Box resting on y (its base at y). */
export const box = (w: number, h: number, d: number, col: number | string, x = 0, y = 0, z = 0, ry = 0) =>
  place(paint(new THREE.BoxGeometry(w, h, d), col), x, y + h / 2, z, ry);
export const cyl = (rt: number, rb: number, h: number, col: number | string, x = 0, y = 0, z = 0, seg = 10) =>
  place(paint(new THREE.CylinderGeometry(rt, rb, h, seg), col), x, y + h / 2, z);
/** A beam from a to b. */
export function beam(a: THREE.Vector3, b: THREE.Vector3, t: number, col: number | string) {
  const len = a.distanceTo(b);
  const g = paint(new THREE.BoxGeometry(t, t, len), col);
  const mid = a.clone().add(b).multiplyScalar(0.5);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), b.clone().sub(a).normalize());
  return g.applyMatrix4(new THREE.Matrix4().compose(mid, q, new THREE.Vector3(1, 1, 1)));
}
export const merge = (parts: Part[]) => {
  const g = mergeGeometries(parts, false)!;
  parts.forEach((p) => p.dispose());
  g.computeBoundingBox();
  g.computeBoundingSphere();
  return g;
};
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

/* ------------------------------------------------------------------ */

const STEEL = 0xb9bec4;
const ORANGE = 0xf08a2a;
const YELLOW = 0xf5c234;
const WHITE = 0xf4f1ea;
const DARK = 0x3d434b;

/** Lattice transmission tower, ~2.4 tall, arms along x. */
export function pylon() {
  const p: Part[] = [];
  const h = 2.4;
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) p.push(beam(V(sx * 0.28, 0, sz * 0.28), V(sx * 0.06, h, sz * 0.06), 0.035, STEEL));
  for (let k = 0; k < 4; k++) {
    const y0 = (k / 4) * h * 0.85, y1 = ((k + 1) / 4) * h * 0.85;
    const r0 = 0.28 - (0.22 * y0) / h, r1 = 0.28 - (0.22 * y1) / h;
    p.push(beam(V(-r0, y0, r0), V(r1, y1, r1), 0.02, STEEL), beam(V(r0, y0, r0), V(-r1, y1, r1), 0.02, STEEL));
    p.push(beam(V(-r0, y0, -r0), V(r1, y1, -r1), 0.02, STEEL), beam(V(r0, y0, -r0), V(-r1, y1, -r1), 0.02, STEEL));
  }
  p.push(box(1.3, 0.05, 0.08, STEEL, 0, h * 0.78), box(0.95, 0.05, 0.08, STEEL, 0, h * 0.94));
  for (const x of [-0.62, 0.62, -0.45, 0.45]) p.push(cyl(0.025, 0.025, 0.12, 0x8a9096, x, (Math.abs(x) > 0.5 ? h * 0.78 : h * 0.94) - 0.12));
  return merge(p);
}
/** Where cables hang from a pylon (local). */
export const PYLON_ATTACH: [number, number][] = [
  [-0.62, 2.4 * 0.78 - 0.12],
  [0.62, 2.4 * 0.78 - 0.12],
];

/** Rail-mounted gantry crane over a container yard: span along x. */
export function gantryCrane(span = 2.6) {
  const p: Part[] = [];
  const h = 1.5;
  for (const sx of [-1, 1]) {
    p.push(box(0.1, h, 0.1, ORANGE, (sx * span) / 2, 0, -0.45), box(0.1, h, 0.1, ORANGE, (sx * span) / 2, 0, 0.45));
    p.push(box(0.12, 0.08, 1.05, DARK, (sx * span) / 2, 0, 0));
  }
  p.push(box(span + 0.2, 0.14, 0.14, ORANGE, 0, h, -0.45), box(span + 0.2, 0.14, 0.14, ORANGE, 0, h, 0.45));
  p.push(box(0.4, 0.2, 0.36, YELLOW, 0.3, h - 0.16, 0));
  return merge(p);
}

/** Ship-to-shore crane on the quay: the boom reaches out over the water (+x). */
export function quayCrane() {
  const p: Part[] = [];
  const h = 3.2;
  for (const [x, z] of [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]]) p.push(box(0.12, h, 0.12, 0x2f74c8, x, 0, z));
  p.push(box(1.2, 0.18, 1.2, 0x2f74c8, 0, h, 0));
  p.push(box(4.8, 0.16, 0.3, 0x2f74c8, 1.4, h + 0.25, 0));
  p.push(beam(V(-0.6, h + 0.3, 0), V(0, h + 1.3, 0), 0.07, 0x2f74c8), beam(V(0, h + 1.3, 0), V(3.6, h + 0.35, 0), 0.05, 0x2f74c8));
  p.push(box(0.5, 0.3, 0.45, WHITE, 0.4, h - 0.3, 0));
  return merge(p);
}

/** Tower crane: mast and (separately) the slewing jib, so it can turn. */
export function towerCrane() {
  const mast: Part[] = [];
  const h = 4.6;
  mast.push(box(0.9, 0.18, 0.9, 0x8a8f96, 0, 0, 0));
  for (const [x, z] of [[-0.12, -0.12], [0.12, -0.12], [0.12, 0.12], [-0.12, 0.12]]) mast.push(box(0.05, h, 0.05, YELLOW, x, 0.18, z));
  for (let y = 0.4; y < h; y += 0.36) mast.push(beam(V(-0.12, y, 0.12), V(0.12, y + 0.36, 0.12), 0.025, YELLOW), beam(V(0.12, y, -0.12), V(-0.12, y + 0.36, -0.12), 0.025, YELLOW));
  const jib: Part[] = [];
  jib.push(box(4.2, 0.16, 0.16, YELLOW, 1.3, 0, 0), box(1.4, 0.14, 0.2, YELLOW, -1.0, 0, 0));
  jib.push(box(0.5, 0.36, 0.34, 0x9aa1a8, -1.4, -0.05, 0)); // counterweight
  jib.push(box(0.32, 0.3, 0.3, WHITE, 0, -0.32, 0.18)); // cab
  jib.push(beam(V(0, 0.75, 0), V(3.2, 0.12, 0), 0.025, DARK), beam(V(0, 0.75, 0), V(-1.5, 0.12, 0), 0.025, DARK));
  jib.push(box(0.06, 0.75, 0.06, YELLOW, 0, 0, 0));
  return { mast: merge(mast), jib: merge(jib), height: h + 0.18 };
}

export function helicopter() {
  const body: Part[] = [];
  body.push(place(paint(new THREE.SphereGeometry(0.28, 10, 8), 0xe4483c), 0, 0.3, 0).scale(1, 0.85, 1.35));
  body.push(box(0.08, 0.08, 0.7, 0xe4483c, 0, 0.28, -0.6), box(0.04, 0.22, 0.12, 0xe4483c, 0, 0.3, -0.95));
  body.push(box(0.04, 0.03, 0.62, DARK, -0.2, 0, 0), box(0.04, 0.03, 0.62, DARK, 0.2, 0, 0));
  body.push(place(paint(new THREE.SphereGeometry(0.16, 8, 6), 0x9fd6ef), 0, 0.36, 0.22).scale(1, 0.8, 1));
  const rotor = merge([box(1.5, 0.015, 0.07, DARK), box(0.07, 0.015, 1.5, DARK), cyl(0.03, 0.03, 0.12, DARK, 0, -0.12)]);
  return { body: merge(body), rotor };
}

/** Cargo ship hull and bridge (containers are added on deck as models). */
export function cargoShip(len = 7) {
  const p: Part[] = [];
  const shape = new THREE.Shape();
  shape.moveTo(-0.7, -len / 2);
  shape.lineTo(0.7, -len / 2);
  shape.lineTo(0.7, len / 2 - 1.1);
  shape.quadraticCurveTo(0.6, len / 2 - 0.2, 0, len / 2);
  shape.quadraticCurveTo(-0.6, len / 2 - 0.2, -0.7, len / 2 - 1.1);
  shape.closePath();
  const hull = paint(new THREE.ExtrudeGeometry(shape, { depth: 0.55, bevelEnabled: false }), 0x2b3a55);
  hull.rotateX(Math.PI / 2);
  hull.translate(0, 0.45, 0);
  p.push(hull);
  const deck = paint(new THREE.ExtrudeGeometry(shape, { depth: 0.08, bevelEnabled: false }), 0xc8413a);
  deck.rotateX(Math.PI / 2);
  deck.translate(0, -0.05, 0);
  p.push(deck);
  p.push(box(1.3, 0.75, 0.8, WHITE, 0, 0.45, -len / 2 + 0.6), box(1.5, 0.08, 0.5, WHITE, 0, 1.2, -len / 2 + 0.7), box(0.22, 0.5, 0.22, 0xe0a12b, 0, 1.2, -len / 2 + 0.45));
  return merge(p);
}

/** Small boats in a few liveries. */
export function boat(variant: number) {
  const hullCol = [0xf4f1ea, 0xd9513f, 0x2f6fb3, 0xf2c14e][variant % 4];
  const p: Part[] = [];
  const shape = new THREE.Shape();
  shape.moveTo(-0.22, -0.5);
  shape.lineTo(0.22, -0.5);
  shape.lineTo(0.22, 0.15);
  shape.quadraticCurveTo(0.2, 0.42, 0, 0.55);
  shape.quadraticCurveTo(-0.2, 0.42, -0.22, 0.15);
  shape.closePath();
  const hull = paint(new THREE.ExtrudeGeometry(shape, { depth: 0.16, bevelEnabled: false }), hullCol);
  hull.rotateX(Math.PI / 2);
  hull.translate(0, 0.14, 0);
  p.push(hull);
  if (variant % 2 === 0) p.push(box(0.3, 0.18, 0.34, WHITE, 0, 0.14, -0.1), box(0.26, 0.04, 0.3, 0x9fd6ef, 0, 0.32, -0.1));
  else {
    const sail = new THREE.BufferGeometry().setFromPoints([V(0, 0.25, 0.05), V(0, 1.0, 0.05), V(0, 0.25, -0.38), V(0, 0.25, 0.05), V(0, 0.25, -0.38), V(0, 1.0, 0.05)]);
    sail.computeVertexNormals();
    p.push(cyl(0.012, 0.012, 0.9, 0xe9e2d0, 0, 0.14, 0.05), paint(sail, WHITE));
  }
  return merge(p);
}

export function trainCar(kind: "loco" | "wagon" | "coach", variant = 0) {
  const p: Part[] = [];
  const len = kind === "loco" ? 1.1 : 1.0;
  p.push(box(0.36, 0.06, len, DARK, 0, 0.06, 0));
  if (kind === "loco") {
    p.push(box(0.34, 0.36, len * 0.98, 0xe0442f, 0, 0.12, 0), box(0.35, 0.06, len * 0.99, 0xf4f1ea, 0, 0.3, 0), box(0.3, 0.1, 0.3, 0x2b3040, 0, 0.48, 0.2));
  } else if (kind === "coach") {
    p.push(box(0.34, 0.34, len * 0.96, 0x2f74c8, 0, 0.12, 0), box(0.35, 0.08, len * 0.97, 0xbfe3f2, 0, 0.28, 0), box(0.3, 0.03, len * 0.96, 0xd6dce2, 0, 0.46, 0));
  } else {
    p.push(box(0.34, 0.3, len * 0.96, [0x3b8f6a, 0xd9a43a, 0x8a5a3b][variant % 3], 0, 0.12, 0));
  }
  for (const z of [-len / 2 + 0.18, len / 2 - 0.18]) for (const x of [-0.16, 0.16]) p.push(place(paint(new THREE.CylinderGeometry(0.07, 0.07, 0.04, 8), 0x22262c), x, 0.07, z, 0, 0, Math.PI / 2));
  return merge(p);
}

/** The exchange: a columned hall on a podium, with a pediment. */
export function exchange() {
  const p: Part[] = [];
  p.push(box(3.2, 0.3, 2.4, 0xe8dcc4, 0, 0, 0), box(2.9, 0.12, 2.1, 0xf2ead8, 0, 0.3, 0));
  for (let i = 0; i < 7; i++) p.push(cyl(0.09, 0.1, 1.3, 0xf6efe0, -1.26 + i * 0.42, 0.42, 0.92, 10));
  p.push(box(2.7, 1.3, 1.5, 0xe9dfca, 0, 0.42, -0.2));
  p.push(box(3.0, 0.2, 2.2, 0xf2ead8, 0, 1.72, 0));
  const ped = new THREE.Shape();
  ped.moveTo(-1.5, 0);
  ped.lineTo(1.5, 0);
  ped.lineTo(0, 0.55);
  ped.closePath();
  const pg = paint(new THREE.ExtrudeGeometry(ped, { depth: 2.1, bevelEnabled: false }), 0xf6efe0);
  pg.translate(0, 1.92, -1.05);
  p.push(pg);
  return merge(p);
}

/** A transformer bay at the substation. */
export function transformer() {
  return merge([box(0.42, 0.34, 0.3, 0x8f979f, 0, 0.05, 0), box(0.46, 0.05, 0.34, 0x6e767e, 0, 0.0, 0), cyl(0.03, 0.03, 0.22, 0xc9ccd0, -0.12, 0.39, 0, 6), cyl(0.03, 0.03, 0.22, 0xc9ccd0, 0.12, 0.39, 0, 6), box(0.04, 0.3, 0.26, 0x6e767e, 0.23, 0.07, 0)]);
}

/** A rooftop helipad (to sit on a roof, y = 0 at its base). */
export function helipad() {
  const p: Part[] = [];
  p.push(cyl(0.62, 0.62, 0.03, 0x4a5058, 0, 0, 0, 24), cyl(0.5, 0.5, 0.032, 0xf4f1ea, 0, 0, 0, 24), cyl(0.44, 0.44, 0.034, 0x4a5058, 0, 0, 0, 24));
  p.push(box(0.06, 0.036, 0.42, 0xf4f1ea, -0.13, 0, 0), box(0.06, 0.036, 0.42, 0xf4f1ea, 0.13, 0, 0), box(0.26, 0.036, 0.06, 0xf4f1ea, 0, 0, 0));
  return merge(p);
}
export const redCross = () => merge([box(0.7, 0.03, 0.22, 0xe0362c), box(0.22, 0.03, 0.7, 0xe0362c)]);

/** A borewell pump head with its pipe. */
export const borewell = () => merge([box(0.5, 0.06, 0.5, 0xbab2a4), cyl(0.07, 0.07, 0.35, 0x3a76b8, 0, 0.06, 0), box(0.22, 0.2, 0.3, 0x3a76b8, 0.16, 0.06, 0), beam(V(0.1, 0.32, 0), V(0.8, 0.06, 0), 0.06, 0x6c7680)]);

/** A person: torso (tinted per instance) and head. */
export function person() {
  return merge([cyl(0.028, 0.036, 0.1, 0xffffff, 0, 0, 0, 6), place(paint(new THREE.SphereGeometry(0.026, 6, 5), 0xe7c39c), 0, 0.125, 0)]);
}

/** A bird: two wing triangles, flapped by scaling y. */
export function bird() {
  const g = new THREE.BufferGeometry().setFromPoints([V(0, 0, 0.05), V(-0.14, 0.05, -0.02), V(0, 0, -0.05), V(0, 0, 0.05), V(0, 0, -0.05), V(0.14, 0.05, -0.02)]);
  g.computeVertexNormals();
  return paint(g, 0x4b4440);
}

/** A ring of dashed survey stakes for the uncharted lots. */
export const stake = () => merge([box(0.04, 0.3, 0.04, 0xf4f1ea), box(0.05, 0.06, 0.05, 0xe0442f, 0, 0.26, 0)]);

/** Market umbrella stall. */
export const stall = (col: number) => merge([box(0.5, 0.22, 0.32, 0xc99a63), cyl(0.012, 0.012, 0.45, 0x5a4b3c, 0, 0.22, 0), place(paint(new THREE.ConeGeometry(0.42, 0.14, 8), col), 0, 0.73, 0)]);

/** An auto-rickshaw (three-wheeler): green-and-yellow body, black canopy. Faces +z, ~0.4 long. */
export function autoRickshaw() {
  const p: Part[] = [];
  p.push(box(0.24, 0.13, 0.3, 0x2f8a4e, 0, 0.05, -0.04)); // rear body
  p.push(box(0.18, 0.12, 0.12, 0xf2c230, 0, 0.05, 0.16)); // nose
  p.push(box(0.26, 0.03, 0.34, 0x1f2428, 0, 0.3, -0.02)); // canopy
  for (const [x, z] of [[-0.11, 0.1], [0.11, 0.1], [-0.11, -0.16], [0.11, -0.16]]) p.push(box(0.015, 0.13, 0.015, 0x1f2428, x, 0.18, z));
  p.push(box(0.2, 0.08, 0.02, 0x9cc8d8, 0, 0.2, 0.13)); // windscreen
  for (const x of [-0.11, 0.11]) p.push(place(paint(new THREE.CylinderGeometry(0.045, 0.045, 0.03, 10), 0x22262a), x, 0.045, -0.12, 0, 0, Math.PI / 2));
  p.push(place(paint(new THREE.CylinderGeometry(0.045, 0.045, 0.03, 10), 0x22262a), 0, 0.045, 0.18, 0, 0, Math.PI / 2));
  return merge(p);
}

/** A motorbike with its rider. Faces +z, ~0.26 long. */
export function motorbike() {
  const p: Part[] = [];
  p.push(box(0.05, 0.06, 0.24, 0x30363d, 0, 0.05, 0));
  for (const z of [-0.1, 0.1]) p.push(place(paint(new THREE.CylinderGeometry(0.04, 0.04, 0.025, 10), 0x22262a), 0, 0.04, z, 0, 0, Math.PI / 2));
  p.push(cyl(0.035, 0.04, 0.1, 0xe4483c, 0, 0.11, -0.02, 6)); // rider
  p.push(place(paint(new THREE.SphereGeometry(0.032, 8, 6), 0x2b2f35), 0, 0.24, -0.01)); // helmet
  return merge(p);
}

/** Every procedural piece, keyed like the kit models ("proc-…"). */
export function buildProcGeometries(): Record<string, THREE.BufferGeometry> {
  const crane = towerCrane();
  const heli = helicopter();
  return {
    "proc-pylon": pylon(),
    "proc-gantry": gantryCrane(),
    "proc-quay": quayCrane(),
    "proc-crane-mast": crane.mast,
    "proc-crane-jib": crane.jib,
    "proc-heli": heli.body,
    "proc-rotor": heli.rotor,
    "proc-ship": cargoShip(),
    "proc-boat0": boat(0),
    "proc-boat1": boat(1),
    "proc-boat2": boat(2),
    "proc-boat3": boat(3),
    "proc-loco": trainCar("loco"),
    "proc-coach": trainCar("coach"),
    "proc-wagon0": trainCar("wagon", 0),
    "proc-wagon1": trainCar("wagon", 1),
    "proc-wagon2": trainCar("wagon", 2),
    "proc-exchange": exchange(),
    "proc-transformer": transformer(),
    "proc-helipad": helipad(),
    "proc-cross": redCross(),
    "proc-borewell": borewell(),
    "proc-person": person(),
    "proc-auto": autoRickshaw(),
    "proc-bike": motorbike(),
    "proc-bird": bird(),
    "proc-stake": stake(),
    "proc-stall0": stall(0xe0442f),
    "proc-stall1": stall(0x2f9a8a),
    "proc-stall2": stall(0xf2b33d),
  };
}
export const CRANE_HEIGHT = 4.6 + 0.18;
