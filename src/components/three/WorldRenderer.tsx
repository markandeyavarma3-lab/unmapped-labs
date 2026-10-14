"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { createPortal, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { Pass } from "three/examples/jsm/postprocessing/Pass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { subscribeViewAnchors, viewAnchors, viewRects, type ViewId } from "./views";

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
    if (r.bottom <= 0 || r.top >= H || r.width < 2 || r.height < 2) return;
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

/** EffectComposer pass that runs `renderWorld` into the composer's buffer. */
class WorldPass extends Pass {
  scene: THREE.Scene | null = null;
  camera: THREE.Camera | null = null;
  constructor() {
    super();
    this.needsSwap = false;
  }
  render(renderer: THREE.WebGLRenderer, _write: THREE.WebGLRenderTarget, read: THREE.WebGLRenderTarget) {
    if (!this.scene || !this.camera) return;
    renderWorld(renderer, this.renderToScreen ? null : read, this.scene, this.camera);
  }
}

/**
 * Takes over rendering (priority 1). High tier: world + views → bloom.
 * Low tier: world + views straight to the screen.
 */
export function WorldRenderer({ bloom }: { bloom: boolean }) {
  const gl = useThree((s) => s.gl);
  const width = useThree((s) => s.size.width);
  const height = useThree((s) => s.size.height);
  const dpr = useThree((s) => s.viewport.dpr);

  const pipeline = useMemo(() => {
    if (!bloom) return null;
    const composer = new EffectComposer(gl);
    const world = new WorldPass();
    const glow = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.5, 0.45, 0.42);
    composer.addPass(world);
    composer.addPass(glow);
    return { composer, world, glow };
  }, [gl, bloom]);

  useEffect(() => {
    if (!pipeline) return;
    pipeline.composer.setPixelRatio(dpr);
    pipeline.composer.setSize(width, height);
    // Bloom at half resolution: soft glow doesn't need full detail.
    pipeline.glow.resolution.set(width / 2, height / 2);
  }, [pipeline, width, height, dpr]);

  const pipelineRef = useRef(pipeline);
  useEffect(() => {
    pipelineRef.current = pipeline;
  }, [pipeline]);

  useEffect(
    () => () => {
      pipeline?.composer.dispose();
      pipeline?.glow.dispose();
    },
    [pipeline],
  );

  useFrame((state, delta) => {
    const pipeline = pipelineRef.current;
    state.gl.autoClear = false;
    if (pipeline) {
      pipeline.world.scene = state.scene;
      pipeline.world.camera = state.camera;
      pipeline.composer.render(delta);
    } else {
      renderWorld(state.gl, null, state.scene, state.camera);
    }
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

  useEffect(() => {
    if (!anchor) return;
    registry[id] = entry;
    return () => {
      delete registry[id];
      viewRects[id] = null;
    };
  }, [anchor, entry, id]);

  if (!anchor) return null;
  return createPortal(children, entry.scene, { camera: entry.camera });
}
