"use client";

import { useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { PerformanceMonitor } from "@react-three/drei";
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
  const [dpr, setDpr] = useState(() => Math.min(window.devicePixelRatio || 1, maxDpr));

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
      <PerformanceMonitor
        onDecline={() => setDpr((d) => Math.max(1, d - 0.35))}
        onIncline={() => setDpr((d) => Math.min(maxDpr, d + 0.25))}
        flipflops={3}
      />
      <Scene tier={tier} introDelay={introDelay} />
      <ReadySignal onReady={onReady} />
    </Canvas>
  );
}
