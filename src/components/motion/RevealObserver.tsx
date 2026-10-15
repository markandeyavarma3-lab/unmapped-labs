"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const SELECTOR = ".reveal, .reveal-mask, .reveal-words, .reveal-card, [data-count]";

/**
 * Counts a figure up to its real value, keeping its format ("8,163", "54.8%").
 * The real value is server-rendered; this only animates toward it.
 */
function countUp(el: HTMLElement) {
  const text = el.textContent ?? "";
  const m = text.match(/^([^0-9]*)([0-9][0-9,]*\.?[0-9]*)(.*)$/);
  if (!m || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const [, pre, num, post] = m;
  const target = Number(num.replace(/,/g, ""));
  const decimals = num.includes(".") ? num.split(".")[1].length : 0;
  const comma = num.includes(",");
  const fmt = (v: number) => {
    const s = v.toFixed(decimals);
    return comma ? Number(s).toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) : s;
  };
  const start = performance.now();
  const dur = 1400 + Math.min(800, String(Math.round(target)).length * 120);
  el.style.minWidth = `${el.offsetWidth}px`;
  const step = (now: number) => {
    const t = Math.min(1, (now - start) / dur);
    const e = 1 - Math.pow(1 - t, 4);
    el.textContent = `${pre}${fmt(target * e)}${post}`;
    if (t < 1) requestAnimationFrame(step);
    else el.textContent = text;
  };
  requestAnimationFrame(step);
}

/**
 * One IntersectionObserver for every revealing element: `.reveal`,
 * `.reveal-mask`, `.reveal-words` (headings, word by word), `.reveal-card`
 * (cards slide and unfold) and `[data-count]` (figures count up).
 * Server components opt in with a class name — no client wrapper needed.
 */
export function RevealObserver() {
  const pathname = usePathname();

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const el = e.target as HTMLElement;
          el.dataset.in = "";
          if (el.hasAttribute("data-count")) countUp(el);
          io.unobserve(el);
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.01 },
    );
    const observe = () =>
      document.querySelectorAll<HTMLElement>(SELECTOR).forEach((el) => {
        if (!("in" in el.dataset)) io.observe(el);
      });
    observe();
    const mo = new MutationObserver(observe);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, [pathname]);

  return null;
}
