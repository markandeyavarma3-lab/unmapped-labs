"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { setWorldPaused, world } from "./world-store";
import type { Tier } from "./Scene";

const World = dynamic(() => import("./World"), { ssr: false });

type Mode = { kind: "pending" } | { kind: "static" } | { kind: "webgl"; tier: Tier; introDelay: number };

function detectMode(): Mode {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const nav = navigator as Navigator & { connection?: { saveData?: boolean }; deviceMemory?: number };
  if (reduce || nav.connection?.saveData) return { kind: "static" };

  try {
    const c = document.createElement("canvas");
    if (!(c.getContext("webgl2") || c.getContext("webgl"))) return { kind: "static" };
  } catch {
    return { kind: "static" };
  }

  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const weak = (nav.hardwareConcurrency ?? 8) <= 4 || (nav.deviceMemory ?? 8) <= 4;
  const tier: Tier = coarse || weak || window.innerWidth < 768 ? "low" : "high";
  const introDelay = document.documentElement.dataset.intro === "on" ? 1.6 : 0.15;
  return { kind: "webgl", tier, introDelay };
}

/**
 * Maps page scroll onto the world's chapter index. Each `[data-chapter]`
 * section anchors its value at the moment its top crosses mid-viewport;
 * scroll positions in between interpolate linearly.
 */
function useChapterScroll(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    gsap.registerPlugin(ScrollTrigger);

    let anchors: { y: number; c: number }[] = [];
    const measure = () => {
      const half = window.innerHeight * 0.5;
      anchors = Array.from(document.querySelectorAll<HTMLElement>("[data-chapter]"))
        .map((el) => ({
          y: Math.max(0, el.getBoundingClientRect().top + window.scrollY - half),
          c: Number(el.dataset.chapter),
        }))
        .sort((a, b) => a.y - b.y);
      if (anchors[0]?.c === 0) anchors[0].y = 0;
    };
    const update = (y: number) => {
      if (!anchors.length) return;
      if (y <= anchors[0].y) return void (world.chapter = anchors[0].c);
      for (let i = 0; i < anchors.length - 1; i++) {
        const a = anchors[i];
        const b = anchors[i + 1];
        if (y <= b.y) return void (world.chapter = a.c + ((y - a.y) / Math.max(1, b.y - a.y)) * (b.c - a.c));
      }
      world.chapter = anchors[anchors.length - 1].c;
    };

    const master = ScrollTrigger.create({
      start: 0,
      end: "max",
      onRefresh: (self) => {
        measure();
        update(self.scroll());
      },
      onUpdate: (self) => update(self.scroll()),
    });

    // Opaque editorial sections hide the world: stop rendering beneath them.
    const covering = new Set<Element>();
    const covers = Array.from(document.querySelectorAll<HTMLElement>("[data-covers-world]")).map((el) =>
      ScrollTrigger.create({
        trigger: el,
        start: "top top",
        end: "bottom bottom",
        onToggle: (self) => {
          if (self.isActive) covering.add(el);
          else covering.delete(el);
          setWorldPaused(covering.size > 0);
        },
      }),
    );

    measure();
    update(window.scrollY);
    return () => {
      master.kill();
      covers.forEach((t) => t.kill());
      setWorldPaused(false);
    };
  }, [enabled]);
}

export function WorldLayer() {
  const [mode, setMode] = useState<Mode>({ kind: "pending" });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Defer WebGL until the main thread is idle so text and CTAs win first paint.
    const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 200));
    const cancel = window.cancelIdleCallback ?? window.clearTimeout;
    const id = idle(() => setMode(detectMode()), { timeout: 900 });
    return () => cancel(id as number);
  }, []);

  useChapterScroll(mode.kind === "webgl");

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[var(--z-world)]">
      {/* Static map — visible until WebGL is drawing, and permanently when it can't or shouldn't. */}
      <div
        className="absolute inset-0 bg-[url(/terrain-fallback.svg)] bg-cover bg-center opacity-60 transition-opacity duration-[1200ms] ease-[var(--ease-out-quart)] max-md:bg-[position:70%_50%]"
        style={{ opacity: ready ? 0 : undefined }}
      />
      {mode.kind === "webgl" && (
        <div
          className="absolute inset-0 transition-opacity duration-[1400ms] ease-[var(--ease-out-quart)]"
          style={{ opacity: ready ? 1 : 0 }}
        >
          <World tier={mode.tier} introDelay={mode.introDelay} onReady={() => setReady(true)} />
        </div>
      )}
      {/* Vignette keeps text legible at the edges of every composition. */}
      <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_70%_40%,transparent_35%,rgba(8,11,14,0.75)_100%)]" />
    </div>
  );
}
