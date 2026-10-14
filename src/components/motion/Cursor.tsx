"use client";

import { useEffect, useRef } from "react";
import { world } from "@/components/three/world-store";

/**
 * A quiet survey reticle that trails the (still visible) system cursor on
 * fine-pointer devices. It widens over controls and names the survey node
 * under the pointer. No React renders per frame — transforms only.
 */
export function Cursor() {
  const ring = useRef<HTMLDivElement>(null);
  const tag = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!fine.matches || reduce.matches || !ring.current || !tag.current) return;

    const el = ring.current;
    const label = tag.current;
    let x = -100, y = -100, cx = -100, cy = -100;
    let scale = 1, targetScale = 1, visible = 0, targetVisible = 0;
    let lastLabel: string | null = null;
    let raf = 0;

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      x = e.clientX;
      y = e.clientY;
      targetVisible = 1;
      const t = e.target as Element | null;
      const interactive = t?.closest?.("a, button, [role='button'], input, select, textarea, label, [data-cursor]");
      const isText = t?.closest?.("input, textarea, select");
      targetScale = isText ? 0.5 : interactive ? 1.9 : 1;
    };
    const onLeave = () => (targetVisible = 0);

    const loop = () => {
      cx += (x - cx) * 0.2;
      cy += (y - cy) * 0.2;
      scale += (targetScale - scale) * 0.18;
      visible += (targetVisible - visible) * 0.15;
      el.style.transform = `translate3d(${cx}px, ${cy}px, 0) translate(-50%, -50%) scale(${scale})`;
      el.style.opacity = String(visible * (scale > 1.4 ? 0.9 : 0.6));

      const name = world.hovered;
      if (name !== lastLabel) {
        lastLabel = name;
        label.textContent = name ? `◇ ${name}` : "";
      }
      label.style.transform = `translate3d(${cx + 18}px, ${cy + 14}px, 0)`;
      label.style.opacity = name ? String(visible) : "0";
      raf = requestAnimationFrame(loop);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[var(--z-cursor)] hidden [@media(hover:hover)_and_(pointer:fine)]:block">
      <div
        ref={ring}
        className="absolute top-0 left-0 h-7 w-7 rounded-full border border-[color:var(--color-cyan)] opacity-0 mix-blend-difference will-change-transform"
      >
        <span className="absolute top-1/2 left-1/2 h-px w-2 -translate-x-1/2 -translate-y-1/2 bg-[color:var(--color-cyan)]" />
        <span className="absolute top-1/2 left-1/2 h-2 w-px -translate-x-1/2 -translate-y-1/2 bg-[color:var(--color-cyan)]" />
      </div>
      <span
        ref={tag}
        className="label absolute top-0 left-0 text-[color:var(--color-lime)] opacity-0 transition-opacity duration-200"
      />
    </div>
  );
}
