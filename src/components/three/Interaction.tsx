"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { DISTRICTS, PROCESS_BLOCK } from "./city-layout";
import { frame } from "./frame-state";
import { world } from "./world-store";
import { STORY_CHAPTER, STORY_IDS } from "./story";
import { CHAPTER } from "./chapters";
import { callout } from "./callouts";
import { overlay } from "./fx";
import { scrollToY } from "@/components/motion/SmoothScroll";
import { focus, work } from "@/content/site-content";

/**
 * Two ways to touch the city, on devices with a mouse:
 *   · drag to look around while a story or the process holds the camera
 *     (it eases back when let go);
 *   · hover a district while the camera roams, and click to jump to its story.
 */

/** Drag-to-orbit offsets, read by the camera rig. */
export const orbit = { yaw: 0, pitch: 0, dragging: false };

type Hotspot = { x0: number; x1: number; z0: number; z1: number; label: string; target: string };
const site = (id: keyof typeof DISTRICTS, label: string, target: string): Hotspot => {
  const d = DISTRICTS[id];
  return { x0: d.x0, x1: d.x1, z0: d.z0, z1: d.z1, label: `${label} →`, target };
};
const HOTSPOTS: Hotspot[] = [
  site("farms", focus.areas[0].site, "#focus-agriculture"),
  site("logistics", focus.areas[1].site, "#focus-logistics"),
  site("healthcare", focus.areas[2].site, "#focus-healthcare"),
  site("energy", focus.areas[3].site, "#focus-energy"),
  site("open", focus.areas[4].title, "#focus-open"),
  site("markets", work.cases[1].name, "#work-deal-lens"),
  { x0: PROCESS_BLOCK.minX, x1: PROCESS_BLOCK.maxX, z0: PROCESS_BLOCK.minZ, z1: PROCESS_BLOCK.maxZ, label: "How we work →", target: ".process-track" },
];

/** Clicks and drags on these never reach the city. */
const BLOCKED = "a, button, input, textarea, select, label, form, [role='button'], .glass, p, h1, h2, h3, h4, li:not(.story-stop), dl, figure, .story-bar, .callout";

export function Interaction() {
  const state = useRef({ x: 0, y: 0, inside: false, over: -1, downX: 0, downY: 0, lastX: 0, lastY: 0 });
  const mat = useMemo(
    () =>
      overlay(
        /* glsl */ `uniform vec3 uColor; uniform float uOpacity; varying vec2 vUv;
        void main() {
          vec2 q = min(vUv, 1.0 - vUv);
          float edge = 1.0 - smoothstep(0.0, 0.012, min(q.x, q.y));
          float a = (edge + 0.12) * uOpacity;
          if (a < 0.01) discard;
          gl_FragColor = vec4(uColor, a);
          #include <colorspace_fragment>
        }`,
        { uColor: { value: new THREE.Color("#0fa3aa") }, uOpacity: { value: 0 } },
      ),
    [],
  );
  const ring = useRef<THREE.Mesh>(null);
  const ray = useMemo(() => new THREE.Raycaster(), []);
  const ndc = useRef(new THREE.Vector2()).current;
  const hit = useRef(new THREE.Vector3()).current;
  const ground = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), []);

  useEffect(() => () => mat.dispose(), [mat]);

  useEffect(() => {
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
    if (!fine.matches) return;
    const S = state.current;
    const canDrag = (t: Element | null) => !!t?.closest?.(".story-stage, .process-track") && !t?.closest?.(BLOCKED);

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" && e.pointerType !== "pen") return;
      S.x = e.clientX;
      S.y = e.clientY;
      S.inside = !(e.target as Element | null)?.closest?.(BLOCKED);
      if (orbit.dragging) {
        orbit.yaw = THREE.MathUtils.clamp(orbit.yaw - (e.clientX - S.lastX) * 0.006, -1.4, 1.4);
        orbit.pitch = THREE.MathUtils.clamp(orbit.pitch + (e.clientY - S.lastY) * 0.004, -0.35, 0.5);
        S.lastX = e.clientX;
        S.lastY = e.clientY;
      }
    };
    const onDown = (e: PointerEvent) => {
      if (e.button !== 0 || (e.pointerType !== "mouse" && e.pointerType !== "pen")) return;
      S.downX = e.clientX;
      S.downY = e.clientY;
      if (canDrag(e.target as Element)) {
        e.preventDefault(); // no text selection while dragging
        orbit.dragging = true;
        S.lastX = e.clientX;
        S.lastY = e.clientY;
        document.documentElement.classList.add("is-orbiting");
      }
    };
    const onUp = () => {
      orbit.dragging = false;
      document.documentElement.classList.remove("is-orbiting");
    };
    const onClick = (e: MouseEvent) => {
      if (e.button !== 0 || S.over < 0 || Math.hypot(e.clientX - S.downX, e.clientY - S.downY) > 6) return;
      if ((e.target as Element | null)?.closest?.(BLOCKED) || String(window.getSelection() ?? "").length) return;
      const el = document.querySelector<HTMLElement>(HOTSPOTS[S.over].target);
      if (!el) return;
      scrollToY(el.getBoundingClientRect().top + window.scrollY + window.innerHeight * 0.02);
    };
    const onLeave = () => (S.inside = false);

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    window.addEventListener("click", onClick);
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      window.removeEventListener("click", onClick);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      onUp();
    };
  }, []);

  useFrame((st, delta) => {
    const S = state.current;
    const dt = Math.min(delta, 1 / 20);
    // let go → ease back to the composed shot
    if (!orbit.dragging) {
      orbit.yaw = THREE.MathUtils.damp(orbit.yaw, 0, 2.2, dt);
      orbit.pitch = THREE.MathUtils.damp(orbit.pitch, 0, 2.2, dt);
    }

    // Hotspots only while the camera roams: not during a story, the process or the hills.
    let story = 0;
    for (const id of STORY_IDS) story = Math.max(story, 1 - THREE.MathUtils.smoothstep(Math.abs(frame.chapter - STORY_CHAPTER[id]), 0.3, 0.8));
    const roam = frame.chapter > 0.6 && story < 0.05 && frame.process < 0.05 && frame.chapter < CHAPTER.contact + 0.5;
    let over = -1;
    if (roam && S.inside) {
      // which site's rectangle is under the pointer? (ray onto the ground)
      ray.setFromCamera(ndc.set((S.x / st.size.width) * 2 - 1, -(S.y / st.size.height) * 2 + 1), st.camera);
      if (ray.ray.intersectPlane(ground, hit)) over = HOTSPOTS.findIndex((h) => hit.x > h.x0 && hit.x < h.x1 && hit.z > h.z0 && hit.z < h.z1);
    }
    S.over = over;
    world.hovered = over >= 0 ? HOTSPOTS[over].label : null;
    document.documentElement.classList.toggle("is-hotspot", over >= 0);

    const k = over >= 0 ? 1 : 0;
    mat.uniforms.uOpacity.value = THREE.MathUtils.damp(mat.uniforms.uOpacity.value, k * (0.75 + 0.25 * Math.sin(st.clock.elapsedTime * 4)), 8, dt);
    if (ring.current && over >= 0) {
      const h = HOTSPOTS[over];
      ring.current.position.set((h.x0 + h.x1) / 2, 0.1, (h.z0 + h.z1) / 2);
      ring.current.scale.set(h.x1 - h.x0 + 1.2, h.z1 - h.z0 + 1.2, 1);
    }
    if (over >= 0) {
      const h = HOTSPOTS[over];
      callout("hotspot", h.label, "teal", [(h.x0 + h.x1) / 2, 2.6, (h.z0 + h.z1) / 2], 1);
    }
  });

  return (
    <mesh ref={ring} rotation-x={-Math.PI / 2} material={mat} renderOrder={4}>
      <planeGeometry args={[1, 1]} />
    </mesh>
  );
}
