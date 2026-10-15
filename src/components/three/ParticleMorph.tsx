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
  varying float vShade;

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
    float chaos = mix(0.32, 0.02, smoothstep(0.0, 0.9, p));
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
    vAlpha = (0.55 + 0.45 * aRand) * (0.6 + 0.4 * smoothstep(0.0, 1.0, p));
    vShade = fract(aRand * 13.7);
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
  varying float vShade;
  uniform vec3 uDeep;

  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = (1.0 - smoothstep(0.18, 0.5, d)) * vAlpha * uOpacity;
    if (a < 0.01) discard;
    // golden particles with teal accents; the finished city warms toward lime
    vec3 accent = mix(uCyan, uLime, vBuild);
    vec3 base = mix(uBase, uDeep, vShade);
    vec3 col = mix(base, accent, vAccent);
    gl_FragColor = vec4(col, a);
    #include <colorspace_fragment>
  }
`;

/** A screen-space haze behind the particles, so they read over the live city. */
const backdropVertex = /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy * 2.0, 0.999, 1.0); }`;
const backdropFragment = /* glsl */ `
  uniform vec2 uCenter; uniform float uAspect; varying vec2 vUv;
  void main() {
    vec2 d = (vUv - uCenter) * vec2(uAspect, 1.0);
    float a = mix(0.9, 0.62, smoothstep(0.1, 0.9, length(d)));
    gl_FragColor = vec4(vec3(0.985, 0.965, 0.93), a);
    #include <colorspace_fragment>
  }
`;

/** Per-stage camera-facing tilt: rings and maps read best from above. */
const TILT = [0.15, 0.62, 0.7, 0.42, 0.3, 0.4];

export function ParticleMorph({ tier }: { tier: Tier }) {
  const points = useRef<THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>>(null);
  const group = useRef<THREE.Group>(null);
  const backdropRef = useRef<THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>>(null);
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
      uniforms: {
        uProgress: { value: 0 },
        uTime: { value: 0 },
        uPixelRatio: { value: 1 },
        uSize: { value: tier === "high" ? 2.6 : 3.2 },
        uOpacity: { value: 1 },
        uBase: { value: new THREE.Color("#d79a2b") },
        uDeep: { value: new THREE.Color("#9a5f12") },
        uCyan: { value: new THREE.Color("#0b8a90") },
        uLime: { value: new THREE.Color("#5f9614") },
      },
    });
    return { geometry, material };
  }, [tier]);

  const backdrop = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: backdropVertex,
        fragmentShader: backdropFragment,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        uniforms: { uCenter: { value: new THREE.Vector2(0.68, 0.5) }, uAspect: { value: 1.6 } },
      }),
    [],
  );

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
      backdrop.dispose();
    },
    [geometry, material, backdrop],
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
    const bu = backdropRef.current?.material.uniforms;
    if (bu) {
      bu.uAspect.value = aspect;
      bu.uCenter.value.set(aspect > 1.15 ? 0.68 : 0.5, aspect < 0.9 ? 0.62 : 0.5);
    }
  });

  return (
    <>
    <mesh ref={backdropRef} material={backdrop} renderOrder={-1} frustumCulled={false}>
      <planeGeometry args={[1, 1]} />
    </mesh>
    <group ref={group}>
      <points ref={points} geometry={geometry} material={material} frustumCulled={false} />
    </group>
    </>
  );
}
