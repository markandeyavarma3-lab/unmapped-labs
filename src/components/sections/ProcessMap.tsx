"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { Stage } from "@/content/site-content";
import { onScroll, prefersReducedMotion } from "@/components/motion/scroll-engine";
import { getWorldLive, getWorldLiveServer, islandState, registerViewAnchorWhenNear, subscribeWorldMode } from "@/components/three/views";

/* 2D fallback geometry (no WebGL / reduced motion / before 3D is ready). */
const POINTS: [number, number][] = [
  [44, 218],
  [128, 112],
  [206, 186],
  [288, 74],
  [360, 158],
];
const ROUTE = "M44 218 C 70 160, 92 118, 128 112 S 176 190, 206 186 S 250 84, 288 74 S 340 120, 360 158";

export function ProcessMap({ stages }: { stages: Stage[] }) {
  const root = useRef<HTMLDivElement>(null);
  const anchor = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const live = useSyncExternalStore(subscribeWorldMode, getWorldLive, getWorldLiveServer);

  useEffect(() => registerViewAnchorWhenNear("island", anchor.current), []);

  // Progress = where the viewport centre sits between consecutive stage centres.
  useEffect(() => {
    const items = Array.from(root.current?.querySelectorAll<HTMLElement>("[data-stage]") ?? []);
    let centres: number[] = [];
    let current = -1;
    const measure = () => {
      const y0 = window.scrollY;
      centres = items.map((el) => {
        const r = el.getBoundingClientRect();
        return r.top + y0 + r.height / 2;
      });
    };
    const update = (y: number, vh: number) => {
      if (!centres.length) return;
      const c = y + vh / 2;
      let p = 0;
      if (c >= centres[centres.length - 1]) p = centres.length - 1;
      else
        for (let i = 0; i < centres.length - 1; i++) {
          if (c < centres[i + 1]) {
            p = i + Math.max(0, (c - centres[i]) / (centres[i + 1] - centres[i]));
            break;
          }
        }
      islandState.progress = p;
      const route = root.current?.querySelector<SVGPathElement>("[data-route]");
      if (route && !prefersReducedMotion()) route.style.strokeDashoffset = String(1 - p / (centres.length - 1));
      const next = Math.round(p);
      if (next !== current) {
        current = next;
        setActive(next);
      }
    };
    return onScroll(update, measure);
  }, []);

  return (
    <div ref={root} className="mt-16 grid gap-10 lg:mt-24 lg:grid-cols-12 lg:gap-8">
      {/* Island panel — sticky beside the stages on large screens, pinned on top on small ones */}
      {/* Small screens: the grid item itself sticks (its cell spans only the panel).
          Large screens: the item stretches beside the stages and the inner panel sticks. */}
      <div className="z-10 max-lg:sticky max-lg:top-[var(--header-h)] lg:col-span-6">
        <div className="max-lg:-mx-[var(--gutter)] lg:sticky lg:top-[calc(var(--header-h)+1rem)]">
          <div className="relative h-[calc(100svh-var(--header-h))] w-full overflow-hidden lg:h-[calc(100svh-var(--header-h)-2rem)]">
            {/* 3D view draws here (top 58% on phones, whole panel on desktop) */}
            <div ref={anchor} aria-hidden className="absolute inset-0 max-lg:bottom-[42%]" />

            {/* Station labels, pinned to the 3D markers each frame */}
            <div className={`pointer-events-none absolute inset-0 transition-opacity duration-700 max-lg:bottom-[42%] ${live ? "opacity-100" : "opacity-0"}`}>
              {stages.map((s, i) => (
                <a
                  key={s.index}
                  ref={(el) => {
                    islandState.labels[i] = el;
                  }}
                  href={`#stage-${s.index}`}
                  tabIndex={live ? 0 : -1}
                  aria-hidden={!live}
                  aria-label={`Fly to stage ${s.index}: ${s.title}`}
                  data-active="false"
                  className="island-label pointer-events-auto absolute top-0 left-0 -translate-x-1/2 -translate-y-full opacity-0"
                >
                  <span className="label flex items-center gap-2 border border-[color:var(--color-line)] bg-[color:var(--color-ink)]/80 px-2 py-1 whitespace-nowrap backdrop-blur-sm">
                    <span className="tabular-nums text-[color:var(--color-fg-3)]">{s.index}</span>
                    <span>{s.title}</span>
                  </span>
                </a>
              ))}
            </div>

            {/* 2D fallback map */}
            <div className={`absolute inset-0 flex items-center justify-center p-6 transition-opacity duration-700 max-lg:bottom-[42%] ${live ? "pointer-events-none opacity-0" : "opacity-100"}`}>
              <div className="relative aspect-[400/280] w-full max-w-[30rem]">
                <svg viewBox="0 0 400 280" className="absolute inset-0 h-full w-full" aria-hidden fill="none">
                  <path d={ROUTE} stroke="var(--color-line)" strokeWidth="1.2" strokeDasharray="3 6" />
                  <path data-route d={ROUTE} stroke="var(--color-cyan)" strokeWidth="1.6" pathLength={1} strokeDasharray="1" strokeLinecap="round" />
                </svg>
                {stages.map((s, i) => {
                  const [x, y] = POINTS[i];
                  const on = active === i;
                  return (
                    <a
                      key={s.index}
                      href={`#stage-${s.index}`}
                      tabIndex={live ? -1 : 0}
                      aria-label={`Stage ${s.index}: ${s.title}`}
                      className="absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center p-3"
                      style={{ left: `${(x / 400) * 100}%`, top: `${(y / 280) * 100}%` }}
                    >
                      <span
                        className={`block h-3 w-3 rotate-45 border transition-colors duration-[var(--duration-hover)] ${
                          on ? "border-[color:var(--color-lime)] bg-[color:var(--color-lime)]" : i < active ? "border-[color:var(--color-cyan)] bg-[color:var(--color-cyan)]" : "border-[color:var(--color-fg-3)] bg-[color:var(--color-ink)]"
                        }`}
                      />
                      <span className={`label absolute top-full mt-0.5 whitespace-nowrap max-lg:hidden ${on ? "text-[color:var(--color-fg)]" : "text-[color:var(--color-fg-3)]"}`}>
                        {s.index} {s.title}
                      </span>
                    </a>
                  );
                })}
              </div>
            </div>

            {/* Phones: the current stage, swapped in as you scroll (the full list below stays readable to assistive tech) */}
            <div aria-hidden className="absolute inset-x-0 bottom-0 flex h-[42%] flex-col justify-center border-t border-[color:var(--color-line)] bg-[linear-gradient(180deg,rgba(8,11,14,0.2),rgba(8,11,14,0.85))] px-[var(--gutter)] lg:hidden">
              <div className="flex items-center justify-between">
                <span className="label tabular-nums text-[color:var(--color-cyan)]">Stage {stages[active].index} / 05</span>
                <span className="flex gap-1.5">
                  {stages.map((s, i) => (
                    <span key={s.index} className={`block h-1.5 w-1.5 rotate-45 transition-colors duration-300 ${i === active ? "bg-[color:var(--color-lime)]" : i < active ? "bg-[color:var(--color-cyan)]" : "bg-[color:var(--color-line)]"}`} />
                  ))}
                </span>
              </div>
              <p key={`t-${active}`} className="swap-word mt-3 text-[2.4rem] leading-none font-medium tracking-[-0.035em]">
                {stages[active].title}
              </p>
              <p key={`b-${active}`} className="swap-caption mt-3 text-[15px] leading-relaxed text-[color:var(--color-fg-2)]">
                {stages[active].body}
              </p>
            </div>

            {/* Panel furniture */}
            <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between p-4 max-lg:hidden lg:p-5">
              <span className="label text-[color:var(--color-fg-3)]">Fig. 03 — The process, as terrain</span>
              <span className="label tabular-nums text-[color:var(--color-cyan)]">
                {stages[active].index} / 05 · {stages[active].title}
              </span>
            </div>
            <div aria-hidden className="pointer-events-none absolute inset-0 border border-[color:var(--color-line)]/60 max-lg:hidden" />
          </div>
        </div>
      </div>

      {/* The stages — always fully readable */}
      <ol data-stages className="lg:col-span-5 lg:col-start-8">
        {stages.map((s, i) => {
          const on = active === i;
          return (
            <li
              key={s.index}
              id={`stage-${s.index}`}
              data-stage={i}
              data-on={on || undefined}
              className="stage-item group relative flex min-h-[70svh] scroll-mt-[30vh] flex-col justify-center border-t border-[color:var(--color-line)] py-14 last:border-b max-lg:border-transparent max-lg:opacity-0 lg:min-h-[78svh]"
            >
              <span aria-hidden className="stage-bar absolute -top-px left-0 h-px w-full origin-left bg-[linear-gradient(90deg,var(--color-cyan),var(--color-lime))]" />
              <div className="flex items-baseline gap-5">
                <span className={`label tabular-nums transition-colors duration-[var(--duration-nav)] ${on ? "text-[color:var(--color-cyan)]" : "text-[color:var(--color-fg-3)]"}`}>
                  Stage {s.index}
                </span>
                <span className="label hidden text-[color:var(--color-fg-3)] sm:inline">{s.annotation}</span>
              </div>
              <h3 className="stage-title mt-5 text-[clamp(2rem,1.4rem+2.4vw,3.4rem)] leading-none font-medium tracking-[-0.035em] text-[color:var(--color-fg)]">
                {s.title}
              </h3>
              <p className="stage-body mt-5 max-w-[30rem] text-[1.0625rem] leading-relaxed text-[color:var(--color-fg-2)]">{s.body}</p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
