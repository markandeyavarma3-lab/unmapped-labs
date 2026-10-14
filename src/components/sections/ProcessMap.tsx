"use client";

import { useEffect, useRef, useState } from "react";
import type { Stage } from "@/content/site-content";
import { prefersReducedMotion, track } from "@/components/motion/scroll-engine";

/** Node positions on a 400×280 survey sheet (percent-based for the HTML buttons). */
const POINTS: [number, number][] = [
  [44, 218],
  [128, 112],
  [206, 186],
  [288, 74],
  [360, 158],
];
const ROUTE =
  "M44 218 C 70 160, 92 118, 128 112 S 176 190, 206 186 S 250 84, 288 74 S 340 120, 360 158";

/** A few hand-tuned contour rings so the sheet reads as terrain, not a chart. */
const CONTOURS = [
  "M96 150c18-36 66-52 96-30 30 22 22 70-14 84-38 14-98-14-82-54z",
  "M78 152c20-52 92-74 132-42 40 32 30 96-20 114-52 18-132-18-112-72z",
  "M248 92c10-28 56-40 80-22 24 18 16 54-14 64-30 10-76-14-66-42z",
  "M228 96c14-44 84-62 118-34 34 28 22 82-22 98-46 16-110-20-96-64z",
  "M18 250c30-30 90-36 120-12",
  "M300 250c22-26 64-40 96-30",
];

export function ProcessMap({ stages }: { stages: Stage[] }) {
  const root = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [pinned, setPinned] = useState<number | null>(null);
  const shown = pinned ?? active;

  // The stage nearest the middle of the viewport is the "current" one.
  useEffect(() => {
    const items = Array.from(root.current?.querySelectorAll<HTMLElement>("[data-stage]") ?? []);
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.stage));
      },
      { rootMargin: "-48% 0px -48% 0px" },
    );
    items.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  // The route draws itself as the stage list scrolls past.
  useEffect(() => {
    const route = root.current?.querySelector<SVGPathElement>("[data-route]");
    const list = root.current?.querySelector<HTMLElement>("[data-stages]");
    if (!route || !list || prefersReducedMotion()) return;
    return track(list, (p) => route.style.setProperty("stroke-dashoffset", String(1 - p)), {
      start: { el: 0, vp: 0.7 },
      end: { el: 1, vp: 0.6 },
      scrub: 0.6,
    });
  }, []);

  return (
    <div ref={root} className="mt-16 grid gap-10 lg:mt-24 lg:grid-cols-12 lg:gap-8">
      {/* System map — sticky on large screens, a compact strip on small ones */}
      <div className="lg:col-span-5">
        <div className="sticky top-[calc(var(--header-h)+1.5rem)] z-10 max-lg:-mx-[var(--gutter)] max-lg:border-y max-lg:border-[color:var(--color-line)] max-lg:bg-[color:var(--color-ink)]/85 max-lg:px-[var(--gutter)] max-lg:py-3 max-lg:backdrop-blur-xl">
          <div className="relative mx-auto aspect-[400/280] w-full max-w-[30rem] max-lg:max-w-[22rem]">
            <svg viewBox="0 0 400 280" className="absolute inset-0 h-full w-full" aria-hidden fill="none">
              <g className="max-lg:hidden" stroke="var(--color-line)">
                {CONTOURS.map((d, i) => (
                  <path key={i} d={d} strokeDasharray={i % 2 ? "0" : "2 4"} />
                ))}
                <path d="M0 0H400M0 280H400" strokeOpacity="0.6" />
              </g>
              <path d={ROUTE} stroke="var(--color-line)" strokeWidth="1.2" strokeDasharray="3 6" />
              <path
                data-route
                d={ROUTE}
                stroke="var(--color-cyan)"
                strokeWidth="1.6"
                pathLength={1}
                strokeDasharray="1"
                strokeLinecap="round"
              />
            </svg>

            {stages.map((s, i) => {
              const [x, y] = POINTS[i];
              const on = shown === i;
              const passed = i <= active;
              return (
                <a
                  key={s.index}
                  href={`#stage-${s.index}`}
                  aria-label={`Stage ${s.index}: ${s.title}`}
                  aria-current={on ? "step" : undefined}
                  onPointerEnter={() => setPinned(i)}
                  onPointerLeave={() => setPinned(null)}
                  onFocus={() => setPinned(i)}
                  onBlur={() => setPinned(null)}
                  className="group absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center p-3"
                  style={{ left: `${(x / 400) * 100}%`, top: `${(y / 280) * 100}%` }}
                >
                  <span
                    className={`absolute h-9 w-9 rounded-full border transition-[transform,opacity,border-color] duration-[var(--duration-nav)] ease-[var(--ease-out-expo)] ${
                      on ? "scale-100 border-[color:var(--color-lime)] opacity-100" : "scale-50 border-[color:var(--color-cyan)] opacity-0"
                    }`}
                  />
                  <span
                    className={`relative block h-3 w-3 rotate-45 border transition-colors duration-[var(--duration-hover)] ${
                      on
                        ? "border-[color:var(--color-lime)] bg-[color:var(--color-lime)]"
                        : passed
                          ? "border-[color:var(--color-cyan)] bg-[color:var(--color-cyan)]"
                          : "border-[color:var(--color-fg-3)] bg-[color:var(--color-ink)]"
                    }`}
                  />
                  <span
                    className={`label absolute top-full mt-0.5 whitespace-nowrap transition-colors duration-[var(--duration-hover)] max-lg:hidden ${
                      on ? "text-[color:var(--color-fg)]" : "text-[color:var(--color-fg-3)]"
                    }`}
                  >
                    {s.index} {s.title}
                  </span>
                </a>
              );
            })}
          </div>
          <p className="label mt-1 text-center text-[color:var(--color-fg-2)] lg:hidden" aria-live="polite">
            {stages[shown].index} — {stages[shown].title}
          </p>
        </div>
      </div>

      {/* The stages themselves — always fully readable */}
      <ol data-stages className="lg:col-span-6 lg:col-start-7">
        {stages.map((s, i) => {
          const on = shown === i;
          return (
            <li
              key={s.index}
              id={`stage-${s.index}`}
              data-stage={i}
              onPointerEnter={() => setPinned(i)}
              onPointerLeave={() => setPinned(null)}
              className="group relative scroll-mt-[40vh] border-t border-[color:var(--color-line)] py-[clamp(2.5rem,7vh,4.5rem)] last:border-b"
            >
              <span
                aria-hidden
                className={`absolute -top-px left-0 h-px origin-left bg-[color:var(--color-cyan)] transition-transform duration-700 ease-[var(--ease-out-expo)] ${
                  on ? "w-full scale-x-100" : "w-full scale-x-0"
                }`}
              />
              <div className="flex items-baseline gap-6">
                <span className={`label tabular-nums transition-colors duration-[var(--duration-hover)] ${on ? "text-[color:var(--color-cyan)]" : "text-[color:var(--color-fg-3)]"}`}>
                  Stage {s.index}
                </span>
                <span className="label hidden text-[color:var(--color-fg-3)] sm:inline">{s.annotation}</span>
              </div>
              <h3
                className={`mt-4 text-[length:var(--text-h3)] leading-[var(--text-h3--line-height)] font-medium tracking-[var(--text-h3--letter-spacing)] transition-colors duration-[var(--duration-nav)] ${
                  on ? "text-[color:var(--color-fg)]" : "text-[color:var(--color-fg)]/80"
                }`}
              >
                {s.title}
              </h3>
              <p className="mt-3 max-w-[32rem] text-[1.0625rem] leading-relaxed text-[color:var(--color-fg-2)]">{s.body}</p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
