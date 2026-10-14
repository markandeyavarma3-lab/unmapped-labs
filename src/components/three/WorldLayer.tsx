"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { onScroll } from "@/components/motion/scroll-engine";
import { nodeLabel, setWorldPaused, world } from "./world-store";
import { setWorldMode, setWorldReady } from "./views";
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
  const introDelay = document.documentElement.dataset.intro === "on" ? 1.9 : 0.15;
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

    let anchors: { y: number; c: number }[] = [];

    const measure = () => {
      const half = window.innerHeight * 0.5;
      const y0 = window.scrollY;
      anchors = Array.from(document.querySelectorAll<HTMLElement>("[data-chapter]"))
        .map((el) => ({ y: Math.max(0, el.getBoundingClientRect().top + y0 - half), c: Number(el.dataset.chapter) }))
        .sort((a, b) => a.y - b.y);
      if (anchors[0]?.c === 0) anchors[0].y = 0;
    };

    const update = (y: number) => {
      if (anchors.length) {
        let c = anchors[anchors.length - 1].c;
        if (y <= anchors[0].y) c = anchors[0].c;
        else
          for (let i = 0; i < anchors.length - 1; i++) {
            const a = anchors[i];
            const b = anchors[i + 1];
            if (y <= b.y) {
              c = a.c + ((y - a.y) / Math.max(1, b.y - a.y)) * (b.c - a.c);
              break;
            }
          }
        world.chapter = c;
      }
    };

    const dispose = onScroll(update, measure);
    return () => {
      dispose();
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
    const id = idle(
      () => {
        const m = detectMode();
        setMode(m);
        setWorldMode(m.kind);
      },
      { timeout: 900 },
    );
    return () => cancel(id as number);
  }, []);

  // Always on: the mini-map follows the journey even without WebGL.
  useChapterScroll(true);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[var(--z-world)] overflow-hidden [contain:strict]">
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
          <World tier={mode.tier} introDelay={mode.introDelay} onReady={() => {
              setReady(true);
              setWorldReady(true);
            }} />
        </div>
      )}
      {/* Survey-node label, positioned by the scene when a marker is active. */}
      <div
        ref={(el) => {
          nodeLabel.el = el;
        }}
        data-on="false"
        className="absolute top-0 left-0 z-[1] transition-opacity duration-300 data-[on=false]:opacity-0"
      >
        <div className="flex -translate-y-1/2 items-center gap-2 border border-[color:var(--color-line)] bg-[color:var(--color-ink)]/92 px-2.5 py-1.5 whitespace-nowrap ml-4">
          <span className="h-1 w-1 bg-[color:var(--color-lime)]" />
          <span data-name className="label text-[color:var(--color-fg)]" />
          <span data-coords className="label text-[color:var(--color-fg-3)]" />
        </div>
      </div>
      {/* Vignette keeps text legible at the edges of every composition. */}
      <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_70%_40%,transparent_35%,rgba(8,11,14,0.75)_100%)]" />
    </div>
  );
}
