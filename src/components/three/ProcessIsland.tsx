"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { simplex2 } from "./terrain-math";
import { islandState, viewRects } from "./views";
import { glowFragment, glowVertex } from "./shaders";
import type { Tier } from "./Scene";

/* ------------------------------------------------------------------ */
/* Island geometry                                                    */
/* ------------------------------------------------------------------ */

const R = 3.3;
const edgeRadius = (a: number) => R * (1 + 0.07 * Math.sin(a * 3 + 1) + 0.05 * Math.sin(a * 7 + 2));

export function islandHeight(x: number, z: number) {
  const r = Math.hypot(x, z) / R;
  const relief = simplex2(x * 0.42 + 3, z * 0.42 - 1) * 0.32 + simplex2(x * 0.95, z * 0.95 + 5) * 0.12;
  const dome = (1 - r * r) * 0.35;
  return Math.max(-0.2, (relief + dome) * (1 - Math.pow(Math.min(r, 1), 6)));
}

export const STATIONS: [number, number][] = [
  [-2.05, 1.25],
  [-1.05, -1.15],
  [0.3, 0.55],
  [1.4, -1.25],
  [2.2, 0.95],
];
const stationPos = (i: number, lift = 0) =>
  new THREE.Vector3(STATIONS[i][0], islandHeight(STATIONS[i][0], STATIONS[i][1]) + lift, STATIONS[i][1]);

const CYAN = new THREE.Color("#65e4e8");
const LIME = new THREE.Color("#c7f36b");

/* ------------------------------------------------------------------ */
/* Shaders                                                            */
/* ------------------------------------------------------------------ */

const topVertex = /* glsl */ `
  varying vec3 vWorld; varying vec3 vNormal; varying float vH;
  void main() {
    vec4 w = modelMatrix * vec4(position, 1.0);
    vWorld = w.xyz; vH = position.y;
    vNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;
const topFragment = /* glsl */ `
  uniform vec3 uFocus; uniform float uTime; uniform float uGain;
  varying vec3 vWorld; varying vec3 vNormal; varying float vH;
  float iso(float v, float w) { float d = abs(fract(v - 0.5) - 0.5) / max(fwidth(v), 1e-4); return 1.0 - clamp(d / w, 0.0, 1.0); }
  void main() {
    vec3 N = normalize(vNormal);
    vec3 V = normalize(cameraPosition - vWorld);
    float key = max(dot(N, normalize(vec3(0.3, 0.9, 0.35))), 0.0);
    float rim = pow(1.0 - max(dot(N, V), 0.0), 2.5);
    vec3 col = vec3(0.06, 0.075, 0.09) * (0.55 + 0.7 * key) + vec3(0.12, 0.2, 0.22) * rim * 0.5;
    float near = 1.0 - smoothstep(0.3, 1.6, length(vWorld.xz - uFocus.xz));
    float minor = iso(vH * 14.0, 1.0);
    float major = iso(vH * 2.8, 1.3);
    col += vec3(0.62, 0.7, 0.77) * (minor * 0.13 + major * 0.3) * (0.5 + 0.5 * near) * uGain;
    col += vec3(0.4, 0.89, 0.91) * minor * near * 0.22;
    vec2 g = abs(fract(vWorld.xz * 2.0 - 0.5) - 0.5) / fwidth(vWorld.xz * 2.0);
    col += vec3(0.62, 0.7, 0.77) * (1.0 - min(min(g.x, g.y), 1.0)) * 0.05;
    gl_FragColor = vec4(col, 1.0);
  }
`;
const rockFragment = /* glsl */ `
  varying vec3 vWorld; varying vec3 vNormal; varying float vH;
  void main() {
    vec3 N = normalize(vNormal);
    vec3 V = normalize(cameraPosition - vWorld);
    float rim = pow(1.0 - max(dot(N, V), 0.0), 2.0);
    float strata = 1.0 - clamp(abs(fract(vWorld.y * 7.0) - 0.5) / max(fwidth(vWorld.y * 7.0), 1e-4) / 1.2, 0.0, 1.0);
    float fade = smoothstep(-2.6, -0.2, vWorld.y);
    vec3 col = vec3(0.03, 0.038, 0.047) + vec3(0.08, 0.12, 0.14) * rim * 0.35 + vec3(0.45, 0.52, 0.58) * strata * 0.09 * fade;
    gl_FragColor = vec4(col * (0.35 + 0.65 * fade), 1.0);
  }
`;
const routeFragment = /* glsl */ `
  uniform float uDraw; uniform float uTime; uniform vec3 uColor;
  varying vec2 vUv; varying float vDist;
  void main() {
    if (vUv.x > uDraw) discard;
    float head = smoothstep(uDraw - 0.05, uDraw, vUv.x);
    float travel = pow(1.0 - fract(vUv.x * 3.0 - uTime * 0.25), 10.0);
    float a = (0.35 + head * 0.6 + travel * 0.4) * 0.8;
    gl_FragColor = vec4(uColor * a, a);
  }
`;
const routeVertex = /* glsl */ `
  varying vec2 vUv; varying float vDist;
  void main() { vUv = uv; vec4 mv = modelViewMatrix * vec4(position, 1.0); vDist = -mv.z; gl_Position = projectionMatrix * mv; }
`;
const flatVertex = /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const radarFragment = /* glsl */ `
  uniform float uTime; uniform float uAmount; uniform vec3 uColor; varying vec2 vUv;
  void main() {
    vec2 p = vUv * 2.0 - 1.0; float r = length(p); if (r > 1.0) discard;
    float ang = atan(p.y, p.x);
    float sweep = mod(uTime * 1.9, 6.28318);
    float da = mod(sweep - ang + 6.28318, 6.28318);
    float wedge = exp(-da * 2.2) * (1.0 - r * 0.5);
    float rings = 1.0 - smoothstep(0.0, 0.035, abs(fract(r * 3.5) - 0.5) - 0.465);
    float pulse = (1.0 - smoothstep(0.0, 0.05, abs(r - fract(uTime * 0.55)))) * (1.0 - r);
    float a = (wedge * 0.9 + rings * 0.22 + pulse * 0.7) * uAmount;
    gl_FragColor = vec4(uColor * a, a);
  }
`;
const scanFragment = /* glsl */ `
  uniform float uAmount; uniform vec3 uColor; varying vec2 vUv;
  void main() {
    vec2 p = vUv * 2.0 - 1.0; float r = max(abs(p.x), abs(p.y));
    float front = uAmount * 1.15;
    float reveal = 1.0 - smoothstep(front - 0.12, front, r);
    vec2 g = abs(fract(vUv * 7.0 - 0.5) - 0.5) / fwidth(vUv * 7.0);
    float grid = 1.0 - min(min(g.x, g.y), 1.0);
    float edge = (1.0 - smoothstep(0.0, 0.03, abs(r - front))) * step(r, 1.0);
    float frame = 1.0 - smoothstep(0.0, 0.02, abs(r - 0.98));
    float a = (grid * 0.75 * reveal + edge * 1.2 + frame * 0.5 * uAmount) * step(r, 1.0) * min(1.0, uAmount * 3.0);
    gl_FragColor = vec4(uColor * a, a);
  }
`;
const beamFragment = /* glsl */ `
  uniform float uAmount; uniform float uTime; uniform vec3 uColor; varying vec2 vUv;
  void main() {
    float a = pow(1.0 - vUv.y, 1.4) * (0.6 + 0.35 * sin(vUv.y * 30.0 - uTime * 4.0)) * uAmount * 0.85;
    gl_FragColor = vec4(uColor * a, a);
  }
`;

const additive = (fragmentShader: string, uniforms: Record<string, THREE.IUniform>, vertexShader = flatVertex) =>
  new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });

/* ------------------------------------------------------------------ */
/* The island                                                         */
/* ------------------------------------------------------------------ */

export function ProcessIsland({ tier }: { tier: Tier }) {
  const root = useRef<THREE.Group>(null);
  const live = useRef({ p: 0, amounts: [0, 0, 0, 0, 0], camPos: new THREE.Vector3(), camTarget: new THREE.Vector3(), init: false });
  const tmp = useRef({ a: new THREE.Vector3(), b: new THREE.Vector3(), v: new THREE.Vector3() });

  const built = useMemo(() => {
    const seg = tier === "high" ? 150 : 90;
    // Top surface — terrain clamped to a wobbly island outline.
    const ring = new THREE.PlaneGeometry(2 * R, 2 * R, seg, seg);
    ring.rotateX(-Math.PI / 2);
    const pos = ring.attributes.position as THREE.BufferAttribute;
    // keep only vertices inside the (wobbly) island outline by clamping outward ones onto it
    for (let i = 0; i < pos.count; i++) {
      let x = pos.getX(i);
      let z = pos.getZ(i);
      const a = Math.atan2(z, x);
      const er = edgeRadius(a);
      const r = Math.hypot(x, z);
      if (r > er) {
        x = (x / r) * er;
        z = (z / r) * er;
      }
      pos.setXYZ(i, x, islandHeight(x, z), z);
    }
    ring.computeVertexNormals();

    // Underside — an inverted, ragged cone.
    const rock = new THREE.CylinderGeometry(1, 0.05, 2.8, 96, 14, true);
    const rp = rock.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < rp.count; i++) {
      const x = rp.getX(i), y = rp.getY(i), z = rp.getZ(i);
      const a = Math.atan2(z, x);
      const top = y > 1.39; // the rim must meet the island's edge exactly
      const r = Math.hypot(x, z) * edgeRadius(a) * (top ? 1 : 0.9 + 0.14 * simplex2(a * 2.5, y * 1.6));
      rp.setXYZ(i, Math.cos(a) * r, top ? islandHeight(Math.cos(a) * r, Math.sin(a) * r) : y - 1.4, Math.sin(a) * r);
    }
    rock.computeVertexNormals();

    const topMat = new THREE.ShaderMaterial({
      vertexShader: topVertex,
      fragmentShader: topFragment,
      // Without bloom (light tier) lines need more presence to read at phone size.
      uniforms: { uFocus: { value: new THREE.Vector3() }, uTime: { value: 0 }, uGain: { value: tier === "high" ? 1 : 2.6 } },
    });
    const rockMat = new THREE.ShaderMaterial({ vertexShader: topVertex, fragmentShader: rockFragment });

    // Route over the surface through every station.
    const ctrl = STATIONS.map(([x, z]) => new THREE.Vector3(x, 0, z));
    const flat = new THREE.CatmullRomCurve3(ctrl, false, "centripetal");
    const pts = flat.getSpacedPoints(200).map((p) => new THREE.Vector3(p.x, islandHeight(p.x, p.z) + 0.03, p.z));
    const route = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 260, 0.009, 5, false);
    const routeMat = additive(routeFragment, { uDraw: { value: 0 }, uTime: { value: 0 }, uColor: { value: CYAN.clone() } }, routeVertex);

    // Station effects
    const radar = additive(radarFragment, { uTime: { value: 0 }, uAmount: { value: 0 }, uColor: { value: CYAN.clone() } });
    const scan = additive(scanFragment, { uAmount: { value: 0 }, uColor: { value: CYAN.clone() } });
    const beam = additive(beamFragment, { uAmount: { value: 0 }, uTime: { value: 0 }, uColor: { value: LIME.clone() } });
    const ringMats = [0, 1, 2].map(() =>
      additive(
        radarFragment.replace(
          "float a = (wedge * 0.9 + rings * 0.22 + pulse * 0.7) * uAmount;",
          "float a = (1.0 - smoothstep(0.0, 0.06, abs(r - 0.9))) * uAmount;",
        ),
        { uTime: { value: 0 }, uAmount: { value: 0 }, uColor: { value: LIME.clone() } },
      ),
    );
    const halos = STATIONS.map(() =>
      additive(glowFragment, { uColor: { value: CYAN.clone() }, uOpacity: { value: 0.6 }, uRing: { value: 0 } }, glowVertex),
    );
    const edgeMat = new THREE.LineBasicMaterial({ color: CYAN.clone(), transparent: true, opacity: 0.9 });
    const fillMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.05, 0.07, 0.085), transparent: true, opacity: 0.85 });
    const plate = new THREE.BoxGeometry(0.9, 0.035, 0.9);
    const plateEdges = new THREE.EdgesGeometry(plate);
    const cube = new THREE.BoxGeometry(0.22, 0.22, 0.22);
    const cubeEdges = new THREE.EdgesGeometry(cube);

    const outlinePts = Array.from({ length: 241 }, (_, i) => {
      const a = (i / 240) * Math.PI * 2;
      const r = edgeRadius(a);
      return new THREE.Vector3(Math.cos(a) * r, islandHeight(Math.cos(a) * r, Math.sin(a) * r) + 0.01, Math.sin(a) * r);
    });
    const outline = new THREE.BufferGeometry().setFromPoints(outlinePts);
    const outlineMat = new THREE.LineBasicMaterial({ color: new THREE.Color(0.4, 0.89, 0.91), transparent: true, opacity: tier === "high" ? 0.55 : 0.9 });

    return { ring, rock, topMat, rockMat, route, routeMat, outline, outlineMat, radar, scan, beam, ringMats, halos, edgeMat, fillMat, plate, plateEdges, cube, cubeEdges };
  }, [tier]);

  // Render-loop access goes through a ref; JSX reads `built` directly.
  const builtRef = useRef(built);
  useEffect(() => {
    builtRef.current = built;
  }, [built]);

  useEffect(
    () => () => {
      Object.values(built).forEach((v) => {
        if (Array.isArray(v)) v.forEach((m) => m.dispose());
        else (v as { dispose?: () => void }).dispose?.();
      });
    },
    [built],
  );

  const markers = useRef<(THREE.Mesh | null)[]>([]);
  const plates = useRef<(THREE.Group | null)[]>([]);
  const cubes = useRef<(THREE.Group | null)[]>([]);
  const rings = useRef<(THREE.Mesh | null)[]>([]);

  useFrame((state, delta) => {
    const built = builtRef.current;
    const dt = Math.min(delta, 1 / 20);
    const t = state.clock.elapsedTime;
    const L = live.current;
    const T = tmp.current;
    L.p = THREE.MathUtils.damp(L.p, islandState.progress, 2.6, dt);

    // Per-station activity: 1 at its stage, fading over one stage either side.
    L.amounts = L.amounts.map((a, i) => THREE.MathUtils.damp(a, Math.max(0, 1 - Math.abs(L.p - i) * 1.25), 5, dt));
    const [aObs, aMap, aUnd, aBuild, aVal] = L.amounts;

    // Camera: fly between station viewpoints, pulling back while in transit.
    const i0 = Math.min(Math.floor(L.p), 3);
    const f = THREE.MathUtils.smootherstep(L.p - i0, 0, 1);
    const transit = Math.sin(f * Math.PI);
    T.a.copy(stationPos(i0, 0.25)).lerp(stationPos(i0 + 1, 0.25), f).multiplyScalar(0.55);
    const aspect = (state.camera as THREE.PerspectiveCamera).aspect || 1;
    const az = -0.55 + L.p * 0.38 + state.pointer.x * 0.12;
    const el = 0.62 + transit * 0.1 + state.pointer.y * 0.05;
    const dist = (aspect < 1.1 ? 5.2 : 6.1) + transit * 1.1;
    T.b.set(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)).multiplyScalar(dist).add(T.a);
    if (!L.init) {
      L.camPos.copy(T.b);
      L.camTarget.copy(T.a);
      L.init = true;
    }
    L.camPos.x = THREE.MathUtils.damp(L.camPos.x, T.b.x, 3, dt);
    L.camPos.y = THREE.MathUtils.damp(L.camPos.y, T.b.y, 3, dt);
    L.camPos.z = THREE.MathUtils.damp(L.camPos.z, T.b.z, 3, dt);
    L.camTarget.lerp(T.a, 1 - Math.exp(-3 * dt));
    state.camera.position.copy(L.camPos);
    state.camera.lookAt(L.camTarget);

    if (root.current) root.current.position.y = Math.sin(t * 0.6) * 0.05;

    // Surface + route
    built.topMat.uniforms.uFocus.value.copy(L.camTarget);
    built.routeMat.uniforms.uDraw.value = Math.min(1, (L.p + 0.15) / 4);
    built.routeMat.uniforms.uTime.value = t;

    // 01 Observe — radar
    built.radar.uniforms.uTime.value = t;
    built.radar.uniforms.uAmount.value = 0.35 + aObs * 1.15;
    // 02 Map — scan grid unfolds
    built.scan.uniforms.uAmount.value = aMap;
    // 03 Understand — strata separate
    plates.current.forEach((g, k) => {
      if (!g) return;
      g.position.y = 0.35 + k * (0.07 + aUnd * 0.32);
      g.rotation.y = t * 0.15 * (k % 2 ? -1 : 1) + k * 0.3;
    });
    // 04 Build — blocks drop into a tower
    cubes.current.forEach((g, k) => {
      if (!g) return;
      const land = THREE.MathUtils.clamp(aBuild * 7 - k, 0, 1);
      const e = 1 - Math.pow(1 - land, 3);
      g.position.y = 0.11 + Math.floor(k / 2) * 0.24 + (1 - e) * 1.6;
      g.visible = land > 0.01;
    });
    // 05 Validate — beacon + rising rings
    built.beam.uniforms.uAmount.value = aVal;
    built.beam.uniforms.uTime.value = t;
    rings.current.forEach((m, k) => {
      if (!m) return;
      const c = (t * 0.5 + k / 3) % 1;
      m.position.y = 0.1 + c * 1.8;
      m.scale.setScalar(0.3 + c * 0.5);
      (m.material as THREE.ShaderMaterial).uniforms.uAmount.value = aVal * (1 - c);
    });

    // Markers, halos, colour shift to lime when active
    STATIONS.forEach((_, i) => {
      const a = L.amounts[i];
      const halo = built.halos[i];
      halo.uniforms.uRing.value = (t * 0.4 + i * 0.2) % 1;
      halo.uniforms.uOpacity.value = 0.35 + a * 0.9;
      (halo.uniforms.uColor.value as THREE.Color).copy(CYAN).lerp(LIME, a);
      const m = markers.current[i];
      if (m) {
        m.rotation.y = t * 0.8 + i;
        m.position.y = 0.42 + Math.sin(t * 1.5 + i) * 0.03 + a * 0.08;
        m.scale.setScalar(1 + a * 0.6);
        ((m.material as THREE.MeshBasicMaterial).color as THREE.Color).copy(CYAN).lerp(LIME, a);
      }
    });

    // Pin the DOM station labels to their markers.
    const rect = viewRects.island;
    if (rect) {
      STATIONS.forEach((_, i) => {
        const el = islandState.labels[i];
        if (!el) return;
        T.v.copy(stationPos(i, 0.72));
        if (root.current) T.v.y += root.current.position.y;
        T.v.project(state.camera);
        const visible = T.v.z < 1 && Math.abs(T.v.x) < 1.1 && Math.abs(T.v.y) < 1.1;
        el.style.transform = `translate3d(${((T.v.x * 0.5 + 0.5) * rect.w).toFixed(1)}px, ${((-T.v.y * 0.5 + 0.5) * rect.h).toFixed(1)}px, 0)`;
        el.style.opacity = visible ? String(0.55 + L.amounts[i] * 0.45) : "0";
        el.dataset.active = L.amounts[i] > 0.6 ? "true" : "false";
      });
    }
  });

  return (
    <group ref={root}>
      <mesh geometry={built.ring} material={built.topMat} />
      <mesh geometry={built.rock} material={built.rockMat} />
      <mesh geometry={built.route} material={built.routeMat} renderOrder={2} />
      <lineLoop geometry={built.outline} material={built.outlineMat} />

      {STATIONS.map(([x, z], i) => {
        const y = islandHeight(x, z);
        return (
          <group key={i} position={[x, y, z]}>
            <mesh position={[0, 0.2, 0]}>
              <cylinderGeometry args={[0.004, 0.004, 0.4, 4]} />
              <meshBasicMaterial color="#9fb3c4" transparent opacity={0.45} />
            </mesh>
            <mesh
              ref={(m) => {
                markers.current[i] = m;
              }}
              position={[0, 0.42, 0]}
            >
              <octahedronGeometry args={[0.07, 0]} />
              <meshBasicMaterial color="#65e4e8" />
            </mesh>
            <mesh position={[0, 0.42, 0]} material={built.halos[i]} renderOrder={3}>
              <planeGeometry args={[0.8, 0.8]} />
            </mesh>
          </group>
        );
      })}

      {/* 01 Observe — radar disc */}
      <mesh position={stationPos(0, 0.02)} rotation-x={-Math.PI / 2} material={built.radar} renderOrder={2}>
        <planeGeometry args={[1.9, 1.9]} />
      </mesh>

      {/* 02 Map — scan grid */}
      <mesh position={stationPos(1, 0.04)} rotation-x={-Math.PI / 2} rotation-z={0.3} material={built.scan} renderOrder={2}>
        <planeGeometry args={[1.5, 1.5]} />
      </mesh>

      {/* 03 Understand — strata */}
      <group position={stationPos(2)}>
        {[0, 1, 2].map((k) => (
          <group
            key={k}
            ref={(g) => {
              plates.current[k] = g;
            }}
          >
            <mesh geometry={built.plate} material={built.fillMat} />
            <lineSegments geometry={built.plateEdges} material={built.edgeMat} />
          </group>
        ))}
      </group>

      {/* 04 Build — blocks */}
      <group position={stationPos(3)}>
        {[0, 1, 2, 3, 4, 5].map((k) => (
          <group
            key={k}
            position={[(k % 2) * 0.24 - 0.12, 0, 0]}
            ref={(g) => {
              cubes.current[k] = g;
            }}
          >
            <mesh geometry={built.cube} material={built.fillMat} />
            <lineSegments geometry={built.cubeEdges} material={built.edgeMat} />
          </group>
        ))}
      </group>

      {/* 05 Validate — beacon */}
      <group position={stationPos(4)}>
        <mesh position={[0, 1.1, 0]} material={built.beam} renderOrder={2}>
          <cylinderGeometry args={[0.12, 0.2, 2.2, 24, 1, true]} />
        </mesh>
        {[0, 1, 2].map((k) => (
          <mesh
            key={k}
            rotation-x={-Math.PI / 2}
            ref={(m) => {
              rings.current[k] = m;
            }}
            material={built.ringMats[k]}
          >
            <planeGeometry args={[1, 1]} />
          </mesh>
        ))}
      </group>
    </group>
  );
}
