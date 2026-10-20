"use client";

import { useEffect, useRef, useState } from "react";
import type { Stage } from "@/content/site-content";
import { StoryDrawing } from "./StoryDrawing";

/**
 * "How we work" as a pinned story: the section holds still while the page
 * scrolls, stepping through the five stages and building up the drawing.
 * On phones and with reduced motion it is a plain list with the full drawing.
 */
export function PinnedStory({ stages }: { stages: Stage[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(stages.length - 1);
  const [pinned, setPinned] = useState(false);

  useEffect(() => {
    const wide = window.matchMedia("(min-width: 900px)");
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)");
    let raf = 0;
    const update = () => {
      raf = 0;
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const p = Math.min(0.999, Math.max(0, -r.top / Math.max(1, r.height - window.innerHeight)));
      setActive(Math.floor(p * stages.length));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    const setup = () => {
      const pin = wide.matches && !calm.matches;
      setPinned(pin);
      window.removeEventListener("scroll", onScroll);
      if (pin) {
        window.addEventListener("scroll", onScroll, { passive: true });
        update();
      } else setActive(stages.length - 1);
    };
    setup();
    wide.addEventListener("change", setup);
    return () => {
      wide.removeEventListener("change", setup);
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [stages.length]);

  return (
    <div ref={ref} className="story" style={{ ["--n" as string]: stages.length }}>
      <div className="story-sticky">
        <div className="container-site grid w-full items-center gap-10 lg:grid-cols-12">
          <ol className="flex flex-col lg:col-span-5">
            {stages.map((s, i) => {
              const isOn = !pinned || i === active;
              return (
                <li key={s.index} aria-current={pinned && i === active ? "step" : undefined} className="border-t border-[color:var(--color-line)] py-4 last:border-b">
                  <div className="flex items-baseline gap-5">
                    <span className={`label tabular-nums transition-colors ${pinned && i <= active ? "text-[color:var(--color-accent)]" : "text-[color:var(--color-fg-3)]"}`}>{s.index}</span>
                    <div>
                      <h3 className={`display text-[1.6rem] transition-colors duration-300 sm:text-[2rem] ${isOn ? "text-[color:var(--color-fg)]" : "text-[color:var(--color-fg-3)]"}`}>{s.title}</h3>
                      <div className={`grid transition-[grid-template-rows,opacity] duration-500 ${isOn ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                        <p className="overflow-hidden text-[15px] leading-relaxed text-[color:var(--color-fg-2)]">
                          <span className="block pt-2">{s.body}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
          <div className="lg:col-span-6 lg:col-start-7">
            <div className="card bp-grid p-3 sm:p-5">
              <StoryDrawing stage={active} />
            </div>
            {pinned && (
              <div aria-hidden className="mt-4 flex gap-1.5">
                {stages.map((s, i) => (
                  <span key={s.index} className={`h-[3px] flex-1 transition-colors duration-500 ${i <= active ? "bg-[color:var(--color-accent)]" : "bg-[color:var(--color-line)]"}`} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
