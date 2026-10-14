"use client";

import { createContext, useCallback, useContext, useEffect, useRef } from "react";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/** Stable getter — Lenis is created after mount and lives outside React state. */
const LenisContext = createContext<() => Lenis | null>(() => null);
export const useLenis = () => useContext(LenisContext);

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
    gsap.registerPlugin(ScrollTrigger);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduce.matches) return;

    const instance = new Lenis({
      lerp: 0.085,
      wheelMultiplier: 0.95,
      // Touch keeps the platform's native momentum — it already feels right.
      syncTouch: false,
    });
    instance.on("scroll", ScrollTrigger.update);
    const tick = (time: number) => instance.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    lenisRef.current = instance;

    return () => {
      gsap.ticker.remove(tick);
      instance.destroy();
      lenisRef.current = null;
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
