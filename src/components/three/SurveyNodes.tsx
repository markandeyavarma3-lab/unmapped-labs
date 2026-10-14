"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Billboard, Html } from "@react-three/drei";
import * as THREE from "three";
import { NODES, type SurveyNode } from "./landmarks";
import { glowFragment, glowVertex, hexToVec3 } from "./shaders";
import { world } from "./world-store";
import { frame } from "./frame-state";

const CYAN = hexToVec3("#65e4e8");
const LIME = hexToVec3("#c7f36b");

export function SurveyNodes() {
  const [active, setActive] = useState<string | null>(null);

  // Tapping empty space on touch devices clears the label.
  useEffect(() => {
    if (!active) return;
    const clear = (e: PointerEvent) => {
      if (e.pointerType === "touch") setActive(null);
    };
    window.addEventListener("pointerdown", clear);
    return () => window.removeEventListener("pointerdown", clear);
  }, [active]);

  return (
    <>
      {NODES.map((n, i) => (
        <Node
          key={n.id}
          node={n}
          index={i}
          active={active === n.id}
          onActive={(on) => {
            setActive((cur) => (on ? n.id : cur === n.id ? null : cur));
            world.hovered = on && n.label ? n.label : null;
          }}
        />
      ))}
    </>
  );
}

function Node({
  node,
  index,
  active,
  onActive,
}: {
  node: SurveyNode;
  index: number;
  active: boolean;
  onActive: (on: boolean) => void;
}) {
  const labelled = Boolean(node.label);
  const halo = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: glowVertex,
        fragmentShader: glowFragment,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uColor: { value: new THREE.Vector3(...CYAN) },
          uOpacity: { value: 0 },
          uRing: { value: 0 },
        },
      }),
    [],
  );
  useEffect(() => () => halo.dispose(), [halo]);

  const haloMesh = useRef<THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>>(null);
  const core = useRef<THREE.Mesh>(null);
  const pole = useRef<THREE.Mesh>(null);
  const haloGroup = useRef<THREE.Group>(null);
  const emphasis = useRef(0);
  const activeRef = useRef(active);
  useEffect(() => {
    activeRef.current = active;
  }, [active]);
  const phase = index * 0.37;

  useFrame((state, delta) => {
    if (!haloMesh.current) return;
    const s = frame.nodeStrength[index];
    const dt = Math.min(delta, 1 / 20);
    emphasis.current = THREE.MathUtils.damp(emphasis.current, activeRef.current ? 1 : 0, 8, dt);
    const e = emphasis.current;

    const u = haloMesh.current.material.uniforms;
    u.uRing.value = (state.clock.elapsedTime * 0.32 + phase) % 1;
    u.uOpacity.value = (0.25 + s * 0.75) * (labelled ? 1 : 0.6) + e * 0.4;
    const c = u.uColor.value as THREE.Vector3;
    c.set(CYAN[0] + (LIME[0] - CYAN[0]) * e, CYAN[1] + (LIME[1] - CYAN[1]) * e, CYAN[2] + (LIME[2] - CYAN[2]) * e);

    const scale = 1 + e * 0.6 + s * 0.25;
    haloGroup.current?.scale.setScalar(scale);
    core.current?.scale.setScalar(0.6 + s * 0.5 + e * 0.5);
    if (pole.current) (pole.current.material as THREE.MeshBasicMaterial).opacity = 0.18 + s * 0.4 + e * 0.4;
  });

  const interactive = labelled;
  const handlers = interactive
    ? {
        onPointerOver: (ev: { stopPropagation: () => void }) => {
          if (frame.chapter > 1.6) return;
          ev.stopPropagation();
          onActive(true);
        },
        onPointerOut: () => onActive(false),
        onPointerDown: (ev: { stopPropagation: () => void; nativeEvent: PointerEvent }) => {
          if (frame.chapter > 1.6) return;
          if (ev.nativeEvent.pointerType === "touch") {
            ev.stopPropagation();
            ev.nativeEvent.stopPropagation();
            onActive(!active);
          }
        },
      }
    : {};

  return (
    <group position={[node.x, node.y, node.z]}>
      {labelled && (
        <mesh ref={pole} position={[0, 0.55, 0]}>
          <cylinderGeometry args={[0.006, 0.006, 1.1, 4]} />
          <meshBasicMaterial color="#9fb3c4" transparent opacity={0.3} depthWrite={false} />
        </mesh>
      )}
      <mesh ref={core} position={[0, labelled ? 1.1 : 0.12, 0]}>
        <sphereGeometry args={[0.07, 12, 12]} />
        <meshBasicMaterial color={active ? "#c7f36b" : "#65e4e8"} toneMapped={false} />
      </mesh>
      <Billboard position={[0, labelled ? 1.1 : 0.12, 0]}>
        <group ref={haloGroup}>
          <mesh ref={haloMesh} material={halo}>
            <planeGeometry args={[1.5, 1.5]} />
          </mesh>
        </group>
      </Billboard>

      {interactive && (
        <mesh position={[0, 0.7, 0]} {...handlers}>
          <sphereGeometry args={[0.85, 8, 8]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
        </mesh>
      )}

      {labelled && (
        <Html position={[0, 1.1, 0]} zIndexRange={[5, 0]} style={{ pointerEvents: "none" }}>
          <div
            aria-hidden
            className="pointer-events-none -translate-y-1/2 pl-4 whitespace-nowrap transition-[opacity,transform] duration-300 ease-[var(--ease-out-expo)]"
            style={{ opacity: active ? 1 : 0, transform: `translate(${active ? 0 : -6}px, -50%)` }}
          >
            <div className="flex items-center gap-2 border border-[color:var(--color-line)] bg-[color:var(--color-ink)]/85 px-2.5 py-1.5 backdrop-blur-sm">
              <span className="h-1 w-1 bg-[color:var(--color-lime)]" />
              <span className="label text-[color:var(--color-fg)]">{node.label}</span>
              <span className="label text-[color:var(--color-fg-3)]">
                {node.x.toFixed(1)}, {node.z.toFixed(1)}
              </span>
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}
