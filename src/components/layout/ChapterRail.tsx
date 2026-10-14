"use client";

import { useEffect, useRef, useState } from "react";
import { onScroll } from "@/components/motion/scroll-engine";

const CHAPTERS = [
  { id: "top", label: "Explore" },
  { id: "intro", label: "Beneath" },
  { id: "approach", label: "Approach" },
  { id: "focus", label: "Focus areas" },
  { id: "notes", label: "Field notes" },
  { id: "philosophy", label: "Philosophy" },
  { id: "about", label: "About" },
  { id: "contact", label: "Contact" },
];

/**
 * A slim journey rail on wide screens: where you are, how far you've come,
 * and a jump link to every chapter. Flips tone over the paper sections.
 */
export function ChapterRail() {
  const fill = useRef<HTMLSpanElement>(null);
  const railRef = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);
  const [paper, setPaper] = useState(false);

  useEffect(() => {
    let tops: number[] = [];
    let papers: { top: number; bottom: number }[] = [];
    let max = 1;
    let current = -1;
    let onPaper = false;
    const measure = () => {
      const y0 = window.scrollY;
      tops = CHAPTERS.map(({ id }) => (document.getElementById(id)?.getBoundingClientRect().top ?? 0) + y0);
      papers = Array.from(document.querySelectorAll<HTMLElement>("main .surface-paper")).map((el) => {
        const r = el.getBoundingClientRect();
        return { top: r.top + y0, bottom: r.bottom + y0 };
      });
      max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    };
    const update = (y: number, vh: number) => {
      if (fill.current) fill.current.style.transform = `scaleY(${Math.min(1, y / max)})`;
      const probe = y + vh * 0.45;
      let i = 0;
      for (let k = 0; k < tops.length; k++) if (tops[k] <= probe) i = k;
      if (i !== current) {
        current = i;
        setActive(i);
      }
      const mid = y + vh / 2;
      const p = papers.some((r) => r.top <= mid && r.bottom >= mid);
      if (p !== onPaper) {
        onPaper = p;
        setPaper(p);
      }
    };
    return onScroll(update, measure);
  }, []);

  return (
    <nav
      ref={railRef}
      aria-label="Page chapters"
      data-tone={paper ? "paper" : "ink"}
      className="chapter-rail fixed top-1/2 left-5 z-40 hidden -translate-y-1/2 xl:block"
    >
      <span aria-hidden className="rail-track absolute top-1 bottom-1 left-[5px] w-px" />
      <span ref={fill} aria-hidden className="rail-fill absolute top-1 bottom-1 left-[5px] w-px origin-top scale-y-0" />
      <ol className="relative flex flex-col gap-[18px]">
        {CHAPTERS.map((c, i) => (
          <li key={c.id}>
            <a
              href={`#${c.id}`}
              aria-current={active === i ? "location" : undefined}
              className="rail-link group flex items-center gap-3"
              data-state={i < active ? "passed" : i === active ? "current" : "ahead"}
            >
              <span aria-hidden className="rail-dot block h-[11px] w-[11px] rotate-45 border" />
              <span className="rail-label label whitespace-nowrap">
                <span className="tabular-nums opacity-60">{String(i).padStart(2, "0")}</span> {c.label}
              </span>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
