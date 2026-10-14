"use client";

import { useEffect, useRef } from "react";
import { prefersReducedMotion, track } from "@/components/motion/scroll-engine";

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/**
 * Unknown → … → Build. A dashed, fragmented line becomes one continuous
 * path as you scroll past; each stage lights as the path reaches it.
 * Without JS or with reduced motion, everything simply shows as complete.
 */
export function Progression({ steps }: { steps: string[] }) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el || prefersReducedMotion()) return;
    const solid = el.querySelector<HTMLElement>("[data-solid]");
    const items = Array.from(el.querySelectorAll<HTMLElement>("[data-step]"));
    const dots = items.map((i) => i.querySelector<HTMLElement>("[data-dot]"));

    return track(
      el,
      (p) => {
        if (solid) solid.style.transform = `scaleX(${p})`;
        items.forEach((item, i) => {
          const k = clamp01((p - (i / (items.length - 1)) * 0.92) / 0.08);
          item.style.opacity = String(0.28 + 0.72 * k);
          const dot = dots[i];
          if (dot) dot.style.transform = `scale(${0.4 + 0.6 * k})`;
        });
      },
      { start: { el: 0, vp: 0.85 }, end: { el: 1, vp: 0.45 }, scrub: 0.8 },
    );
  }, []);

  return (
    <div ref={root} className="reveal" role="group" aria-label="From unknown to built">
      <div className="relative">
        {/* fragmented baseline */}
        <div aria-hidden className="absolute top-[5px] right-0 left-0 h-px bg-[repeating-linear-gradient(90deg,var(--color-line)_0_10px,transparent_10px_22px)] max-sm:hidden" />
        {/* continuous mapped line */}
        <div aria-hidden data-solid className="absolute top-[5px] right-0 left-0 h-px origin-left bg-[color:var(--color-cyan)] max-sm:hidden" />
        <ol className="relative grid grid-cols-3 gap-y-8 sm:grid-cols-6">
          {steps.map((s, i) => (
            <li key={s} data-step className="flex flex-col gap-4 pr-2">
              <span
                data-dot
                aria-hidden
                className={`block h-[11px] w-[11px] border ${
                  i === steps.length - 1
                    ? "border-[color:var(--color-lime)] bg-[color:var(--color-lime)]"
                    : "border-[color:var(--color-cyan)] bg-[color:var(--color-ink)]"
                }`}
              />
              <span className="label text-[color:var(--color-fg-3)]">0{i}</span>
              <span className="text-lg font-medium tracking-[-0.02em] text-[color:var(--color-fg)]">{s}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
