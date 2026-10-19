"use client";

import { useEffect } from "react";
import Lenis from "lenis";

/**
 * One small engine for the whole site's motion, mounted once in the layout.
 *
 * - Smooth wheel scrolling (Lenis) — touch scrolling stays native.
 * - Reveals: elements with [data-reveal] or [data-draw] get [data-in] the first
 *   time they enter the viewport. CSS does the animating.
 * - Scroll progress: elements with [data-progress] get a `--p` custom property,
 *   0 → 1. "view" (default) runs while the element crosses the viewport;
 *   "pin" runs while a tall section scrolls past a sticky child.
 *
 * With reduced motion, none of this runs and every element is simply shown.
 */
export function MotionRoot() {
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    const lenis = new Lenis({ autoRaf: true, anchors: { offset: -80 }, lerp: 0.12 });
    document.documentElement.classList.add("motion");

    // Reveals
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          e.target.setAttribute("data-in", "");
          io.unobserve(e.target);
        }
      },
      { rootMargin: "0px 0px -12% 0px" },
    );

    // Scroll progress
    let tracked: HTMLElement[] = [];
    let frame = 0;
    const update = () => {
      frame = 0;
      const vh = window.innerHeight;
      for (const el of tracked) {
        const r = el.getBoundingClientRect();
        if (r.bottom < -vh || r.top > vh * 2) continue;
        const p = el.dataset.progress === "pin" ? -r.top / Math.max(1, r.height - vh) : (vh - r.top) / (vh + r.height);
        el.style.setProperty("--p", Math.min(1, Math.max(0, p)).toFixed(4));
      }
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    const scan = () => {
      document.querySelectorAll("[data-reveal]:not([data-in]), [data-draw]:not([data-in])").forEach((el) => io.observe(el));
      tracked = Array.from(document.querySelectorAll<HTMLElement>("[data-progress]"));
      schedule();
    };
    // Wait for the page to load (and hydrate) before touching its elements.
    let pending = 0;
    let started = false;
    const begin = () => {
      if (started) return;
      started = true;
      pending = requestAnimationFrame(() => {
        pending = 0;
        scan();
        mo.observe(document.body, { childList: true, subtree: true });
      });
    };
    if (document.readyState === "complete") begin();
    else window.addEventListener("load", begin, { once: true });

    // New pages and late-rendered sections bring new elements.
    const mo = new MutationObserver(() => {
      if (pending) return;
      pending = requestAnimationFrame(() => {
        pending = 0;
        scan();
      });
    });

    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.removeEventListener("load", begin);
      lenis.destroy();
      document.documentElement.classList.remove("motion");
      io.disconnect();
      mo.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      cancelAnimationFrame(frame);
      cancelAnimationFrame(pending);
    };
  }, []);

  return null;
}
