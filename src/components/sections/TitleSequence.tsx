"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { site } from "@/config/site";
import { prefersReducedMotion, track } from "@/components/motion/scroll-engine";
import { getWorldLive, getWorldLiveServer, subscribeWorldMode } from "@/components/three/views";

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/**
 * The opening: "UNMAPPED LABS" rises out of the fogged terrain (3D, drawn by
 * the world), then scrolling burns the fog off and draws the tagline in
 * survey lines. Before WebGL is ready — or without it — a crisp HTML title
 * holds the same place.
 */
export function TitleSequence() {
  const section = useRef<HTMLElement>(null);
  const tagline = useRef<SVGTextElement>(null);
  const taglineWrap = useRef<HTMLDivElement>(null);
  const cue = useRef<HTMLDivElement>(null);
  const live = useSyncExternalStore(subscribeWorldMode, getWorldLive, getWorldLiveServer);

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
        const draw = smoothstep(0.04, 0.42, r);
        // Each glyph outline draws itself (dash length ≈ the longest glyph perimeter).
        text.style.strokeDashoffset = String((1 - draw) * 420);
        text.style.fillOpacity = String(smoothstep(0.36, 0.52, r));
        if (taglineWrap.current) {
          taglineWrap.current.style.opacity = String(Math.min(1, r * 12) * (1 - smoothstep(0.82, 1, r)));
          taglineWrap.current.style.transform = `translate3d(0, ${(1 - smoothstep(0, 0.4, r)) * 24}px, 0)`;
        }
        if (cue.current) cue.current.style.opacity = String(1 - smoothstep(0.02, 0.12, r));
      },
      { start: { el: 0, vp: 0 }, end: { el: 1, vp: 1 } },
    );
  }, []);

  return (
    <section ref={section} id="top" data-chapter="0" aria-labelledby="title-heading" className="title-track relative">
      <h1 id="title-heading" className="sr-only">
        {site.name} — {site.tagline}
      </h1>
      {/* Chapter 1 (tagline) anchors partway down the track. */}
      <div aria-hidden data-chapter="1" className="pointer-events-none absolute top-[105vh] h-px w-px" />

      <div className="sticky top-0 flex h-[100svh] flex-col items-center justify-between overflow-hidden pt-[calc(var(--header-h)+1.5rem)] pb-8">
        <p aria-hidden className="label fade-up flex items-center gap-3 text-[color:var(--color-fg-3)]" style={{ "--i": 0 } as React.CSSProperties}>
          <span className="tabular-nums">Survey 001</span>
          <span className="h-px w-6 bg-[color:var(--color-line)]" />
          <span>Independent exploration lab</span>
        </p>

        {/* HTML title — holds the place until (or instead of) the 3D letters. */}
        <div
          aria-hidden
          className={`ghost-title pointer-events-none absolute inset-x-0 top-[38%] -translate-y-1/2 text-center transition-[opacity,filter,transform] duration-[1400ms] ease-[var(--ease-out-expo)] ${
            live ? "scale-[1.04] opacity-0 blur-sm" : "opacity-100"
          }`}
        >
          <span className="line-mask">
            <span style={{ "--i": 1 } as React.CSSProperties}>
              Unmapped<span className="max-sm:block"> Labs</span>
            </span>
          </span>
        </div>

        {/* Tagline, drawn in survey lines as you scroll. */}
        <div ref={taglineWrap} aria-hidden className="relative mt-auto mb-[9vh] w-full max-w-[min(90vw,52rem)] opacity-0 max-sm:mb-[14vh]">
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

        <div ref={cue} aria-hidden className="label flex flex-col items-center gap-3 text-[color:var(--color-fg-3)]">
          <span className="relative block h-9 w-px overflow-hidden bg-[color:var(--color-line)]">
            <span className="absolute inset-x-0 top-0 h-3 animate-[scroll-cue_2.2s_var(--ease-in-out-quart)_infinite] bg-[color:var(--color-cyan)]" />
          </span>
          Scroll to light up the city
        </div>
      </div>
    </section>
  );
}
