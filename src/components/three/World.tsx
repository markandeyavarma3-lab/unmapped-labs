"use client";

import { useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Scene, type Tier } from "./Scene";
import { onWorldPauseChange, world } from "./world-store";

/** Stops the render loop entirely while an opaque section covers the canvas. */
function PauseController() {
  const setFrameloop = useThree((s) => s.setFrameloop);
  useEffect(() => {
    const apply = () => setFrameloop(world.paused ? "never" : "always");
    apply();
    return onWorldPauseChange(apply);
  }, [setFrameloop]);
  return null;
}

/** Reports readiness after real frames have been drawn, not on context creation. */
function ReadySignal({ onReady }: { onReady: () => void }) {
  const frames = useRef(0);
  const done = useRef(false);
  useFrame(() => {
    if (done.current) return;
    if (++frames.current > 2) {
      done.current = true;
      onReady();
    }
  });
  return null;
}

/**
 * Adaptive resolution: samples frame time in 1.5s windows and steps the
 * device-pixel-ratio down when the GPU struggles, back up when it has headroom.
 */
function AdaptiveDpr({ max }: { max: number }) {
  const setDpr = useThree((s) => s.setDpr);
  const sample = useRef({ frames: 0, time: 0, dpr: Math.min(window.devicePixelRatio || 1, max), good: 0 });
  useFrame((_, delta) => {
    const s = sample.current;
    s.frames++;
    s.time += delta;
    if (s.time < 1.5) return;
    const fps = s.frames / s.time;
    s.frames = 0;
    s.time = 0;
    if (fps < 45 && s.dpr > 1) {
      s.dpr = Math.max(1, s.dpr - 0.25);
      s.good = 0;
      setDpr(s.dpr);
    } else if (fps > 57 && s.dpr < max && ++s.good >= 3) {
      s.dpr = Math.min(max, s.dpr + 0.25);
      s.good = 0;
      setDpr(s.dpr);
    }
  });
  return null;
}

export default function World({
  tier,
  introDelay,
  onReady,
}: {
  tier: Tier;
  introDelay: number;
  onReady: () => void;
}) {
  const maxDpr = tier === "high" ? 1.75 : 1.25;
  const [dpr] = useState(() => Math.min(window.devicePixelRatio || 1, maxDpr));

  return (
    <Canvas
      eventSource={document.body}
      eventPrefix="client"
      dpr={dpr}
      flat
      gl={{ antialias: tier === "high", alpha: false, stencil: false, powerPreference: "high-performance" }}
      camera={{ fov: 40, near: 0.1, far: 140, position: [0, 8, 47] }}
      onCreated={({ gl }) => gl.setClearColor("#080b0e")}
    >
      <PauseController />
      <AdaptiveDpr max={maxDpr} />
      <Scene tier={tier} introDelay={introDelay} />
      <ReadySignal onReady={onReady} />
    </Canvas>
  );
}
