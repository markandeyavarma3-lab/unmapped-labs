"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { PROCESS_BLOCK, SCALE, SETS, FACADE, footprint, type Placement } from "./city-layout";
import { createBatch, useModels, releaseBatch } from "./models";
import { box, cyl, merge, towerCrane } from "./procedural";
import { frame } from "./frame-state";
import { islandState } from "./views";
import { mulberry32 } from "./terrain-math";

/**
 * The five steps, played out inside one city block. Its junction is jammed:
 *   01 Observe    — a drone circles; people and stuck cars are highlighted
 *   02 Map        — a blueprint draws itself over the block
 *   03 Understand — x-ray: buildings ghost, the street opens, a faulty cable glows red
 *   04 Build      — a tower crane lowers a new controller into the cut
 *   05 Validate   — the street closes, the lights cycle, traffic flows; a green check
 * Progress comes from the Approach section (islandState.progress, 0 … 4).
 */

const B = PROCESS_BLOCK;
const [JX, JZ] = B.junction;
/** Tower crane mast, 3 units from the junction. */
const CRANE: [number, number] = [JX - 1.5, JZ + 2.6];
const PIT = { x0: JX - 0.55, x1: JX + 0.55, z0: JZ - 0.5, z1: JZ + 0.5, depth: 0.9 };

/** Camera keys per stage (position, target). */
export const PROCESS_KEYS: { pos: [number, number, number]; target: [number, number, number] }[] = [
  { pos: [-2.5, 6.2, 31], target: [4, 0.6, 23.5] },
  { pos: [4.2, 14, 28.5], target: [4, 0, 23] },
  { pos: [11.6, 3.4, 23.4], target: [JX, -0.35, JZ] },
  { pos: [12.5, 7, 28], target: [5.6, 2.2, 21.8] },
  { pos: [15, 8.5, 31], target: [5, 0, 19.5] },
];

const TEAL = new THREE.Color("#0fa3aa");
const LIME = new THREE.Color("#8fd61f");
const RED = new THREE.Color("#ff3b2f");

const stage = (p: number, i: number) => THREE.MathUtils.smoothstep(p, i - 0.55, i - 0.05) * (1 - THREE.MathUtils.smoothstep(p, i + 0.55, i + 0.95));

/* Blueprint: ribbons on the ground that draw in order (aT). */
const ribbonVertex = /* glsl */ `attribute float aT; varying float vT; void main() { vT = aT; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const ribbonFragment = /* glsl */ `
  uniform float uDraw; uniform vec3 uColor; uniform float uOpacity; varying float vT;
  void main() {
    if (vT > uDraw) discard;
    float head = smoothstep(uDraw - 0.04, uDraw, vT);
    gl_FragColor = vec4(mix(uColor, vec3(1.0), head * 0.6), uOpacity);
    #include <colorspace_fragment>
  }
`;

function ribbons(polys: [number, number][][], w: number, y: number) {
  const pos: number[] = [], t: number[] = [], idx: number[] = [];
  const total = polys.reduce((n, p) => n + p.length - 1, 0);
  let k = 0;
  for (const poly of polys)
    for (let i = 0; i < poly.length - 1; i++, k++) {
      const [x0, z0] = poly[i], [x1, z1] = poly[i + 1];
      const len = Math.hypot(x1 - x0, z1 - z0) || 1;
      const nx = (-(z1 - z0) / len) * w * 0.5, nz = ((x1 - x0) / len) * w * 0.5;
      const b = pos.length / 3;
      pos.push(x0 + nx, y, z0 + nz, x0 - nx, y, z0 - nz, x1 - nx, y, z1 - nz, x1 + nx, y, z1 + nz);
      t.push(k / total, k / total, (k + 1) / total, (k + 1) / total);
      idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("aT", new THREE.Float32BufferAttribute(t, 1));
  g.setIndex(idx);
  return g;
}

const ringFragment = /* glsl */ `
  uniform vec3 uColor; uniform float uOpacity; varying vec2 vUv;
  void main() {
    float d = length(vUv - 0.5) * 2.0;
    float a = (1.0 - smoothstep(0.0, 0.12, abs(d - 0.8))) * uOpacity;
    if (a < 0.01) discard;
    gl_FragColor = vec4(uColor, a);
    #include <colorspace_fragment>
  }
`;

/** Shared clipping planes that cut the street open over the pit (applied to the ground and roads). */
export const pitPlanes = [new THREE.Plane(), new THREE.Plane(), new THREE.Plane(), new THREE.Plane()];
/** Opens the hole by `k` (0 closed … 1 fully open). With clipIntersection, a fragment is cut only inside all four planes. */
function setPit(k: number) {
  const hw = ((PIT.x1 - PIT.x0) / 2) * k, hd = ((PIT.z1 - PIT.z0) / 2) * k;
  const cx = (PIT.x0 + PIT.x1) / 2, cz = (PIT.z0 + PIT.z1) / 2;
  // inside = negative side of every plane
  pitPlanes[0].set(new THREE.Vector3(1, 0, 0), -(cx + hw)); // x < cx+hw
  pitPlanes[1].set(new THREE.Vector3(-1, 0, 0), cx - hw); // x > cx-hw
  pitPlanes[2].set(new THREE.Vector3(0, 0, 1), -(cz + hd));
  pitPlanes[3].set(new THREE.Vector3(0, 0, -1), cz - hd);
  if (k <= 0.001) pitPlanes[0].set(new THREE.Vector3(1, 0, 0), 1e6); // nothing is inside: closed
}
setPit(0);

export function ProcessBlock() {
  const geos = useModels();

  const built = useMemo(() => {
    const rand = mulberry32(55);
    // Buildings around the block's edge — these ghost during the x-ray.
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
    placements.push({ m: "nat-tree_oak", x: 2.4, z: 24.0, ry: 1, s: 0.6, tint: 0xc9f0b4 }, { m: "nat-tree_default", x: 3.4, z: 24.6, ry: 2, s: 0.55, tint: 0xb8e6a0 });
    const ghostMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82, transparent: true, opacity: 1 });
    const blockBatch = createBatch(geos, placements, ghostMat);

    // X-ray outlines of the same buildings.
    const outlineMat = new THREE.LineBasicMaterial({ color: TEAL.clone(), transparent: true, opacity: 0, depthTest: false });
    const outlines = placements.slice(0, -2).map((p) => {
      const f = footprint(p);
      const h = (geos[p.m].boundingBox!.max.y - geos[p.m].boundingBox!.min.y) * p.s;
      const g = new THREE.EdgesGeometry(new THREE.BoxGeometry(f.w, h, f.d));
      g.translate(p.x, h / 2, p.z);
      return g;
    });

    // The drone.
    const drone = merge([box(0.3, 0.07, 0.3, 0x30363d), ...[[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([x, z]) => cyl(0.09, 0.09, 0.015, 0x9aa3ad, x * 0.2, 0.08, z * 0.2, 12)), box(0.06, 0.05, 0.06, 0x0fa3aa, 0, -0.05, 0.1)]);
    const droneMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6 });
    const scanCone = new THREE.ConeGeometry(1.2, 2.6, 24, 1, true);
    scanCone.translate(0, -1.3, 0);
    const scanMat = new THREE.MeshBasicMaterial({ color: TEAL.clone(), transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });

    // Highlight rings under the people standing in the block and the stuck cars.
    const spots: [number, number][] = [];
    for (let i = 0; i < 7; i++) spots.push([B.minX + 0.6 + rand() * (B.maxX - B.minX - 1.2), 23 + rand() * 2.4]);
    for (let i = 0; i < 4; i++) spots.push([JX - 0.27, JZ + 0.9 + i * 0.62]);
    for (let i = 0; i < 3; i++) spots.push([JX + 0.9 + i * 0.62, JZ - 0.25]);
    const ringMat = new THREE.ShaderMaterial({
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: ringFragment,
      transparent: true,
      depthWrite: false,
      toneMapped: false,
      uniforms: { uColor: { value: TEAL.clone() }, uOpacity: { value: 0 } },
    });
    const ringGeo = new THREE.PlaneGeometry(0.42, 0.42);
    ringGeo.rotateX(-Math.PI / 2);
    const rings = new THREE.InstancedMesh(ringGeo, ringMat, spots.length);
    const m4 = new THREE.Matrix4();
    spots.forEach(([x, z], i) => rings.setMatrixAt(i, m4.makeTranslation(x, 0.05, z)));
    const people = new THREE.InstancedMesh(geos["proc-person"], new THREE.MeshStandardMaterial({ vertexColors: true }), 7);
    const shirts = [0xe4483c, 0x2f74c8, 0xf2b33d, 0x3b9c6a, 0x8e5ac8, 0xff8a5c, 0x1fb5b0];
    for (let i = 0; i < 7; i++) {
      people.setMatrixAt(i, m4.makeTranslation(spots[i][0], 0, spots[i][1]));
      people.setColorAt(i, new THREE.Color(shirts[i]));
    }
    people.castShadow = true;

    // The blueprint: building footprints, kerbs, the junction, and flow arrows.
    const polys: [number, number][][] = [];
    for (const p of placements.slice(0, -2)) {
      const f = footprint(p);
      polys.push([[p.x - f.w / 2, p.z - f.d / 2], [p.x + f.w / 2, p.z - f.d / 2], [p.x + f.w / 2, p.z + f.d / 2], [p.x - f.w / 2, p.z + f.d / 2], [p.x - f.w / 2, p.z - f.d / 2]]);
    }
    polys.push([[B.minX - 0.1, B.minZ - 0.1], [B.maxX + 0.1, B.minZ - 0.1], [B.maxX + 0.1, B.maxZ + 0.1], [B.minX - 0.1, B.maxZ + 0.1], [B.minX - 0.1, B.minZ - 0.1]]);
    polys.push([[JX - 0.9, JZ - 0.9], [JX + 0.9, JZ - 0.9], [JX + 0.9, JZ + 0.9], [JX - 0.9, JZ + 0.9], [JX - 0.9, JZ - 0.9]]);
    for (let i = 0; i < 4; i++) polys.push([[JX - 0.27, JZ + 4.2 - i * 0.9], [JX - 0.27, JZ + 3.6 - i * 0.9]]);
    for (let i = 0; i < 4; i++) polys.push([[JX + 4.2 - i * 0.9, JZ - 0.25], [JX + 3.6 - i * 0.9, JZ - 0.25]]);
    const blueprintGeo = ribbons(polys, 0.045, 0.06);
    const blueprintMat = new THREE.ShaderMaterial({ vertexShader: ribbonVertex, fragmentShader: ribbonFragment, transparent: true, depthWrite: false, toneMapped: false, uniforms: { uDraw: { value: 0 }, uColor: { value: TEAL.clone() }, uOpacity: { value: 0 } } });
    const gridGeo = new THREE.PlaneGeometry(B.maxX - B.minX + 3.4, B.maxZ - B.minZ + 3.4, 1, 1);
    gridGeo.rotateX(-Math.PI / 2);
    gridGeo.translate((B.minX + B.maxX) / 2 + 0.8, 0.05, (B.minZ + B.maxZ) / 2 - 0.8);
    const gridMat = new THREE.ShaderMaterial({
      vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: `uniform float uOpacity; uniform vec3 uColor; varying vec3 vW;
        void main(){ vec2 g = abs(fract(vW.xz * 2.0 - 0.5) - 0.5) / fwidth(vW.xz * 2.0); float l = 1.0 - min(min(g.x, g.y), 1.0);
          gl_FragColor = vec4(uColor, (0.1 + l * 0.5) * uOpacity);
          #include <colorspace_fragment>
        }`,
      transparent: true,
      depthWrite: false,
      toneMapped: false,
      uniforms: { uOpacity: { value: 0 }, uColor: { value: new THREE.Color("#2f7fd8") } },
    });

    // The pit under the street: earth walls, the signal cable, its faulty section, the old controller.
    const pitW = PIT.x1 - PIT.x0, pitD = PIT.z1 - PIT.z0;
    const pitGeo = merge([
      box(pitW, 0.02, pitD, 0x6a4a30, 0, -PIT.depth, 0),
      box(pitW, PIT.depth, 0.02, 0x8a6240, 0, -PIT.depth, -pitD / 2),
      box(pitW, PIT.depth, 0.02, 0x8a6240, 0, -PIT.depth, pitD / 2),
      box(0.02, PIT.depth, pitD, 0x7a5636, -pitW / 2, -PIT.depth, 0),
      box(0.02, PIT.depth, pitD, 0x7a5636, pitW / 2, -PIT.depth, 0),
      box(0.08, 0.08, pitD, 0x3a6fb0, -0.25, -PIT.depth + 0.25, 0),
      box(pitW, 0.1, 0.1, 0x3a6fb0, 0, -PIT.depth + 0.4, 0.2),
    ]);
    const pitMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, side: THREE.DoubleSide });
    const fault = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.13, 0.13), new THREE.MeshBasicMaterial({ color: RED.clone(), toneMapped: false }));
    fault.position.set(0.18, -PIT.depth + 0.4, 0.2);
    const controller = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.2, 0.24), new THREE.MeshStandardMaterial({ color: LIME.clone(), emissive: LIME.clone(), emissiveIntensity: 0.35, roughness: 0.4 }));
    controller.castShadow = true;
    const cableGeo = new THREE.CylinderGeometry(0.008, 0.008, 1, 4);
    cableGeo.translate(0, -0.5, 0);
    const cable = new THREE.Mesh(cableGeo, new THREE.MeshBasicMaterial({ color: "#2b2f35" }));

    // The crane that builds the fix.
    const crane = towerCrane();
    const craneMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7 });

    // Validate: lime ripples and a floating check.
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
    const rippleMat = ringMat.clone();
    rippleMat.uniforms.uColor.value = LIME.clone();

    return {
      blockBatch, ghostMat, outlines, outlineMat, drone, droneMat, scanCone, scanMat, rings, ringMat, ringGeo, people, blueprintGeo, blueprintMat, gridGeo, gridMat,
      pitGeo, pitMat, fault, controller, cable, crane, craneMat, checkGeo, badgeGeo, badgeMat, checkMat, rippleMat, spots,
    };
  }, [geos]);

  useEffect(() => {
    const b = built;
    return () => {
      releaseBatch(b.blockBatch.mesh);
      [b.ghostMat, b.outlineMat, b.droneMat, b.scanMat, b.ringMat, b.blueprintMat, b.gridMat, b.pitMat, b.craneMat, b.badgeMat, b.checkMat, b.rippleMat].forEach((m) => m.dispose());
      [...b.outlines, b.drone, b.scanCone, b.ringGeo, b.blueprintGeo, b.gridGeo, b.pitGeo, b.crane.mast, b.crane.jib, b.checkGeo, b.badgeGeo, b.fault.geometry, b.controller.geometry, b.cable.geometry].forEach((g) => g.dispose());
      b.rings.dispose();
      b.people.dispose();
    };
  }, [built]);

  const ref = useRef(built);
  useEffect(() => {
    ref.current = built;
  }, [built]);
  const r = useRef<{ drone: THREE.Group | null; jib: THREE.Group | null; badge: THREE.Group | null; ripple: THREE.Mesh | null; pit: THREE.Group | null; scan: THREE.Mesh | null }>({ drone: null, jib: null, badge: null, ripple: null, pit: null, scan: null });
  const v = useRef(new THREE.Vector3());

  useFrame((state) => {
    const b = ref.current;
    const t = state.clock.elapsedTime;
    const w = frame.process;
    const p = islandState.progress;
    const R = r.current;
    const on = w > 0.01;

    // 01 Observe
    const observe = stage(p, 0) * w;
    if (R.drone) {
      R.drone.visible = on && p < 1.6;
      const a = t * 0.7;
      R.drone.position.set(4 + Math.cos(a) * 2.6, 3.2 + Math.sin(t * 1.4) * 0.12 + (1 - observe) * 2, 23.5 + Math.sin(a) * 2.2);
      R.drone.rotation.y = -a;
    }
    b.scanMat.opacity = observe * 0.12;
    b.ringMat.uniforms.uOpacity.value = observe * (0.6 + 0.4 * Math.sin(t * 4));

    // 02 Map
    const map = THREE.MathUtils.smoothstep(p, 0.45, 1.1) * (1 - THREE.MathUtils.smoothstep(p, 2.4, 2.9)) * w;
    b.blueprintMat.uniforms.uDraw.value = THREE.MathUtils.smoothstep(p, 0.5, 1.05) * 1.001;
    b.blueprintMat.uniforms.uOpacity.value = map * 0.95;
    b.gridMat.uniforms.uOpacity.value = map * 0.8;

    // 03 Understand: ghost the buildings, open the street.
    const xray = THREE.MathUtils.smoothstep(p, 1.5, 2.0) * (1 - THREE.MathUtils.smoothstep(p, 3.3, 3.75)) * w;
    b.ghostMat.opacity = 1 - xray * 0.8;
    b.ghostMat.depthWrite = xray < 0.05;
    b.outlineMat.opacity = xray * 0.9;
    const open = THREE.MathUtils.smoothstep(p, 1.6, 2.1) * (1 - THREE.MathUtils.smoothstep(p, 3.45, 3.8)) * w;
    setPit(open);
    if (R.pit) R.pit.visible = open > 0.01;
    // the fault glows until the new controller seats
    const seated = THREE.MathUtils.smoothstep(p, 3.05, 3.3);
    (b.fault.material as THREE.MeshBasicMaterial).color.copy(RED).lerp(LIME, seated);
    b.fault.scale.setScalar(1 + (1 - seated) * 0.15 * Math.sin(t * 8));

    // 04 Build: the crane swings the controller over and lowers it in.
    const build = THREE.MathUtils.smoothstep(p, 2.5, 3.25);
    if (R.jib) {
      // from the stack in the courtyard round to the junction (atan2(2.6, 1.5) ≈ 1.05)
      R.jib.rotation.y = THREE.MathUtils.lerp(3.5, 1.05, THREE.MathUtils.smoothstep(build, 0.0, 0.6));
      const reach = 3.0;
      const ang = R.jib.rotation.y;
      const hx = R.jib.position.x + Math.cos(ang) * reach, hz = R.jib.position.z - Math.sin(ang) * reach;
      const lower = THREE.MathUtils.smoothstep(build, 0.6, 1.0);
      const y = THREE.MathUtils.lerp(3.2, -PIT.depth + 0.5, lower);
      b.controller.position.set(hx, y, hz);
      b.controller.visible = on && p > 2.3 && p < 3.6;
      b.cable.position.set(hx, R.jib.position.y, hz);
      b.cable.scale.set(1, Math.max(0.01, R.jib.position.y - y - 0.11), 1);
      b.cable.visible = b.controller.visible;
    }

    // 05 Validate: lime ripple and the check.
    const ok = THREE.MathUtils.smoothstep(p, 3.55, 3.95) * w;
    b.badgeMat.opacity = ok;
    b.checkMat.opacity = ok;
    if (R.badge) {
      R.badge.visible = ok > 0.01;
      R.badge.position.set(JX, 2.4 + Math.sin(t * 2) * 0.08, JZ);
      R.badge.quaternion.copy(state.camera.quaternion);
      R.badge.scale.setScalar(0.6 + ok * 0.4);
    }
    const rip = (t * 0.6) % 1;
    b.rippleMat.uniforms.uOpacity.value = ok * (1 - rip);
    if (R.ripple) R.ripple.scale.setScalar(1 + rip * 14);

    // Stage labels follow their places in the block.
    const anchors: [number, number, number][] = [
      R.drone ? [R.drone.position.x, R.drone.position.y + 0.5, R.drone.position.z] : [4, 3.5, 23.5],
      [B.minX + 0.4, 0.3, B.maxZ + 0.6],
      [JX, 0.3, JZ - 1.2],
      [R.jib?.position.x ?? 5, 5.6, R.jib?.position.z ?? 24],
      [JX, 3.2, JZ],
    ];
    const W = state.size.width, H = state.size.height;
    anchors.forEach(([x, y, z], i) => {
      const el = islandState.labels[i];
      if (!el) return;
      v.current.set(x, y, z).project(state.camera);
      const sx = (v.current.x * 0.5 + 0.5) * W, sy = (-v.current.y * 0.5 + 0.5) * H;
      const near = 1 - THREE.MathUtils.clamp(Math.abs(p - i) * 1.6, 0, 1);
      el.style.transform = `translate3d(${sx.toFixed(1)}px, ${sy.toFixed(1)}px, 0)`;
      el.style.opacity = String(on && v.current.z < 1 ? Math.max(near, 0) * w : 0);
      el.dataset.active = Math.round(p) === i ? "true" : "false";
    });
  });

  return (
    <group>
      <primitive object={built.blockBatch.mesh} />
      {built.outlines.map((g, i) => (
        <lineSegments key={i} geometry={g} material={built.outlineMat} renderOrder={6} />
      ))}
      <primitive object={built.people} />
      <primitive object={built.rings} renderOrder={3} />
      <group ref={(g) => void (r.current.drone = g)} visible={false}>
        <mesh geometry={built.drone} material={built.droneMat} castShadow />
        <mesh geometry={built.scanCone} material={built.scanMat} />
      </group>
      <mesh geometry={built.gridGeo} material={built.gridMat} renderOrder={2} />
      <mesh geometry={built.blueprintGeo} material={built.blueprintMat} renderOrder={3} />
      <group ref={(g) => void (r.current.pit = g)} position={[(PIT.x0 + PIT.x1) / 2, 0, (PIT.z0 + PIT.z1) / 2]} visible={false}>
        <mesh geometry={built.pitGeo} material={built.pitMat} receiveShadow />
        <primitive object={built.fault} />
      </group>
      <primitive object={built.controller} />
      <primitive object={built.cable} />
      <mesh geometry={built.crane.mast} material={built.craneMat} position={[CRANE[0], 0, CRANE[1]]} castShadow />
      <group ref={(g) => void (r.current.jib = g)} position={[CRANE[0], 4.78, CRANE[1]]}>
        <mesh geometry={built.crane.jib} material={built.craneMat} castShadow />
      </group>
      <group ref={(g) => void (r.current.badge = g)} visible={false}>
        <mesh geometry={built.badgeGeo} material={built.badgeMat} />
        <mesh geometry={built.checkGeo} material={built.checkMat} position={[0, 0, 0.06]} />
      </group>
      <mesh ref={(m) => void (r.current.ripple = m)} position={[JX, 0.06, JZ]} rotation-x={-Math.PI / 2} material={built.rippleMat} renderOrder={3}>
        <planeGeometry args={[0.5, 0.5]} />
      </mesh>
    </group>
  );
}
