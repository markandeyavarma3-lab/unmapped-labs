"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { CHAPTER, DISSOLVE, NETWORK_CENTER, WORK_SITES } from "./landmarks";
import { mulberry32, terrainHeight } from "./terrain-math";
import { frame } from "./frame-state";
import { serviceLabels } from "./world-store";
import type { Tier } from "./Scene";

/**
 * The land, understood: a systems network. Three layers of nodes (rings),
 * four service hubs at the core, connections carrying pulses. It is built
 * from particles that lift off the dissolving terrain.
 */

const C = new THREE.Vector3(...NETWORK_CENTER);
const smooth = THREE.MathUtils.smoothstep;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

type Graph = { nodes: THREE.Vector3[]; hubs: number[]; edges: [number, number][] };

function buildGraph(): Graph {
  const rand = mulberry32(1612);
  const nodes: THREE.Vector3[] = [];
  const layers = [
    { y: -4.2, r: 9, n: 16 },
    { y: 0, r: 11.5, n: 22 },
    { y: 4.2, r: 7.5, n: 12 },
  ];
  const ringStart: number[] = [];
  layers.forEach((L) => {
    ringStart.push(nodes.length);
    for (let i = 0; i < L.n; i++) {
      const a = (i / L.n) * Math.PI * 2 + rand() * 0.2;
      const r = L.r * (0.88 + rand() * 0.24);
      nodes.push(new THREE.Vector3(Math.cos(a) * r, L.y + (rand() - 0.5) * 1.2, Math.sin(a) * r));
    }
  });
  const hubs: number[] = [];
  for (let k = 0; k < 4; k++) {
    const a = Math.PI / 4 + (k * Math.PI) / 2;
    hubs.push(nodes.length);
    nodes.push(new THREE.Vector3(Math.cos(a) * 6.2, 1.4 * (k % 2 ? 1 : -1), Math.sin(a) * 6.2));
  }
  const edges: [number, number][] = [];
  const seen = new Set<string>();
  const add = (a: number, b: number) => {
    const k = a < b ? `${a}-${b}` : `${b}-${a}`;
    if (a !== b && !seen.has(k)) {
      seen.add(k);
      edges.push([a, b]);
    }
  };
  // rings
  layers.forEach((L, li) => {
    for (let i = 0; i < L.n; i++) add(ringStart[li] + i, ringStart[li] + ((i + 1) % L.n));
  });
  // each ring node to its nearest node in the next layer
  for (let li = 0; li < layers.length - 1; li++) {
    for (let i = 0; i < layers[li].n; i++) {
      const a = ringStart[li] + i;
      let best = -1, bd = Infinity;
      for (let j = 0; j < layers[li + 1].n; j++) {
        const b = ringStart[li + 1] + j;
        const d = nodes[a].distanceToSquared(nodes[b]);
        if (d < bd) (bd = d), (best = b);
      }
      add(a, best);
    }
  }
  // hubs: to each other, and to their nearest ring nodes
  hubs.forEach((h, k) => {
    add(h, hubs[(k + 1) % 4]);
    nodes
      .map((p, i) => [i, p.distanceToSquared(nodes[h])] as const)
      .filter(([i]) => !hubs.includes(i))
      .sort((x, y) => x[1] - y[1])
      .slice(0, 7)
      .forEach(([i]) => add(h, i));
  });
  return { nodes, hubs, edges };
}

const edgeVertex = /* glsl */ `
  attribute float aSeed;
  uniform float uBuild;
  varying float vOn;
  varying float vDist;
  void main() {
    vOn = step(aSeed, uBuild);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vDist = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;
const edgeFragment = /* glsl */ `
  uniform vec3 uColor; uniform float uAlpha;
  varying float vOn; varying float vDist;
  void main() {
    if (vOn < 0.5) discard;
    float a = uAlpha * (1.0 - smoothstep(40.0, 80.0, vDist));
    gl_FragColor = vec4(uColor * a, a);
  }
`;
const pointVertex = /* glsl */ `
  attribute float aSize;
  attribute float aSeed;
  attribute vec3 aColor;
  uniform float uBuild; uniform float uPixelRatio; uniform float uTime;
  varying vec3 vColor; varying float vA;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    float on = smoothstep(aSeed, aSeed + 0.08, uBuild);
    gl_PointSize = aSize * uPixelRatio * (26.0 / -mv.z) * on * (0.85 + 0.15 * sin(uTime * 2.0 + aSeed * 40.0));
    vColor = aColor; vA = on;
  }
`;
const pulseVertex = /* glsl */ `
  attribute vec3 aA; attribute vec3 aB; attribute float aSpeed; attribute float aPhase;
  uniform float uTime; uniform float uPixelRatio; uniform float uBuild; uniform float uBoost;
  varying vec3 vColor; varying float vA;
  void main() {
    float f = fract(uTime * aSpeed * (1.0 + uBoost) + aPhase);
    vec3 p = mix(aA, aB, f);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = 2.6 * uPixelRatio * (22.0 / -mv.z) * smoothstep(0.7, 1.0, uBuild);
    vColor = mix(vec3(0.4, 0.89, 0.91), vec3(0.78, 0.95, 0.42), step(0.8, aPhase));
    vA = sin(f * 3.14159);
  }
`;
const roundFragment = /* glsl */ `
  varying vec3 vColor; varying float vA;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = (1.0 - smoothstep(0.15, 0.5, d)) * vA;
    if (a < 0.01) discard;
    gl_FragColor = vec4(vColor * a, a);
  }
`;
/** Particles lifting off the land and settling into the network. */
const liftVertex = /* glsl */ `
  attribute vec3 aEnd; attribute float aDelay;
  uniform float uT; uniform float uTime; uniform float uPixelRatio;
  varying vec3 vColor; varying float vA;
  void main() {
    float k = clamp((uT - aDelay) / 0.55, 0.0, 1.0);
    float e = k * k * (3.0 - 2.0 * k);
    vec3 p = mix(position, aEnd, e);
    p.y += sin(e * 3.14159) * (3.0 + aDelay * 6.0);
    p.x += sin(aDelay * 50.0 + uTime) * sin(e * 3.14159) * 1.2;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = 2.2 * uPixelRatio * (24.0 / -mv.z);
    vColor = mix(vec3(0.62, 0.7, 0.77), vec3(0.4, 0.89, 0.91), e);
    // visible while in flight; hand over to the network as it settles
    vA = smoothstep(0.0, 0.08, uT - aDelay + 0.08) * (1.0 - smoothstep(0.85, 1.0, e) * 0.85) * (1.0 - smoothstep(1.4, 1.6, uT));
  }
`;

const additive = (vertexShader: string, fragmentShader: string, uniforms: Record<string, THREE.IUniform>) =>
  new THREE.ShaderMaterial({ vertexShader, fragmentShader, uniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });

export function SystemNetwork({ tier }: { tier: Tier }) {
  const built = useMemo(() => {
    const g = buildGraph();
    const rand = mulberry32(77);
    // edges
    const ePos: number[] = [];
    const eSeed: number[] = [];
    g.edges.forEach(([a, b]) => {
      const s = rand() * 0.9;
      ePos.push(g.nodes[a].x, g.nodes[a].y, g.nodes[a].z, g.nodes[b].x, g.nodes[b].y, g.nodes[b].z);
      eSeed.push(s, s);
    });
    const edgeGeo = new THREE.BufferGeometry();
    edgeGeo.setAttribute("position", new THREE.Float32BufferAttribute(ePos, 3));
    edgeGeo.setAttribute("aSeed", new THREE.Float32BufferAttribute(eSeed, 1));
    const edgeMat = additive(edgeVertex, edgeFragment, { uBuild: { value: 0 }, uColor: { value: new THREE.Color("#65e4e8") }, uAlpha: { value: 0.35 } });

    // nodes
    const nPos: number[] = [], nSize: number[] = [], nSeed: number[] = [], nCol: number[] = [];
    g.nodes.forEach((p, i) => {
      const hub = g.hubs.includes(i);
      nPos.push(p.x, p.y, p.z);
      nSize.push(hub ? 12 : 4.2 + rand() * 2);
      nSeed.push(hub ? 0.05 : rand() * 0.85);
      const c = hub ? new THREE.Color("#c7f36b") : new THREE.Color("#9fe9ec");
      nCol.push(c.r, c.g, c.b);
    });
    const nodeGeo = new THREE.BufferGeometry();
    nodeGeo.setAttribute("position", new THREE.Float32BufferAttribute(nPos, 3));
    nodeGeo.setAttribute("aSize", new THREE.Float32BufferAttribute(nSize, 1));
    nodeGeo.setAttribute("aSeed", new THREE.Float32BufferAttribute(nSeed, 1));
    nodeGeo.setAttribute("aColor", new THREE.Float32BufferAttribute(nCol, 3));
    const nodeMat = additive(pointVertex, roundFragment, { uBuild: { value: 0 }, uPixelRatio: { value: 1 }, uTime: { value: 0 } });

    // pulses along edges
    const pc = Math.round(g.edges.length * 0.8);
    const pA = new Float32Array(pc * 3), pB = new Float32Array(pc * 3), pS = new Float32Array(pc), pP = new Float32Array(pc), pPos = new Float32Array(pc * 3);
    for (let i = 0; i < pc; i++) {
      const [a, b] = g.edges[Math.floor(rand() * g.edges.length)];
      const [s, e] = rand() < 0.5 ? [a, b] : [b, a];
      pA.set([g.nodes[s].x, g.nodes[s].y, g.nodes[s].z], i * 3);
      pB.set([g.nodes[e].x, g.nodes[e].y, g.nodes[e].z], i * 3);
      pS[i] = 0.12 + rand() * 0.25;
      pP[i] = rand();
    }
    const pulseGeo = new THREE.BufferGeometry();
    pulseGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
    pulseGeo.setAttribute("aA", new THREE.BufferAttribute(pA, 3));
    pulseGeo.setAttribute("aB", new THREE.BufferAttribute(pB, 3));
    pulseGeo.setAttribute("aSpeed", new THREE.BufferAttribute(pS, 1));
    pulseGeo.setAttribute("aPhase", new THREE.BufferAttribute(pP, 1));
    const pulseMat = additive(pulseVertex, roundFragment, { uTime: { value: 0 }, uPixelRatio: { value: 1 }, uBuild: { value: 0 }, uBoost: { value: 0 } });

    // lift particles: terrain (world) → network points (world, unrotated)
    const n = tier === "high" ? 5200 : 2200;
    const start = new Float32Array(n * 3), end = new Float32Array(n * 3), delay = new Float32Array(n);
    const ws = WORK_SITES;
    for (let i = 0; i < n; i++) {
      const anchor = ws[i % ws.length];
      const r = Math.sqrt(rand()) * 22;
      const a = rand() * Math.PI * 2;
      const x = anchor.x + Math.cos(a) * r;
      const z = anchor.z + Math.sin(a) * r * 0.8;
      start.set([x, terrainHeight(x, z) + 0.05, z], i * 3);
      // land on an edge or a node
      const [ea, eb] = g.edges[Math.floor(rand() * g.edges.length)];
      const f = rand() < 0.3 ? Math.round(rand()) : rand();
      const p = g.nodes[ea].clone().lerp(g.nodes[eb], f).add(C);
      end.set([p.x, p.y, p.z], i * 3);
      delay[i] = rand() * 0.45 + (r / 22) * 0.1;
    }
    const liftGeo = new THREE.BufferGeometry();
    liftGeo.setAttribute("position", new THREE.BufferAttribute(start, 3));
    liftGeo.setAttribute("aEnd", new THREE.BufferAttribute(end, 3));
    liftGeo.setAttribute("aDelay", new THREE.BufferAttribute(delay, 1));
    const liftMat = additive(liftVertex, roundFragment, { uT: { value: 0 }, uTime: { value: 0 }, uPixelRatio: { value: 1 } });

    return { g, edgeGeo, edgeMat, nodeGeo, nodeMat, pulseGeo, pulseMat, liftGeo, liftMat };
  }, [tier]);

  const builtRef = useRef(built);
  useEffect(() => {
    builtRef.current = built;
  }, [built]);
  useEffect(
    () => () => {
      [built.edgeGeo, built.nodeGeo, built.pulseGeo, built.liftGeo].forEach((x) => x.dispose());
      [built.edgeMat, built.nodeMat, built.pulseMat, built.liftMat].forEach((x) => x.dispose());
    },
    [built],
  );

  const group = useRef<THREE.Group>(null);
  const lift = useRef<THREE.Points>(null);
  const tmp = useRef({ v: new THREE.Vector3() });

  useFrame((state) => {
    const b = builtRef.current;
    const c = frame.chapter;
    const t = state.clock.elapsedTime;
    const dpr = state.gl.getPixelRatio();
    // transition clock: 0 as the land starts to break, ~1.5 once settled
    const T = (c - DISSOLVE.from) / (DISSOLVE.to - DISSOLVE.from + 0.3);
    const active = c > DISSOLVE.from - 0.2;
    if (group.current) group.current.visible = active;
    if (lift.current) lift.current.visible = T > -0.05 && T < 1.65;
    if (!active) return;

    b.liftMat.uniforms.uT.value = T;
    b.liftMat.uniforms.uTime.value = t;
    b.liftMat.uniforms.uPixelRatio.value = dpr;

    const build = clamp01((T - 0.55) / 0.7);
    b.edgeMat.uniforms.uBuild.value = build;
    b.edgeMat.uniforms.uAlpha.value = 0.46 + 0.35 * frame.finale;
    b.nodeMat.uniforms.uBuild.value = build;
    b.nodeMat.uniforms.uPixelRatio.value = dpr;
    b.nodeMat.uniforms.uTime.value = t;
    b.pulseMat.uniforms.uBuild.value = build;
    b.pulseMat.uniforms.uPixelRatio.value = dpr;
    b.pulseMat.uniforms.uTime.value = t;
    b.pulseMat.uniforms.uBoost.value = frame.finale * 1.5;

    // The network turns slowly with the scroll once it has formed (static during the hand-over).
    if (group.current) group.current.rotation.y = Math.max(0, c - (DISSOLVE.to + 0.15)) * 0.45 + build * t * 0.015;

    // Service hub labels: pinned to the hubs during the services chapter.
    const show = smooth(c, CHAPTER.services - 0.35, CHAPTER.services - 0.1) * (1 - smooth(c, CHAPTER.services + 0.45, CHAPTER.services + 0.7));
    b.g.hubs.forEach((h, k) => {
      const el = serviceLabels[k];
      if (!el || !group.current) return;
      tmp.current.v.copy(b.g.nodes[h]).applyMatrix4(group.current.matrixWorld).project(state.camera);
      const v = tmp.current.v;
      const x = (v.x * 0.5 + 0.5) * state.size.width;
      const y = (-v.y * 0.5 + 0.5) * state.size.height;
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
      el.style.opacity = String(v.z < 1 ? show * build : 0);
    });
  });

  return (
    <>
      <points ref={lift} geometry={built.liftGeo} material={built.liftMat} frustumCulled={false} renderOrder={5} />
      <group ref={group} position={C}>
        <lineSegments geometry={built.edgeGeo} material={built.edgeMat} frustumCulled={false} renderOrder={4} />
        <points geometry={built.nodeGeo} material={built.nodeMat} frustumCulled={false} renderOrder={5} />
        <points geometry={built.pulseGeo} material={built.pulseMat} frustumCulled={false} renderOrder={6} />
      </group>
    </>
  );
}

