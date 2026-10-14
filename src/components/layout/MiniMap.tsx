"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CAMERA_KEYS, CHAPTER, LAST_CHAPTER, SURVEY_DISCS, UNMAPPED_HOLD, discRadius, mappedPercent } from "@/components/three/landmarks";
import { TITLE_CENTER } from "@/components/three/title-glyphs";
import { world } from "@/components/three/world-store";
import { MINIMAP, mapScale, toMap } from "@/lib/minimap";

/** Chapters worth a pin, with the section each one jumps to. */
const STOPS: { c: number; id: string; label: string }[] = [
  { c: CHAPTER.title, id: "top", label: "Unmapped Labs" },
  { c: CHAPTER.hero, id: "explore", label: "Explore" },
  { c: CHAPTER.intro, id: "intro", label: "Beneath the surface" },
  { c: CHAPTER.approach, id: "approach", label: "Approach" },
  { c: CHAPTER.territoryA, id: "focus-agriculture", label: "A · Agriculture" },
  { c: CHAPTER.territoryB, id: "focus-logistics", label: "B · Logistics" },
  { c: CHAPTER.territoryC, id: "focus-healthcare", label: "C · Healthcare" },
  { c: CHAPTER.territoryD, id: "focus-energy", label: "D · Energy" },
  { c: CHAPTER.territoryE, id: "focus-open", label: "E · Uncharted" },
  { c: CHAPTER.notes, id: "notes", label: "Field notes" },
  { c: CHAPTER.philosophy, id: "philosophy", label: "Philosophy" },
  { c: CHAPTER.about, id: "about", label: "About" },
  { c: CHAPTER.contact, id: "contact", label: "Contact" },
];

/** Ground point for a chapter: the title for the opening, else the camera's target. */
const stopPoint = (c: number): [number, number] => {
  if (c <= CHAPTER.tagline) return toMap(TITLE_CENTER.x, TITLE_CENTER.z);
  const t = CAMERA_KEYS[c].target;
  return toMap(t[0], t[2]);
};
const STOP_POINTS = STOPS.map((s) => stopPoint(s.c));
const ROUTE = "M" + STOP_POINTS.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join("L");

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
function positionAt(chapter: number): [number, number] {
  const c = Math.min(LAST_CHAPTER, Math.max(0, chapter));
  const i = Math.min(Math.floor(c), LAST_CHAPTER - 1);
  const a = stopPoint(i);
  const b = stopPoint(i + 1);
  const t = c - i;
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
}

export function MiniMap() {
  const uid = useId().replace(/:/g, "");
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const [pct, setPct] = useState(0);
  const [stop, setStop] = useState(0);
  const svgRef = useRef<SVGSVGElement>(null);
  const markerRef = useRef<SVGGElement>(null);
  const routeRef = useRef<SVGPathElement>(null);
  const discRefs = useRef<(SVGCircleElement | null)[]>([]);
  const openRef = useRef(open);
  useEffect(() => {
    openRef.current = open;
  }, [open]);

  // Follow the journey: damp toward the live chapter, write SVG attributes directly.
  useEffect(() => {
    let c = world.chapter;
    let raf = 0;
    let lastPct = -1;
    let lastStop = -1;
    let lastVisible: boolean | null = null;
    const loop = () => {
      c += (world.chapter - c) * 0.12;
      const [mx, my] = positionAt(c);
      markerRef.current?.setAttribute("transform", `translate(${mx.toFixed(1)} ${my.toFixed(1)})`);
      SURVEY_DISCS.forEach((d, i) => discRefs.current[i]?.setAttribute("r", (discRadius(d, c) * mapScale).toFixed(1)));
      routeRef.current?.style.setProperty("stroke-dashoffset", String(1 - Math.min(1, c / LAST_CHAPTER)));
      if (svgRef.current && !openRef.current) {
        // Collapsed: a moving window centred on "you are here".
        const w = 112, h = 70;
        svgRef.current.setAttribute("viewBox", `${(mx - w / 2).toFixed(1)} ${(my - h * 0.58).toFixed(1)} ${w} ${h}`);
      }
      const p = mappedPercent(c);
      if (p !== lastPct) setPct((lastPct = p));
      let s = 0;
      STOPS.forEach((st, k) => {
        if (c >= st.c - 0.5) s = k;
      });
      if (s !== lastStop) setStop((lastStop = s));
      // Appears once the opening is done; steps aside at Contact, where the journey ends.
      const v = world.chapter > 1.4 && world.chapter < 12.55;
      if (v !== lastVisible) setVisible((lastVisible = v));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    if (open && svgRef.current) svgRef.current.setAttribute("viewBox", `0 0 ${MINIMAP.W} ${MINIMAP.H}`);
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const [hx, hy] = toMap(UNMAPPED_HOLD.x, UNMAPPED_HOLD.z);

  return (
    <nav
      aria-label="Survey map of this page"
      data-open={open || undefined}
      className={`minimap fixed bottom-4 left-4 z-40 transition-[opacity,transform] duration-700 ease-[var(--ease-out-expo)] sm:right-5 sm:bottom-5 sm:left-auto ${
        visible || open ? "opacity-100" : "pointer-events-none translate-y-3 opacity-0"
      }`}
    >
      {/* Phones, collapsed: a pill. */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`minimap-pill label flex items-center gap-2 border border-[color:var(--color-line)] bg-[color:var(--color-ink)]/85 px-3 py-2.5 text-[color:var(--color-fg)] backdrop-blur-md sm:hidden ${open ? "hidden" : ""}`}
        aria-expanded={open}
      >
        <span aria-hidden className="h-1.5 w-1.5 rotate-45 bg-[color:var(--color-cyan)]" />
        <span className="tabular-nums">{pct}% mapped</span>
      </button>

      <div
        className={`minimap-panel border border-[color:var(--color-line)] bg-[color:var(--color-ink)]/88 backdrop-blur-md ${
          open ? "max-sm:fixed max-sm:inset-x-3 max-sm:bottom-3" : "max-sm:hidden"
        }`}
      >
        <div className="flex items-center justify-between gap-4 border-b border-[color:var(--color-line)] px-3 py-2">
          <span className="label text-[color:var(--color-fg-3)]">Survey</span>
          <span className="label tabular-nums text-[color:var(--color-cyan)]" aria-live="off">
            {pct}% mapped
          </span>
        </div>

        <div className="minimap-view relative overflow-hidden">
          <svg ref={svgRef} viewBox={`0 0 ${MINIMAP.W} ${MINIMAP.H}`} preserveAspectRatio="xMidYMid slice" className="block h-full w-full">
            <defs>
              <filter id={`soft-${uid}`} x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="6" />
              </filter>
              <mask id={`fog-${uid}`}>
                <rect x="-200" y="-200" width={MINIMAP.W + 400} height={MINIMAP.H + 400} fill="white" />
                <g filter={`url(#soft-${uid})`}>
                  {SURVEY_DISCS.map((d, i) => {
                    const [x, y] = toMap(d.x, d.z);
                    return (
                      <circle
                        key={i}
                        ref={(el) => {
                          discRefs.current[i] = el;
                        }}
                        cx={x}
                        cy={y}
                        r={0}
                        fill="black"
                      />
                    );
                  })}
                </g>
              </mask>
            </defs>

            <image href="/minimap.svg" x="0" y="0" width={MINIMAP.W} height={MINIMAP.H} />
            {/* Fog over everything not yet surveyed (plus the corner that never is). */}
            <rect x="-200" y="-200" width={MINIMAP.W + 400} height={MINIMAP.H + 400} fill="#0b1015" fillOpacity="0.84" mask={`url(#fog-${uid})`} />
            <circle cx={hx} cy={hy} r={UNMAPPED_HOLD.r * mapScale * 0.8} fill="#0b1015" fillOpacity="0.9" filter={`url(#soft-${uid})`} />

            {/* Route: dashed ahead, solid where you've been. */}
            <path d={ROUTE} fill="none" stroke="#65e4e8" strokeOpacity="0.28" strokeWidth="1.2" strokeDasharray="2 4" />
            <path ref={routeRef} d={ROUTE} fill="none" stroke="#65e4e8" strokeWidth="1.6" pathLength={1} strokeDasharray="1" strokeLinecap="round" />

            {/* Pins */}
            {STOPS.map((s, k) => {
              const [x, y] = STOP_POINTS[k];
              const state = k < stop ? "passed" : k === stop ? "current" : "ahead";
              return (
                <a key={s.id} href={`#${s.id}`} aria-label={`Go to ${s.label}`} onClick={() => setOpen(false)} className="minimap-pin" data-state={state}>
                  <circle cx={x} cy={y} r={9} fill="transparent" />
                  <rect x={x - 3} y={y - 3} width={6} height={6} transform={`rotate(45 ${x} ${y})`} />
                  {open && (
                    <text x={x + 9} y={y + 3.5} className="minimap-pin-label">
                      {s.label}
                    </text>
                  )}
                </a>
              );
            })}
            <UnknownMark x={hx} y={hy} />

            {/* You are here */}
            <g ref={markerRef} aria-hidden>
              <circle r="10" fill="none" stroke="#c7f36b" strokeOpacity="0.5" className="minimap-ping" />
              <circle r="3.4" fill="#c7f36b" />
            </g>
          </svg>
          <div aria-hidden className="pointer-events-none absolute inset-0 shadow-[inset_0_0_24px_rgba(8,11,14,0.9)]" />
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-[color:var(--color-line)] px-3 py-2">
          <span className="label truncate text-[color:var(--color-fg)]">
            <span className="tabular-nums text-[color:var(--color-fg-3)]">{String(stop).padStart(2, "0")}</span> {STOPS[stop].label}
          </span>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            className="label shrink-0 text-[color:var(--color-fg-2)] transition-colors hover:text-[color:var(--color-fg)]"
          >
            {open ? "Close ✕" : "Expand ⤢"}
          </button>
        </div>
      </div>
    </nav>
  );
}

/** A small "?" where the map deliberately stays blank. */
function UnknownMark({ x, y }: { x: number; y: number }) {
  return (
    <g aria-hidden className="minimap-unknown">
      <text x={x} y={y + 4} textAnchor="middle">
        ?
      </text>
    </g>
  );
}
