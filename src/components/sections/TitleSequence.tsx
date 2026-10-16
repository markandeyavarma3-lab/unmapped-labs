"use client";

import { useEffect, useRef } from "react";
import { site } from "@/config/site";
import { prefersReducedMotion, track } from "@/components/motion/scroll-engine";
import { CHAPTER } from "@/components/three/chapters";

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/**
 * The opening. The visit starts on the hills north of the city with the
 * name over the sky; scrolling dives down the valley into the city, where
 * the name rises again in its towers (3D), and the tagline draws itself in
 * survey lines.
 *
 * Chapters along the track: −1 (hills, held for the first stretch) → 0 (the
 * name in the towers) → 1 (the tagline).
 */
export function TitleSequence() {
  const section = useRef<HTMLElement>(null);
  const tagline = useRef<SVGTextElement>(null);
  const taglineWrap = useRef<HTMLDivElement>(null);
  const cue = useRef<HTMLDivElement>(null);
  const title = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = section.current;
    const text = tagline.current;
    if (!el || !text) return;
    if (prefersReducedMotion()) {
      text.style.strokeDashoffset = "0";
      text.style.fillOpacity = "1";
      if (taglineWrap.current) taglineWrap.current.style.opacity = "1";
      return;
    }
    return track(
      el,
      (r) => {
        // The title over the hills lifts away as the camera dives.
        if (title.current) {
          const out = smoothstep(0.03, 0.17, r);
          title.current.style.opacity = String(1 - out);
          title.current.style.transform = `translate3d(0, ${-out * 60}px, 0) scale(${1 + out * 0.08})`;
          title.current.style.filter = out > 0.01 ? `blur(${out * 8}px)` : "";
        }
        const draw = smoothstep(0.62, 0.85, r);
        // Each glyph outline draws itself (dash length ≈ the longest glyph perimeter).
        text.style.strokeDashoffset = String((1 - draw) * 420);
        text.style.fillOpacity = String(smoothstep(0.8, 0.9, r));
        if (taglineWrap.current) {
          taglineWrap.current.style.opacity = String(smoothstep(0.56, 0.62, r) * (1 - smoothstep(0.93, 1, r)));
          taglineWrap.current.style.transform = `translate3d(0, ${(1 - smoothstep(0.56, 0.75, r)) * 24}px, 0)`;
        }
        if (cue.current) cue.current.style.opacity = String(1 - smoothstep(0.02, 0.1, r));
      },
      { start: { el: 0, vp: 0 }, end: { el: 1, vp: 1 } },
    );
  }, []);

  return (
    <section ref={section} id="top" data-chapter={CHAPTER.prologue} aria-labelledby="title-heading" className="title-track relative">
      <h1 id="title-heading" className="sr-only">
        {site.name} — {site.tagline}
      </h1>
      {/* The hills hold for the first stretch, then the dive (−1 → 0) and the tagline (0 → 1). */}
      <div aria-hidden data-chapter={CHAPTER.prologue} className="pointer-events-none absolute top-[75vh] h-px w-px" />
      <div aria-hidden data-chapter={CHAPTER.title} className="pointer-events-none absolute top-[225vh] h-px w-px" />
      <div aria-hidden data-chapter={CHAPTER.tagline} className="pointer-events-none absolute top-[305vh] h-px w-px" />

      <div className="sticky top-0 flex h-[100svh] flex-col items-center justify-between overflow-hidden pt-[calc(var(--header-h)+1.5rem)] pb-8">
        <p aria-hidden className="label fade-up flex items-center gap-3 rounded-full bg-[color:var(--color-ink-2)]/90 px-4 py-2 text-[color:var(--color-fg-2)] shadow-[0_10px_30px_-16px_rgba(80,54,24,0.6)]" style={{ "--i": 0 } as React.CSSProperties}>
          <span className="tabular-nums">Survey 001</span>
          <span className="h-px w-6 bg-[color:var(--color-line)]" />
          <span>Independent exploration lab</span>
        </p>

        {/* The name over the hills' sky. */}
        <div ref={title} aria-hidden className="pointer-events-none absolute inset-x-0 top-[31%] -translate-y-1/2 text-center will-change-transform">
          <div className="hills-title">
            <span className="line-mask">
              <span style={{ "--i": 1 } as React.CSSProperties}>
                Unmapped<span className="max-sm:block"> Labs</span>
              </span>
            </span>
          </div>
        </div>

        {/* Tagline, drawn in survey lines as you scroll. */}
        <div ref={taglineWrap} aria-hidden className="relative mt-auto mb-[7vh] w-full max-w-[min(90vw,46rem)] rounded-[2.5rem] bg-[color:var(--color-ink-2)]/90 px-[clamp(1rem,3vw,2.5rem)] py-2 opacity-0 shadow-[0_18px_50px_-24px_rgba(80,54,24,0.55)] max-sm:mb-[14vh]">
          <svg viewBox="0 0 1000 120" className="h-auto w-full overflow-visible">
            <text
              ref={tagline}
              x="500"
              y="88"
              textAnchor="middle"
              className="tagline-text"
            >
              {site.tagline}
            </text>
          </svg>
        </div>

        <div ref={cue} aria-hidden className="label flex flex-col items-center gap-3 text-[color:var(--color-fg-2)] [&>span:last-child]:rounded-full">
          <span className="relative block h-9 w-px overflow-hidden bg-[color:var(--color-line)]">
            <span className="absolute inset-x-0 top-0 h-3 animate-[scroll-cue_2.2s_var(--ease-in-out-quart)_infinite] bg-[color:var(--color-cyan)]" />
          </span>
          <span className="rounded-full bg-[color:var(--color-ink-2)]/90 px-4 py-2 shadow-[0_10px_30px_-16px_rgba(80,54,24,0.6)]">Scroll to enter the city</span>
        </div>
      </div>
    </section>
  );
}
