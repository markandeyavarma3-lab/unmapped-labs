"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { buildMorphShapes } from "./morph-shapes";
import { morphState, viewVisible } from "./views";
import { mulberry32 } from "./terrain-math";
import type { Tier } from "./Scene";

const vertex = /* glsl */ `
  attribute vec3 aP1;
  attribute vec3 aP2;
  attribute vec3 aP3;
  attribute vec3 aP4;
  attribute vec3 aP5;
  attribute float aRand;
  uniform float uProgress;
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uSize;
  varying float vAccent;
  varying float vAlpha;
  varying float vBuild;

  vec3 shapeAt(float i) {
    if (i < 0.5) return position;
    if (i < 1.5) return aP1;
    if (i < 2.5) return aP2;
    if (i < 3.5) return aP3;
    if (i < 4.5) return aP4;
    return aP5;
  }

  void main() {
    float p = clamp(uProgress, 0.0, 5.0);
    float i0 = min(floor(p), 4.0);
    float f = p - i0;
    // Each particle leaves a little later than its neighbour → the shape "pours".
    float t = smoothstep(aRand * 0.4, aRand * 0.4 + 0.6, f);
    vec3 pos = mix(shapeAt(i0), shapeAt(i0 + 1.0), t);

    // Swirl through space while in transit.
    float transit = sin(t * 3.14159);
    pos += transit * vec3(
      sin(aRand * 41.0 + uTime * 0.6),
      cos(aRand * 23.0 + uTime * 0.4) * 0.6,
      sin(aRand * 67.0 + uTime * 0.5)) * 0.85;

    // Idle life: restless when unknown, nearly still once built.
    float chaos = mix(0.32, 0.025, smoothstep(0.0, 2.0, p));
    pos += chaos * vec3(
      sin(uTime * 0.55 + aRand * 31.0),
      cos(uTime * 0.47 + aRand * 17.0),
      sin(uTime * 0.63 + aRand * 11.0));

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mv;

    vAccent = step(0.84, fract(aRand * 7.31));
    vBuild = smoothstep(4.2, 5.0, p);
    float size = uSize * (1.0 + vAccent * 0.7) * (0.75 + aRand * 0.5);
    gl_PointSize = size * uPixelRatio * (10.0 / -mv.z);
    vAlpha = (0.45 + 0.55 * aRand) * (0.55 + 0.45 * smoothstep(0.0, 1.0, p));
  }
`;

const fragment = /* glsl */ `
  uniform vec3 uBase;
  uniform vec3 uCyan;
  uniform vec3 uLime;
  uniform float uOpacity;
  varying float vAccent;
  varying float vAlpha;
  varying float vBuild;

  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = (1.0 - smoothstep(0.18, 0.5, d)) * vAlpha * uOpacity;
    if (a < 0.01) discard;
    vec3 accent = mix(uCyan, uLime, vBuild);
    vec3 base = mix(uBase, mix(uBase, uLime, 0.25), vBuild);
    vec3 col = mix(base * 0.8, accent * 1.35, vAccent);
    gl_FragColor = vec4(col * a, a);
  }
`;

/** Per-stage camera-facing tilt: rings and maps read best from above. */
const TILT = [0.15, 0.95, 0.72, 0.32, 0.18, 0.42];

export function ParticleMorph({ tier }: { tier: Tier }) {
  const points = useRef<THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>>(null);
  const group = useRef<THREE.Group>(null);
  const smooth = useRef({ p: 0, tiltX: TILT[0], spin: 0, px: 0, py: 0 });

  const { geometry, material } = useMemo(() => {
    const n = tier === "high" ? 14000 : 5600;
    const shapes = buildMorphShapes(n);
    const rand = mulberry32(7);
    const rnd = new Float32Array(n);
    for (let i = 0; i < n; i++) rnd[i] = rand();
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(shapes[0], 3));
    for (let s = 1; s < 6; s++) geometry.setAttribute(`aP${s}`, new THREE.BufferAttribute(shapes[s], 3));
    geometry.setAttribute("aRand", new THREE.BufferAttribute(rnd, 1));
    geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 8);
    const material = new THREE.ShaderMaterial({
      vertexShader: vertex,
      fragmentShader: fragment,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uProgress: { value: 0 },
        uTime: { value: 0 },
        uPixelRatio: { value: 1 },
        uSize: { value: tier === "high" ? 2.2 : 2.8 },
        uOpacity: { value: 1 },
        uBase: { value: new THREE.Color("#dfe7ec") },
        uCyan: { value: new THREE.Color("#65e4e8") },
        uLime: { value: new THREE.Color("#c7f36b") },
      },
    });
    return { geometry, material };
  }, [tier]);

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  useFrame((state, delta) => {
    if (!points.current || !group.current || !viewVisible.morph) return;
    const dt = Math.min(delta, 1 / 20);
    const s = smooth.current;
    s.p = THREE.MathUtils.damp(s.p, morphState.progress, 3.2, dt);
    const u = points.current.material.uniforms;
    u.uProgress.value = s.p;
    u.uTime.value = state.clock.elapsedTime;
    u.uPixelRatio.value = state.gl.getPixelRatio();

    // Tilt interpolates between the two neighbouring stages.
    const i0 = Math.min(Math.floor(s.p), 4);
    const f = THREE.MathUtils.smoothstep(s.p - i0, 0, 1);
    const tilt = TILT[i0] + (TILT[i0 + 1] - TILT[i0]) * f;
    s.tiltX = THREE.MathUtils.damp(s.tiltX, tilt, 3, dt);
    s.spin += dt * (0.12 - 0.07 * THREE.MathUtils.smoothstep(s.p, 3.5, 5));
    s.px = THREE.MathUtils.damp(s.px, state.pointer.x, 2.5, dt);
    s.py = THREE.MathUtils.damp(s.py, state.pointer.y, 2.5, dt);

    group.current.rotation.set(s.tiltX - s.py * 0.12, s.spin + s.px * 0.35, 0);
    // Frame it: right of the copy on wide screens, above it on tall ones.
    const aspect = state.size.width / state.size.height;
    group.current.position.set(aspect > 1.15 ? 2.6 : 0, aspect < 0.9 ? 1.4 : 0.25, 0);
    group.current.scale.setScalar(aspect < 0.9 ? 0.78 : 1);
  });

  return (
    <group ref={group}>
      <points ref={points} geometry={geometry} material={material} frustumCulled={false} />
    </group>
  );
}
