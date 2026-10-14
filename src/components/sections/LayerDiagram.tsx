"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, useGSAP);

type Layer = { title: string; body: string };

/**
 * Four strata seen in oblique projection. A survey probe descends through
 * them on scroll; each layer lights as the probe reaches it — symptom on top,
 * evidence at the bottom. Fully legible as a static list without motion.
 */
export function LayerDiagram({ layers }: { layers: Layer[] }) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const tl = gsap.timeline({
          scrollTrigger: { trigger: root.current, start: "top 75%", end: "bottom 55%", scrub: 0.7 },
        });
        tl.fromTo("[data-probe]", { scaleY: 0 }, { scaleY: 1, ease: "none", duration: 1 }, 0);
        gsap.utils.toArray<HTMLElement>("[data-layer]").forEach((el, i, all) => {
          const at = (i / all.length) * 0.95 + 0.04;
          tl.fromTo(el, { opacity: 0.35 }, { opacity: 1, duration: 0.12, ease: "none" }, at);
          tl.fromTo(el.querySelector("[data-plate]"), { y: 10 }, { y: 0, duration: 0.2, ease: "none" }, at - 0.04);
        });
      });
    },
    { scope: root },
  );

  return (
    <div ref={root} className="relative lg:sticky lg:top-[calc(var(--header-h)+3rem)]">
      <p className="label mb-8 text-[color:var(--color-fg-3)]">Fig. 05 — From symptom to evidence</p>
      <div className="relative pl-10">
        {/* probe */}
        <div aria-hidden className="absolute top-3 bottom-10 left-3 w-px bg-[color:var(--color-line)]" />
        <div aria-hidden data-probe className="absolute top-3 bottom-10 left-3 w-px origin-top bg-[linear-gradient(var(--color-cyan),var(--color-lime))]" />

        <ol className="flex flex-col gap-5">
          {layers.map((l, i) => {
            const last = i === layers.length - 1;
            return (
              <li key={l.title} data-layer className="relative">
                <span
                  aria-hidden
                  className={`absolute top-6 -left-[31px] block h-[9px] w-[9px] rotate-45 ${last ? "bg-[color:var(--color-lime)]" : "bg-[color:var(--color-cyan)]"}`}
                />
                <div data-plate className="relative">
                  {/* oblique plate */}
                  <svg aria-hidden viewBox="0 0 400 70" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" fill="none">
                    <path d="M40 1H399L360 69H1Z" fill="rgba(22,29,37,0.75)" stroke={last ? "var(--color-lime)" : "var(--color-line)"} strokeOpacity={last ? 0.6 : 1} />
                    <path d={`M${70 + i * 18} 14 C 160 ${8 + i * 4}, 240 ${40 - i * 6}, ${330 - i * 10} 30`} stroke="var(--color-fg-3)" strokeOpacity="0.5" strokeDasharray="2 4" />
                  </svg>
                  <div className="relative flex min-h-[70px] items-center justify-between gap-4 py-4 pr-12 pl-10">
                    <div>
                      <h3 className="text-[1.0625rem] font-medium tracking-[-0.01em] text-[color:var(--color-fg)]">{l.title}</h3>
                      <p className="mt-0.5 text-sm text-[color:var(--color-fg-2)]">{l.body}</p>
                    </div>
                    <span className="label shrink-0 text-[color:var(--color-fg-3)]">L{i + 1}</span>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
