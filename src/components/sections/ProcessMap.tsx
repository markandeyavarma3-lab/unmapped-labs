"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { Stage } from "@/content/site-content";
import { prefersReducedMotion, track } from "@/components/motion/scroll-engine";
import { useLenis } from "@/components/motion/SmoothScroll";
import { getWorldLive, getWorldLiveServer, islandState, setViewAnchor, subscribeWorldMode } from "@/components/three/views";

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/* 2D fallback (no WebGL / reduced motion / before 3D is ready). */
const POINTS: [number, number][] = [
  [30, 230],
  [92, 128],
  [166, 196],
  [236, 86],
  [304, 170],
  [372, 70],
];
const ROUTE = "M30 230 C 52 180, 70 136, 92 128 S 140 200, 166 196 S 206 94, 236 86 S 280 150, 304 170 S 350 92, 372 70";

/**
 * The process as a full-screen takeover: the section pins while one city
 * block plays Unknown → Observe → Map → Understand → Build → Validate and
 * the camera flies the block's own path. The current stage's text sits in a
 * narrow card on the left; the block fills the rest. Every stage stays in
 * the document for assistive tech.
 */
export function ProcessMap({ stages, caption }: { stages: Stage[]; caption: string }) {
  const STAGES = stages.length;
  const trackRef = useRef<HTMLDivElement>(null);
  const anchor = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const routeRef = useRef<SVGPathElement>(null);
  const fillRef = useRef<HTMLSpanElement>(null);
  const [active, setActive] = useState(0);
  const live = useSyncExternalStore(subscribeWorldMode, getWorldLive, getWorldLiveServer);
  const getLenis = useLenis();

  useEffect(() => {
    setViewAnchor("island", anchor.current);
    return () => setViewAnchor("island", null);
  }, []);

  useEffect(() => {
    const el = card.current;
    if (!el) return;
    const measure = () => (islandState.cardRight = window.innerWidth >= 1024 ? el.getBoundingClientRect().right + 12 : 0);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    let current = 0;
    return track(
      el,
      (r) => {
        // Each stage holds in the middle of its stretch of scroll.
        const raw = r * (STAGES - 1);
        const i = Math.min(Math.floor(raw), STAGES - 2);
        const held = i + smoothstep(0.25, 0.75, raw - i);
        islandState.progress = held;
        if (routeRef.current && !prefersReducedMotion()) routeRef.current.style.strokeDashoffset = String(1 - held / (STAGES - 1));
        if (fillRef.current) fillRef.current.style.transform = `scaleX(${held / (STAGES - 1)})`;
        const next = Math.round(held);
        if (next !== current) {
          current = next;
          setActive(next);
        }
      },
      { start: { el: 0, vp: 0 }, end: { el: 1, vp: 1 } },
    );
  }, [STAGES]);

  /** Scroll to the point in the track where stage i is fully in view. */
  const goTo = (i: number) => {
    const el = trackRef.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY;
    const y = top + (i / (STAGES - 1)) * (el.offsetHeight - window.innerHeight);
    const lenis = getLenis();
    if (lenis && !prefersReducedMotion()) lenis.scrollTo(y, { duration: 1.4 });
    else window.scrollTo({ top: y });
  };

  const s = stages[active];
  const last = String(STAGES - 1).padStart(2, "0");

  return (
    <div ref={trackRef} className="process-track relative mt-[8vh]">
      <div className="sticky top-0 h-[100svh] overflow-hidden">
        {/* 3D view draws across the whole stage */}
        <div ref={anchor} aria-hidden className="absolute inset-0" />

        {/* Focus: soften the city around the block */}
        <div
          aria-hidden
          className={`pointer-events-none absolute inset-0 bg-[radial-gradient(62%_70%_at_62%_54%,transparent_55%,rgba(247,236,218,0.55)_100%)] transition-opacity duration-700 max-lg:bg-[radial-gradient(90%_60%_at_50%_40%,transparent_55%,rgba(247,236,218,0.55)_100%)] ${live ? "opacity-100" : "opacity-0"}`}
        />

        {/* 2D fallback map */}
        <div
          aria-hidden
          className={`absolute inset-0 flex items-center justify-end p-6 transition-opacity duration-700 max-lg:items-start max-lg:justify-center max-lg:pt-[18vh] ${
            live ? "pointer-events-none opacity-0" : "opacity-100"
          }`}
        >
          <div className="relative aspect-[400/280] w-full max-w-[36rem] lg:mr-[6vw]">
            <svg viewBox="0 0 400 280" className="absolute inset-0 h-full w-full" fill="none">
              <path d={ROUTE} stroke="var(--color-line)" strokeWidth="1.2" strokeDasharray="3 6" />
              <path ref={routeRef} d={ROUTE} stroke="var(--color-cyan)" strokeWidth="1.6" pathLength={1} strokeDasharray="1" strokeLinecap="round" />
              {POINTS.map(([x, y], i) => (
                <rect
                  key={i}
                  x={x - 6}
                  y={y - 6}
                  width={12}
                  height={12}
                  transform={`rotate(45 ${x} ${y})`}
                  fill={i === active ? "var(--color-lime)" : i < active ? "var(--color-cyan)" : "var(--color-ink)"}
                  stroke={i <= active ? "none" : "var(--color-fg-3)"}
                />
              ))}
            </svg>
          </div>
        </div>

        {/* Current stage */}
        <div className="pointer-events-none absolute inset-0">
          <div className="container-site flex h-full items-center pt-[var(--header-h)] max-lg:items-end max-lg:pb-5">
            <div ref={card} className="glass pointer-events-auto w-full max-w-[23rem] p-6 max-lg:max-w-none max-lg:p-5" aria-hidden>
              <div className="flex items-center justify-between gap-3">
                <span className="label tabular-nums text-[color:var(--color-cyan)]">
                  Stage {s.index} / {last}
                </span>
                <span className="label hidden text-right text-[color:var(--color-fg-3)] sm:inline">{s.annotation}</span>
              </div>
              <p key={`t-${active}`} className="swap-word mt-4 text-[clamp(2.1rem,1.5rem+2.2vw,3.2rem)] leading-none font-medium tracking-[-0.04em]">
                {s.title}
              </p>
              <p key={`b-${active}`} className="swap-caption mt-4 text-base leading-relaxed text-[color:var(--color-fg-2)] max-lg:text-[15px]">
                {s.body}
              </p>

              {/* Stage navigator */}
              <div className="relative mt-6">
                <span aria-hidden className="absolute top-[5px] right-0 left-0 h-px bg-[color:var(--color-line)]" />
                <span ref={fillRef} aria-hidden className="absolute top-[5px] right-0 left-0 h-px origin-left scale-x-0 bg-[linear-gradient(90deg,var(--color-cyan),var(--color-lime))]" />
                <div className="relative flex justify-between">
                  {stages.map((st, i) => (
                    <button key={st.index} type="button" tabIndex={-1} onClick={() => goTo(i)} className="group flex flex-col items-center gap-2">
                      <span
                        className={`block h-[11px] w-[11px] rotate-45 border transition-[background-color,border-color,transform] duration-300 group-hover:scale-125 ${
                          i === active
                            ? "scale-125 border-[color:var(--color-lime)] bg-[color:var(--color-lime)]"
                            : i < active
                              ? "border-[color:var(--color-cyan)] bg-[color:var(--color-cyan)]"
                              : "border-[color:var(--color-fg-3)] bg-[color:var(--color-ink)]"
                        }`}
                      />
                      <span className={`label tabular-nums ${i === active ? "text-[color:var(--color-fg)]" : "text-[color:var(--color-fg-3)]"}`}>{st.index}</span>
                    </button>
                  ))}
                </div>
              </div>
              <p className="label mt-5 text-[color:var(--color-fg-3)] max-sm:hidden">{caption}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Every stage, in the document for assistive tech and in-page links */}
      <ol className="sr-only">
        {stages.map((st, i) => (
          <li key={st.index} id={`stage-${st.index}`}>
            <h3>
              Stage {st.index}: {st.title}
            </h3>
            <p>{st.body}</p>
            <button type="button" onClick={() => goTo(i)}>
              Show stage {st.index} in the process view
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}
