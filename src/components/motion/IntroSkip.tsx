"use client";

import { useEffect, useRef } from "react";

export function IntroSkip() {
  const ref = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const root = document.documentElement;
    if (root.dataset.intro !== "on") return;
    const overlay = ref.current?.closest<HTMLElement>(".intro");

    const skip = () => {
      overlay?.classList.add("intro-skipped");
      root.style.setProperty("--intro-delay", "0ms");
      cleanup();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && skip();
    const cleanup = () => {
      window.removeEventListener("keydown", onKey);
      overlay?.removeEventListener("pointerdown", skip);
    };
    window.addEventListener("keydown", onKey);
    overlay?.addEventListener("pointerdown", skip);
    const done = window.setTimeout(cleanup, 2600);
    return () => {
      window.clearTimeout(done);
      cleanup();
    };
  }, []);

  return (
    <button
      ref={ref}
      type="button"
      className="label absolute right-[var(--gutter)] bottom-8 px-3 py-3 text-[color:var(--color-fg-2)] transition-colors duration-[var(--duration-hover)] hover:text-[color:var(--color-fg)]"
    >
      Skip intro
    </button>
  );
}
