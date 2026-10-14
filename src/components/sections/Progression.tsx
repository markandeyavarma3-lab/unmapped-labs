"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/**
 * Unknown → … → Build. A dashed, fragmented line becomes one continuous
 * path as you scroll past; each stage lights as the path reaches it.
 * Without JS or with reduced motion, everything simply shows as complete.
 */
export function Progression({ steps }: { steps: string[] }) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const tl = gsap.timeline({
          scrollTrigger: { trigger: root.current, start: "top 85%", end: "bottom 45%", scrub: 0.8 },
        });
        tl.fromTo("[data-solid]", { scaleX: 0 }, { scaleX: 1, ease: "none", duration: 1 }, 0);
        gsap.utils.toArray<HTMLElement>("[data-step]").forEach((el, i, all) => {
          const at = i / (all.length - 1);
          tl.fromTo(el, { opacity: 0.28 }, { opacity: 1, duration: 0.08, ease: "none" }, at * 0.92);
          tl.fromTo(el.querySelector("[data-dot]"), { scale: 0.4 }, { scale: 1, duration: 0.08 }, at * 0.92);
        });
      });
    },
    { scope: root },
  );

  return (
    <div ref={root} className="reveal" role="group" aria-label="From unknown to built">
      <div className="relative">
        {/* fragmented baseline */}
        <div aria-hidden className="absolute top-[5px] right-0 left-0 h-px max-sm:hidden bg-[repeating-linear-gradient(90deg,var(--color-line)_0_10px,transparent_10px_22px)]" />
        {/* continuous mapped line */}
        <div aria-hidden data-solid className="absolute max-sm:hidden top-[5px] right-0 left-0 h-px origin-left bg-[color:var(--color-cyan)]" />
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
