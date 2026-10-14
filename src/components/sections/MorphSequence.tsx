"use client";

import { useEffect, useRef, useState } from "react";
import { intro } from "@/content/site-content";
import { prefersReducedMotion, track } from "@/components/motion/scroll-engine";
import { morphState, setViewAnchor } from "@/components/three/views";

const STAGES = intro.progression.length - 1; // 5
const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/**
 * Unknown → Build. A sticky stage (~3.5 screens of scroll) where a particle
 * field morphs through six formations. Scroll position maps to the stage with
 * a hold on each, so every shape gets time on screen. Text and the step rail
 * are real HTML and update in sync.
 */
export function MorphSequence() {
  const trackRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  const stepsRef = useRef<HTMLOListElement>(null);
  const [stage, setStage] = useState(0);

  useEffect(() => {
    setViewAnchor("morph", anchorRef.current);
    return () => setViewAnchor("morph", null);
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el || prefersReducedMotion()) return;
    const steps = Array.from(stepsRef.current?.children ?? []) as HTMLElement[];
    let current = 0;
    return track(
      el,
      (r) => {
        const raw = r * STAGES;
        const i = Math.min(Math.floor(raw), STAGES - 1);
        const held = i + smoothstep(0.22, 0.78, raw - i);
        morphState.progress = held;
        if (fillRef.current) fillRef.current.style.transform = `scaleX(${held / STAGES})`;
        steps.forEach((s, k) => {
          s.dataset.state = held >= k - 0.5 ? (Math.round(held) === k ? "current" : "passed") : "ahead";
        });
        const next = Math.round(held);
        if (next !== current) {
          current = next;
          setStage(next);
        }
      },
      { start: { el: 0, vp: 0 }, end: { el: 1, vp: 1 } },
    );
  }, []);

  const word = intro.progression[stage];

  return (
    <div ref={trackRef} className="morph-track relative">
      <div className="morph-stage sticky top-0 h-[100svh] overflow-hidden">
        {/* The 3D view draws into this rectangle. */}
        <div ref={anchorRef} aria-hidden className="absolute inset-0" />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(8,11,14,0.85)_0%,rgba(8,11,14,0.35)_40%,transparent_65%)] max-md:bg-[linear-gradient(0deg,rgba(8,11,14,0.92)_0%,rgba(8,11,14,0.5)_45%,transparent_70%)]"
        />

        <div className="container-site relative flex h-full flex-col justify-end pt-[calc(var(--header-h)+2rem)] pb-[clamp(2rem,7vh,4.5rem)]">
          <div className="max-w-[30rem] motion-reduce:hidden" aria-live="polite">
            <p className="label text-[color:var(--color-fg-3)]">{intro.figure}</p>
            <div className="mt-6 flex items-baseline gap-4">
              <span className="label tabular-nums text-[color:var(--color-cyan)]">
                {String(stage).padStart(2, "0")} / {String(STAGES).padStart(2, "0")}
              </span>
              <span className="h-px w-10 bg-[color:var(--color-line)]" aria-hidden />
            </div>
            <p
              key={word}
              className={`swap-word mt-3 text-[clamp(3rem,1.6rem+6vw,7rem)] leading-[0.95] font-medium tracking-[-0.045em] ${
                stage === STAGES ? "text-[color:var(--color-lime)]" : "text-[color:var(--color-fg)]"
              }`}
            >
              {word}
            </p>
            <p key={`c-${stage}`} className="swap-caption mt-5 min-h-[3.4em] text-[length:var(--text-lead)] leading-snug text-[color:var(--color-fg-2)]">
              {intro.captions[stage]}
            </p>
          </div>

          {/* Step rail */}
          <div className="relative mt-[clamp(2rem,6vh,4rem)] motion-reduce:mt-0">
            <div aria-hidden className="absolute top-[5px] right-0 left-0 h-px bg-[repeating-linear-gradient(90deg,var(--color-line)_0_10px,transparent_10px_22px)] max-sm:hidden motion-reduce:hidden" />
            <div ref={fillRef} aria-hidden className="absolute top-[5px] right-0 left-0 h-px origin-left scale-x-0 bg-[linear-gradient(90deg,var(--color-cyan)_80%,var(--color-lime))] max-sm:hidden motion-reduce:hidden" />
            <ol ref={stepsRef} className="morph-steps relative grid grid-cols-6 gap-2" aria-label="From unknown to built">
              {intro.progression.map((s, i) => (
                <li key={s} data-state={i === 0 ? "current" : "ahead"} className="morph-step flex flex-col gap-3">
                  <span aria-hidden className={`morph-dot block h-[11px] w-[11px] border ${i === STAGES ? "is-last" : ""}`} />
                  <span className="label text-[color:var(--color-fg-3)] max-sm:hidden">0{i}</span>
                  <span className="text-[15px] font-medium tracking-[-0.02em] sm:text-lg max-sm:sr-only">{s}</span>
                  <span className="sr-only">: {intro.captions[i]}</span>
                  <span className="hidden text-sm leading-snug text-[color:var(--color-fg-2)] motion-reduce:block" aria-hidden>
                    {intro.captions[i]}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
