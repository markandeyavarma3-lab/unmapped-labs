"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Counts every number in a string up from zero the first time it is seen —
 * "8,163" or "11% → 38%" alike. Screen readers and no-JS get the final text.
 */
export function CountUp({ value, duration = 1600, className }: { value: string; duration?: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [t, setT] = useState(1);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        const start = performance.now();
        const tick = (now: number) => {
          const k = Math.min(1, (now - start) / duration);
          setT(1 - Math.pow(1 - k, 4));
          if (k < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    // Start from zero only once we know we'll animate.
    setT(0);
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [duration]);

  const shown =
    t >= 1
      ? value
      : value.replace(/\d[\d,]*(\.\d+)?/g, (m) => {
          const decimals = m.includes(".") ? m.split(".")[1].length : 0;
          const n = parseFloat(m.replace(/,/g, "")) * t;
          const s = n.toFixed(decimals);
          return m.includes(",") ? Number(s).toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) : s;
        });

  return (
    <span ref={ref} className={className}>
      <span aria-hidden className="tabular-nums">
        {shown}
      </span>
      <span className="sr-only">{value}</span>
    </span>
  );
}
