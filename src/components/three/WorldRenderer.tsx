"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { subscribeViewAnchors, viewAnchors, viewRects, viewVisible, type ViewId } from "./views";
import { world } from "./world-store";

type ViewEntry = { scene: THREE.Scene; camera: THREE.PerspectiveCamera };
const registry: Partial<Record<ViewId, ViewEntry>> = {};

const size = new THREE.Vector2();

/** Draws the world, then each live view into its anchor's rectangle. */
function renderWorld(renderer: THREE.WebGLRenderer, target: THREE.WebGLRenderTarget | null, scene: THREE.Scene, camera: THREE.Camera) {
  renderer.getSize(size);
  const W = size.x;
  const H = size.y;
  const k = target ? target.width / W : 1;

  const setRect = (x: number, y: number, w: number, h: number, scissor: boolean) => {
    if (target) {
      target.viewport.set(x * k, y * k, w * k, h * k);
      target.scissor.set(x * k, y * k, w * k, h * k);
      target.scissorTest = scissor;
      renderer.setRenderTarget(target);
    } else {
      renderer.setRenderTarget(null);
      renderer.setViewport(x, y, w, h);
      renderer.setScissor(x, y, w, h);
      renderer.setScissorTest(scissor);
    }
  };

  setRect(0, 0, W, H, false);
  renderer.clear();
  renderer.render(scene, camera);

  (Object.keys(registry) as ViewId[]).forEach((id) => {
    const view = registry[id];
    const anchor = viewAnchors[id];
    if (!view || !anchor) return;
    const r = anchor.getBoundingClientRect();
    viewRects[id] = { x: r.left, y: r.top, w: r.width, h: r.height };
    viewVisible[id] = !(r.bottom <= 0 || r.top >= H || r.width < 2 || r.height < 2);
    if (!viewVisible[id]) return;
    const aspect = r.width / r.height;
    if (Math.abs(view.camera.aspect - aspect) > 1e-3) {
      view.camera.aspect = aspect;
      view.camera.updateProjectionMatrix();
    }
    setRect(r.left, H - r.bottom, r.width, r.height, true);
    renderer.clearDepth();
    renderer.render(view.scene, view.camera);
  });

  setRect(0, 0, W, H, false);
}

/**
 * Takes over rendering (priority 1): world, then each live view, straight to
 * the screen. While the visitor is idle (no scroll or pointer for 2.5s) it
 * draws every other frame — the slow ambient motion doesn't need 60fps.
 */
export function WorldRenderer() {
  const frameNo = useRef(0);
  useFrame((state) => {
    state.gl.autoClear = false;
    const idle = performance.now() - world.lastActive > 2500;
    if (idle && frameNo.current++ % 2 === 1) return;
    renderWorld(state.gl, null, state.scene, state.camera);
  }, 1);
  return null;
}

/**
 * Hosts a view's content in its own scene + camera, mounted only while the
 * DOM section that anchors it exists.
 */
export function ViewLayer({ id, fov, position, children }: { id: ViewId; fov: number; position: [number, number, number]; children: React.ReactNode }) {
  const anchor = useSyncExternalStore(
    subscribeViewAnchors,
    () => viewAnchors[id],
    () => null,
  );
  const [entry] = useState<ViewEntry>(() => {
    const camera = new THREE.PerspectiveCamera(fov, 1, 0.1, 100);
    camera.position.set(...position);
    camera.lookAt(0, 0, 0);
    return { scene: new THREE.Scene(), camera };
  });

  const gl = useThree((s) => s.gl);

  // Compile the view's shaders in the background (KHR_parallel_shader_compile)
  // so the first frame it appears in doesn't stall.
  useEffect(() => {
    if (!anchor) return;
    gl.compileAsync(entry.scene, entry.camera).catch(() => {});
  }, [anchor, entry, gl]);

  useEffect(() => {
    if (!anchor) return;
    registry[id] = entry;
    return () => {
      delete registry[id];
      viewRects[id] = null;
      viewVisible[id] = false;
    };
  }, [anchor, entry, id]);

  if (!anchor) return null;
  return createPortal(children, entry.scene, { camera: entry.camera });
}
