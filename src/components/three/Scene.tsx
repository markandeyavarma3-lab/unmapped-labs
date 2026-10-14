"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { CAMERA_KEYS, NODES, PATHS, nodeById } from "./landmarks";
import { TERRAIN, terrainHeight, mulberry32 } from "./terrain-math";
import {
  NODE_SLOTS,
  hexToVec3,
  particleFragment,
  particleVertex,
  pathFragment,
  pathVertex,
  terrainFragment,
  terrainVertex,
} from "./shaders";
import { CHAPTERS, world } from "./world-store";
import { SurveyNodes } from "./SurveyNodes";
import { frame } from "./frame-state";

export type Tier = "high" | "low";

const INK = hexToVec3("#080b0e");
const LINE = hexToVec3("#9fb3c4");
const CYAN = hexToVec3("#65e4e8");
const FOG: [number, number] = [16, 60];

const clamp01 = (v: number) => Math.min(Math.max(v, 0), 1);
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

export function Scene({ tier, introDelay }: { tier: Tier; introDelay: number }) {
  return (
    <>
      <CameraRig tier={tier} introDelay={introDelay} />
      <Terrain tier={tier} />
      <Paths />
      <SurveyNodes />
      {tier === "high" && <Particles />}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Camera rig — single source of motion                               */
/* ------------------------------------------------------------------ */

function CameraRig({ tier, introDelay }: { tier: Tier; introDelay: number }) {
  const curves = useMemo(() => {
    const pos = new THREE.CatmullRomCurve3(CAMERA_KEYS.map((k) => new THREE.Vector3(...k.pos)), false, "centripetal");
    const target = new THREE.CatmullRomCurve3(CAMERA_KEYS.map((k) => new THREE.Vector3(...k.target)), false, "centripetal");
    return { pos, target };
  }, []);

  const scratch = useRef({
    pos: new THREE.Vector3(),
    target: new THREE.Vector3(),
    fwd: new THREE.Vector3(),
    right: new THREE.Vector3(),
    up: new THREE.Vector3(0, 1, 0),
    parallax: new THREE.Vector2(),
    offset: 0,
  });

  // Track whether a fine pointer has actually moved (touch never counts).
  const pointerLive = useRef(false);
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "mouse" || e.pointerType === "pen") pointerLive.current = true;
    };
    const onLeave = () => (pointerLive.current = false);
    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  useFrame((state, delta) => {
    const f = frame;
    const tmp = scratch.current;
    const cam = state.camera as THREE.PerspectiveCamera;
    const size = state.size;
    const dt = Math.min(delta, 1 / 20);
    const t = state.clock.elapsedTime;

    // Chapter, smoothed so scroll jumps become camera glides.
    f.chapter = THREE.MathUtils.damp(f.chapter, world.chapter, 2.6, dt);
    const u = clamp01(f.chapter / CHAPTERS);
    curves.pos.getPoint(u, tmp.pos);
    curves.target.getPoint(u, tmp.target);

    // Pointer parallax in camera space, damped.
    const live = pointerLive.current && tier === "high";
    tmp.parallax.x = THREE.MathUtils.damp(tmp.parallax.x, live ? state.pointer.x : 0, 2.2, dt);
    tmp.parallax.y = THREE.MathUtils.damp(tmp.parallax.y, live ? state.pointer.y : 0, 2.2, dt);
    tmp.fwd.subVectors(tmp.target, tmp.pos).normalize();
    tmp.right.crossVectors(tmp.fwd, tmp.up).normalize();
    tmp.pos.addScaledVector(tmp.right, tmp.parallax.x * 0.9);
    tmp.pos.y += tmp.parallax.y * 0.45 + Math.sin(t * 0.17) * 0.18;
    tmp.pos.addScaledVector(tmp.right, Math.sin(t * 0.11) * 0.3);

    cam.position.copy(tmp.pos);
    cam.lookAt(tmp.target);

    // Framing: wider lens on portrait screens; on wide screens, shift the
    // hero composition right so the headline owns the left column.
    const aspect = size.width / size.height;
    const fov = aspect < 0.8 ? 60 : aspect < 1.2 ? 50 : 40;
    const heroWeight = 1 - clamp01(f.chapter / 1.2);
    const targetOffset = aspect > 1.2 ? size.width * 0.13 * heroWeight : 0;
    tmp.offset = THREE.MathUtils.damp(tmp.offset, targetOffset, 4, dt);
    if (cam.fov !== fov) cam.fov = fov;
    cam.setViewOffset(size.width, size.height, -tmp.offset, 0, size.width, size.height);

    // Path draw-in and node discovery derive from the smoothed chapter.
    const introT = easeOutCubic(clamp01((t - introDelay) / 2.6));
    f.introT = introT;
    PATHS.forEach((p, i) => {
      const raw = clamp01((f.chapter - p.span[0]) / (p.span[1] - p.span[0]));
      f.draws[i] = raw * clamp01(introT * 1.4 - 0.3);
    });
    NODES.forEach((n, i) => {
      let s = n.label ? 0.25 : 0.1;
      PATHS.forEach((p, j) => {
        if (p.from === n.id) s = Math.max(s, clamp01(f.draws[j] * 5));
        if (p.to === n.id) s = Math.max(s, clamp01((f.draws[j] - 0.82) * 6));
      });
      f.nodeStrength[i] = s * introT;
    });
  });

  return null;
}

/* ------------------------------------------------------------------ */
/* Terrain                                                            */
/* ------------------------------------------------------------------ */

function Terrain({ tier }: { tier: Tier }) {
  const mesh = useRef<THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>>(null);

  const { geometry, range } = useMemo(() => {
    const segX = tier === "high" ? 230 : 120;
    const segZ = tier === "high" ? 380 : 200;
    const geo = new THREE.PlaneGeometry(TERRAIN.width, TERRAIN.depth, segX, segZ);
    geo.rotateX(-Math.PI / 2);
    geo.translate(0, 0, TERRAIN.centerZ);
    const pos = geo.attributes.position as THREE.BufferAttribute;
    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i < pos.count; i++) {
      const h = terrainHeight(pos.getX(i), pos.getZ(i));
      pos.setY(i, h);
      if (h < min) min = h;
      if (h > max) max = h;
    }
    geo.computeVertexNormals();
    geo.computeBoundingSphere();
    return { geometry: geo, range: [min, max] as [number, number] };
  }, [tier]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: terrainVertex,
        fragmentShader: terrainFragment,
        uniforms: {
          uTime: { value: 0 },
          uIntro: { value: 0 },
          uRevealRadius: { value: 8 },
          uFocus: { value: new THREE.Vector2() },
          uPointer: { value: new THREE.Vector2(999, 999) },
          uPointerStrength: { value: 0 },
          uNodes: { value: Array.from({ length: NODE_SLOTS }, () => new THREE.Vector3(999, 999, 0)) },
          uHeightRange: { value: new THREE.Vector2(...range) },
          uBg: { value: new THREE.Vector3(...INK) },
          uLine: { value: new THREE.Vector3(...LINE) },
          uCyan: { value: new THREE.Vector3(...CYAN) },
          uFog: { value: new THREE.Vector2(...FOG) },
        },
      }),
    [range],
  );
  useEffect(() => () => material.dispose(), [material]);

  const scratch = useRef({
    ray: new THREE.Raycaster(),
    plane: new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.4),
    hit: new THREE.Vector3(),
    ptr: new THREE.Vector2(999, 999),
    strength: 0,
    fine: typeof window !== "undefined" && window.matchMedia("(pointer: fine)").matches,
    focus: new THREE.Vector3(),
  });

  useFrame((state, delta) => {
    if (!mesh.current) return;
    const f = frame;
    const tmp = scratch.current;
    const camera = state.camera;
    const u = mesh.current.material.uniforms;
    const dt = Math.min(delta, 1 / 20);
    const t = state.clock.elapsedTime;
    u.uTime.value = t;
    u.uIntro.value = f.introT;

    // Map grows with the journey; centred on what the camera looks at.
    const c = clamp01(f.chapter / CHAPTERS);
    u.uRevealRadius.value = 9 + c * c * 75;
    camera.getWorldDirection(tmp.focus);
    const k = (0.4 - camera.position.y) / Math.min(tmp.focus.y, -0.05);
    u.uFocus.value.set(camera.position.x + tmp.focus.x * k, camera.position.z + tmp.focus.z * k);

    // Explorer's light: follows a mouse; on touch it wanders by itself.
    const inHero = f.chapter < 1.6;
    let want = 0;
    if (tmp.fine && inHero) {
      tmp.ray.setFromCamera(state.pointer, camera);
      if (tmp.ray.ray.intersectPlane(tmp.plane, tmp.hit)) {
        tmp.ptr.x = THREE.MathUtils.damp(tmp.ptr.x === 999 ? tmp.hit.x : tmp.ptr.x, tmp.hit.x, 6, dt);
        tmp.ptr.y = THREE.MathUtils.damp(tmp.ptr.y === 999 ? tmp.hit.z : tmp.ptr.y, tmp.hit.z, 6, dt);
        want = 1;
      }
    } else if (!tmp.fine && inHero) {
      tmp.ptr.set(u.uFocus.value.x + Math.sin(t * 0.31) * 7, u.uFocus.value.y + Math.cos(t * 0.23) * 4);
      want = 0.75;
    }
    tmp.strength = THREE.MathUtils.damp(tmp.strength, want * f.introT, 3, dt);
    u.uPointer.value.copy(tmp.ptr);
    u.uPointerStrength.value = tmp.strength;

    NODES.forEach((n, i) => {
      if (i < NODE_SLOTS) u.uNodes.value[i].set(n.x, n.z, f.nodeStrength[i]);
    });
  });

  return <mesh ref={mesh} geometry={geometry} material={material} frustumCulled={false} />;
}

/* ------------------------------------------------------------------ */
/* Discovery paths                                                    */
/* ------------------------------------------------------------------ */

function buildPathCurve(fromId: string, toId: string, seed: number) {
  const a = nodeById(fromId);
  const b = nodeById(toId);
  const rand = mulberry32(seed * 977);
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const len = Math.hypot(dx, dz);
  const nx = -dz / len;
  const nz = dx / len;
  const controls: THREE.Vector3[] = [];
  const steps = 5;
  for (let i = 0; i <= steps; i++) {
    const s = i / steps;
    const sway = i === 0 || i === steps ? 0 : (rand() - 0.5) * len * 0.28;
    controls.push(new THREE.Vector3(a.x + dx * s + nx * sway, 0, a.z + dz * s + nz * sway));
  }
  const flat = new THREE.CatmullRomCurve3(controls, false, "centripetal");
  const pts = flat.getSpacedPoints(140).map((p) => new THREE.Vector3(p.x, terrainHeight(p.x, p.z) + 0.07, p.z));
  return new THREE.CatmullRomCurve3(pts);
}

function Paths() {
  const meshes = useRef<(THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial> | null)[]>([]);
  const items = useMemo(
    () =>
      PATHS.map((p) => {
        const curve = buildPathCurve(p.from, p.to, p.seed);
        const geometry = new THREE.TubeGeometry(curve, 220, 0.028, 5, false);
        const material = new THREE.ShaderMaterial({
          vertexShader: pathVertex,
          fragmentShader: pathFragment,
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          uniforms: {
            uDraw: { value: 0 },
            uTime: { value: 0 },
            uColor: { value: new THREE.Vector3(...CYAN) },
            uFog: { value: new THREE.Vector2(...FOG) },
          },
        });
        return { geometry, material };
      }),
    [],
  );

  useEffect(
    () => () =>
      items.forEach(({ geometry, material }) => {
        geometry.dispose();
        material.dispose();
      }),
    [items],
  );

  useFrame((state) => {
    meshes.current.forEach((m, i) => {
      if (!m) return;
      m.material.uniforms.uDraw.value = frame.draws[i];
      m.material.uniforms.uTime.value = state.clock.elapsedTime;
    });
  });

  return (
    <>
      {items.map(({ geometry, material }, i) => (
        <mesh
          key={i}
          ref={(m) => {
            meshes.current[i] = m as THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial> | null;
          }}
          geometry={geometry}
          material={material}
          renderOrder={2}
        />
      ))}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Atmospheric particles (high tier only)                             */
/* ------------------------------------------------------------------ */

function Particles() {
  const points = useRef<THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>>(null);
  const { geometry, material } = useMemo(() => {
    const count = 650;
    const rand = mulberry32(42);
    const pos = new Float32Array(count * 3);
    const phase = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const x = (rand() - 0.5) * 70;
      const z = 58 - rand() * 125;
      pos[i * 3] = x;
      pos[i * 3 + 1] = terrainHeight(x, z) + 0.6 + rand() * 7;
      pos[i * 3 + 2] = z;
      phase[i] = rand();
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geometry.setAttribute("aPhase", new THREE.BufferAttribute(phase, 1));
    const material = new THREE.ShaderMaterial({
      vertexShader: particleVertex,
      fragmentShader: particleFragment,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: 1 },
        uColor: { value: new THREE.Vector3(...hexToVec3("#b9d4dc")) },
      },
    });
    return { geometry, material };
  }, []);

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  useFrame((state) => {
    if (!points.current) return;
    const u = points.current.material.uniforms;
    u.uTime.value = state.clock.elapsedTime;
    u.uPixelRatio.value = state.gl.getPixelRatio();
  });

  return <points ref={points} geometry={geometry} material={material} frustumCulled={false} />;
}
