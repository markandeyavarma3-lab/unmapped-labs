"use client";

import { createContext, useCallback, useContext, useEffect, useRef } from "react";
import Lenis from "lenis";

/** Stable getter — Lenis is created after mount and lives outside React state. */
const LenisContext = createContext<() => Lenis | null>(() => null);
export const useLenis = () => useContext(LenisContext);

/** The live Lenis instance, for code outside React (the 3D world's hotspots). */
let current: Lenis | null = null;

/** Smooth-scrolls the page to an absolute y (CSS px). */
export function scrollToY(y: number) {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (current && !reduce) current.scrollTo(y, { duration: 1.8, force: true, easing: (t) => 1 - Math.pow(1 - t, 4) });
  else window.scrollTo({ top: y });
}

/** Scrolls to an in-page hash and hands keyboard focus to the target. */
export function scrollToHash(hash: string, lenis: Lenis | null) {
  const target = hash === "#top" ? document.body : document.querySelector<HTMLElement>(hash);
  if (!target) return false;
  const focus = () => {
    if (target === document.body) return;
    if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
    target.focus({ preventScroll: true });
  };
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (lenis && !reduce) {
    lenis.scrollTo(target === document.body ? 0 : target, {
      duration: 1.4,
      force: true,
      easing: (t) => 1 - Math.pow(1 - t, 4),
      onComplete: focus,
    });
  } else {
    if (target === document.body) window.scrollTo({ top: 0 });
    else target.scrollIntoView({ block: "start" });
    focus();
  }
  history.replaceState(null, "", hash === "#top" ? location.pathname : hash);
  return true;
}

export function SmoothScroll({ children }: { children: React.ReactNode }) {
  const lenisRef = useRef<Lenis | null>(null);
  const getLenis = useCallback(() => lenisRef.current, []);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduce.matches) return;

    const instance = new Lenis({
      lerp: 0.085,
      wheelMultiplier: 0.95,
      // Touch keeps the platform's native momentum — it already feels right.
      syncTouch: false,
      autoRaf: true,
    });
    lenisRef.current = instance;
    current = instance;

    return () => {
      instance.destroy();
      lenisRef.current = null;
      current = null;
    };
  }, []);

  // Delegate every in-page "#hash" link on the page.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element).closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a) return;
      const url = new URL(a.href, location.href);
      if (url.pathname !== location.pathname || !url.hash) return;
      if (scrollToHash(url.hash, lenisRef.current)) e.preventDefault();
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return <LenisContext.Provider value={getLenis}>{children}</LenisContext.Provider>;
}
