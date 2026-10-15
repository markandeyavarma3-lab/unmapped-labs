"use client";

import { Suspense, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { CAMERA_KEYS, LAST_CHAPTER, PORTRAIT_TITLE_KEYS } from "./landmarks";
import { mulberry32 } from "./terrain-math";
import { City } from "./City";
import { Districts } from "./Districts";
import { Life } from "./Life";
import { Environment } from "./Environment";
import { ProcessBlock, PROCESS_KEYS } from "./ProcessBlock";
import { updateCityState } from "./city-state";
import { world } from "./world-store";
import { frame } from "./frame-state";
import { ViewLayer } from "./WorldRenderer";
import { islandState, subscribeViewAnchors, viewAnchors, type ViewId } from "./views";
import { ParticleMorph } from "./ParticleMorph";

export type Tier = "high" | "low";

const clamp01 = (v: number) => Math.min(Math.max(v, 0), 1);
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * Mounts layers one frame apart so geometry building and shader compilation
 * are spread over several short tasks instead of one long main-thread block.
 */
function useStagedMount(stages: number) {
  const [stage, setStage] = useState(1);
  useFrame(() => {
    if (stage < stages) setStage((s) => s + 1);
  });
  return stage;
}

/** True once the browser has been idle `delay` ms after mount — for building heavy scenes off the scroll path. */
function useIdleReady(delay: number) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let idleId = 0;
    const timer = window.setTimeout(() => {
      const ric = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 50));
      idleId = ric(() => setReady(true), { timeout: 2000 }) as number;
    }, delay);
    return () => {
      window.clearTimeout(timer);
      (window.cancelIdleCallback ?? window.clearTimeout)(idleId);
    };
  }, [delay]);
  return ready;
}

/** True once a view's anchor comes within ~1.5 screens of the viewport (and stays true). */
function useAnchorNear(id: ViewId, enabled: boolean) {
  const [near, setNear] = useState(false);
  const anchor = useSyncExternalStore(subscribeViewAnchors, () => viewAnchors[id], () => null);
  useEffect(() => {
    if (!enabled || !anchor || near) return;
    const io = new IntersectionObserver((e) => e.some((x) => x.isIntersecting) && setNear(true), { rootMargin: "150% 0px 150% 0px" });
    io.observe(anchor);
    return () => io.disconnect();
  }, [anchor, enabled, near]);
  return near;
}

export function Scene({ tier, introDelay, onReady }: { tier: Tier; introDelay: number; onReady: () => void }) {
  const phone = tier === "low";
  const morphIdle = useIdleReady(2600);
  const morphNear = useAnchorNear("morph", phone);
  const morphReady = phone ? morphNear : morphIdle;

  return (
    <>
      <Environment tier={tier} />
      <Suspense fallback={null}>
        <CityScene tier={tier} introDelay={introDelay} onReady={onReady} />
      </Suspense>
      {morphReady && (
        <ViewLayer id="morph" fov={38} position={[0, 0, 11.5]}>
          <ParticleMorph tier={tier} />
        </ViewLayer>
      )}
    </>
  );
}

/**
 * Everything that needs the model library; mounts once it has loaded. The
 * city stays hidden until every material has compiled in parallel
 * (KHR_parallel_shader_compile), so a cold shader cache never stalls a frame.
 */
function CityScene({ tier, introDelay, onReady }: { tier: Tier; introDelay: number; onReady: () => void }) {
  const stage = useStagedMount(5);
  const group = useRef<THREE.Group>(null);
  const [compiled, setCompiled] = useState(false);
  const started = useRef(false);
  const frames = useRef(0);
  const done = useRef(false);
  useFrame((state, delta) => {
    if (stage >= 5 && !started.current && group.current) {
      started.current = true;
      state.gl
        .compileAsync(group.current, state.camera, state.scene)
        .catch(() => {})
        .then(() => setCompiled(true));
    }
    if (!compiled) return;
    frame.time += Math.min(delta, 1 / 20);
    if (!done.current && ++frames.current > 2) {
      done.current = true;
      onReady();
    }
  });
  return (
    <group ref={group} visible={compiled}>
      <CameraRig tier={tier} introDelay={introDelay} />
      <City tier={tier} />
      {stage >= 2 && <Districts tier={tier} />}
      {stage >= 3 && <Life tier={tier} />}
      {stage >= 4 && <ProcessBlock />}
      {stage >= 5 && tier === "high" && <Motes />}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Camera rig — single source of motion                               */
/* ------------------------------------------------------------------ */

function CameraRig({ tier, introDelay }: { tier: Tier; introDelay: number }) {
  const curves = useMemo(() => {
    const v = (a: [number, number, number]) => new THREE.Vector3(...a);
    return {
      pos: new THREE.CatmullRomCurve3(CAMERA_KEYS.map((k) => v(k.pos)), false, "centripetal"),
      target: new THREE.CatmullRomCurve3(CAMERA_KEYS.map((k) => v(k.target)), false, "centripetal"),
      pPos: new THREE.CatmullRomCurve3(PROCESS_KEYS.map((k) => v(k.pos)), false, "centripetal"),
      pTarget: new THREE.CatmullRomCurve3(PROCESS_KEYS.map((k) => v(k.target)), false, "centripetal"),
      portraitPos: PORTRAIT_TITLE_KEYS.map((k) => v(k.pos)),
      portraitTarget: PORTRAIT_TITLE_KEYS.map((k) => v(k.target)),
    };
  }, []);

  const scratch = useRef({
    pos: new THREE.Vector3(),
    target: new THREE.Vector3(),
    a: new THREE.Vector3(),
    b: new THREE.Vector3(),
    fwd: new THREE.Vector3(),
    right: new THREE.Vector3(),
    up: new THREE.Vector3(0, 1, 0),
    parallax: new THREE.Vector2(),
    offset: 0,
    process: 0,
    pProgress: 0,
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
    const u = clamp01(f.chapter / LAST_CHAPTER);
    curves.pos.getPoint(u, tmp.pos);
    curves.target.getPoint(u, tmp.target);

    // Portrait screens frame the stacked title from higher up.
    const aspect = size.width / size.height;
    if (aspect < 0.9 && f.chapter < 2) {
      const k = clamp01(f.chapter);
      tmp.a.lerpVectors(curves.portraitPos[0], curves.portraitPos[1], k);
      tmp.b.lerpVectors(curves.portraitTarget[0], curves.portraitTarget[1], k);
      const w = 1 - THREE.MathUtils.smoothstep(f.chapter, 1, 2);
      tmp.pos.lerp(tmp.a, w);
      tmp.target.lerp(tmp.b, w);
    }

    // Cinematic: while lingering on a district or a project, orbit slowly around it.
    if (f.chapter > 4.5 && f.chapter < 11.5) {
      const local = f.chapter - Math.round(f.chapter);
      const angle = local * 0.7;
      tmp.a.subVectors(tmp.pos, tmp.target).applyAxisAngle(tmp.up, angle);
      tmp.pos.copy(tmp.target).add(tmp.a);
    }

    // The process takes over while its section fills the screen: fly the block's own path.
    const anchor = viewAnchors.island;
    let pw = 0;
    if (anchor) {
      const r = anchor.getBoundingClientRect();
      const H = size.height;
      pw = THREE.MathUtils.smoothstep(Math.min((H - r.top) / H, r.bottom / H), 0.35, 0.95);
    }
    tmp.process = THREE.MathUtils.damp(tmp.process, pw, 3.2, dt);
    tmp.pProgress = THREE.MathUtils.damp(tmp.pProgress, islandState.progress, 3, dt);
    f.process = tmp.process;
    if (tmp.process > 0.001) {
      const pu = clamp01(tmp.pProgress / 4);
      curves.pPos.getPoint(pu, tmp.a);
      curves.pTarget.getPoint(pu, tmp.b);
      const w = easeOutCubic(tmp.process);
      tmp.pos.lerp(tmp.a, w);
      tmp.target.lerp(tmp.b, w);
    }

    // Pointer parallax in camera space, damped; a gentle handheld drift.
    const live = pointerLive.current && tier === "high";
    tmp.parallax.x = THREE.MathUtils.damp(tmp.parallax.x, live ? state.pointer.x : 0, 2.2, dt);
    tmp.parallax.y = THREE.MathUtils.damp(tmp.parallax.y, live ? state.pointer.y : 0, 2.2, dt);
    tmp.fwd.subVectors(tmp.target, tmp.pos).normalize();
    tmp.right.crossVectors(tmp.fwd, tmp.up).normalize();
    const dist = tmp.pos.distanceTo(tmp.target);
    const sway = Math.min(1, dist / 20);
    tmp.pos.addScaledVector(tmp.right, tmp.parallax.x * 0.9 * sway + Math.sin(t * 0.11) * 0.3 * sway);
    tmp.pos.y += (tmp.parallax.y * 0.45 + Math.sin(t * 0.17) * 0.18) * sway;

    // Entrance: descend from high above while the name rises out of the city.
    const arrive = easeOutCubic(f.introT);
    tmp.pos.y += (1 - arrive) * 16;
    tmp.pos.z += (1 - arrive) * 14;

    cam.position.copy(tmp.pos);
    cam.lookAt(tmp.target);
    f.target.copy(tmp.target);
    f.camDist = cam.position.distanceTo(tmp.target);

    // Framing: wider lens on portrait screens; on wide screens, shift the
    // composition right where the copy sits on the left.
    const fov = aspect < 0.8 ? 60 : aspect < 1.2 ? 50 : 40;
    const heroWeight = Math.max(
      1 - clamp01(Math.abs(f.chapter - 2) / 0.9),
      THREE.MathUtils.smoothstep(f.chapter, 4.5, 5) * (1 - THREE.MathUtils.smoothstep(f.chapter, 11.4, 11.9)) * 0.85,
      tmp.process * 0.8,
    );
    const targetOffset = aspect > 1.2 ? size.width * 0.13 * heroWeight : 0;
    tmp.offset = THREE.MathUtils.damp(tmp.offset, targetOffset, 4, dt);
    if (cam.fov !== fov) cam.fov = fov;
    cam.setViewOffset(size.width, size.height, -tmp.offset, 0, size.width, size.height);

    // Story state for every district derives from the smoothed chapter.
    f.introT = easeOutCubic(clamp01((f.time - introDelay * 0.4) / 3.2));
    f.finale = THREE.MathUtils.damp(f.finale, THREE.MathUtils.smoothstep(f.chapter, LAST_CHAPTER - 0.6, LAST_CHAPTER - 0.05), 3, dt);
    updateCityState(f.chapter, f.finale);
  });

  return null;
}

/* ------------------------------------------------------------------ */
/* Golden motes drifting in the low sun (high tier only)              */
/* ------------------------------------------------------------------ */

const moteVertex = /* glsl */ `
  attribute float aPhase;
  uniform float uTime; uniform float uScale;
  varying float vAlpha;
  void main() {
    vec3 p = position;
    p.x += sin(uTime * 0.21 + aPhase * 30.0) * 0.8;
    p.y += sin(uTime * 0.33 + aPhase * 17.0) * 0.5;
    p.z += cos(uTime * 0.17 + aPhase * 23.0) * 0.8;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = 0.07 * uScale / -mv.z;
    vAlpha = (0.35 + 0.65 * fract(aPhase * 7.0)) * (0.6 + 0.4 * sin(uTime * 1.3 + aPhase * 40.0));
  }
`;
const moteFragment = /* glsl */ `
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = (1.0 - smoothstep(0.1, 0.5, d)) * vAlpha;
    if (a < 0.02) discard;
    gl_FragColor = vec4(1.0, 0.93, 0.7, a);
    #include <colorspace_fragment>
  }
`;

function Motes() {
  const points = useRef<THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>>(null);
  const { geometry, material } = useMemo(() => {
    const count = 700;
    const rand = mulberry32(42);
    const pos = new Float32Array(count * 3);
    const phase = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (rand() - 0.5) * 70;
      pos[i * 3 + 1] = 0.6 + rand() * 7;
      pos[i * 3 + 2] = 60 - rand() * 135;
      phase[i] = rand();
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geometry.setAttribute("aPhase", new THREE.BufferAttribute(phase, 1));
    const material = new THREE.ShaderMaterial({
      vertexShader: moteVertex,
      fragmentShader: moteFragment,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uScale: { value: 1 } },
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
    const fov = (state.camera as THREE.PerspectiveCamera).fov;
    u.uScale.value = (state.size.height * state.gl.getPixelRatio()) / (2 * Math.tan(THREE.MathUtils.degToRad(fov) / 2));
  });

  return <points ref={points} geometry={geometry} material={material} frustumCulled={false} />;
}
