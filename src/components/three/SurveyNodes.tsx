"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { NODES, type SurveyNode } from "./landmarks";
import { glowFragment, glowVertex, hexToVec3 } from "./shaders";
import { nodeLabel, world } from "./world-store";
import { frame } from "./frame-state";

const CYAN = hexToVec3("#65e4e8");
const LIME = hexToVec3("#c7f36b");

export function SurveyNodes() {
  const [active, setActive] = useState<string | null>(null);

  // Fill or hide the shared DOM label when the active node changes.
  useEffect(() => {
    const el = nodeLabel.el;
    if (!el) return;
    const n = NODES.find((x) => x.id === active);
    if (!n?.label) {
      el.dataset.on = "false";
      return;
    }
    el.querySelector("[data-name]")!.textContent = n.label;
    el.querySelector("[data-coords]")!.textContent = `${n.x.toFixed(1)}, ${n.z.toFixed(1)}`;
    el.dataset.on = "true";
  }, [active]);

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
  const projected = useRef(new THREE.Vector3());
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
    if (haloGroup.current) {
      haloGroup.current.scale.setScalar(scale);
      haloGroup.current.quaternion.copy(state.camera.quaternion); // billboard
    }

    // The active node pins the shared DOM label to its marker.
    if (activeRef.current && nodeLabel.el) {
      const v = projected.current.set(node.x, node.y + (labelled ? 1.1 : 0.12), node.z).project(state.camera);
      const x = (v.x * 0.5 + 0.5) * state.size.width;
      const y = (-v.y * 0.5 + 0.5) * state.size.height;
      nodeLabel.el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
    }
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
      <group ref={haloGroup} position={[0, labelled ? 1.1 : 0.12, 0]}>
        <mesh ref={haloMesh} material={halo}>
          <planeGeometry args={[1.5, 1.5]} />
        </mesh>
      </group>

      {interactive && (
        <mesh position={[0, 0.7, 0]} {...handlers}>
          <sphereGeometry args={[0.85, 8, 8]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
        </mesh>
      )}

    </group>
  );
}
