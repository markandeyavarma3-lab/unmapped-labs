"use client";

import { useEffect, useRef, useState } from "react";
import { world } from "@/components/three/world-store";
import { islandState } from "@/components/three/views";
import { story, STORY_IDS, beatOf } from "@/components/three/story";
import { CHAPTER } from "@/components/three/chapters";

/**
 * Optional sound, off by default. Everything is generated (no files): wind
 * and the odd bird over the hills, a soft hum in the city, and a quiet tick
 * whenever a step or a story beat changes. The choice is remembered.
 */

const KEY = "ul:sound";
const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

type Engine = { ctx: AudioContext; wind: GainNode; city: GainNode; master: GainNode };

function createEngine(): Engine {
  const ctx = new AudioContext();
  const master = ctx.createGain();
  master.gain.value = 0;
  master.connect(ctx.destination);

  // A couple of seconds of noise, looped, feeds both beds.
  const len = ctx.sampleRate * 3;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) {
    // gently brown-ish noise
    last = (last + (Math.random() * 2 - 1) * 0.06) * 0.985;
    data[i] = last * 3;
  }
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.loop = true;

  const windFilter = ctx.createBiquadFilter();
  windFilter.type = "bandpass";
  windFilter.frequency.value = 420;
  windFilter.Q.value = 0.7;
  const wind = ctx.createGain();
  wind.gain.value = 0;
  // the wind rises and falls
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.09;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 180;
  lfo.connect(lfoGain).connect(windFilter.frequency);
  src.connect(windFilter).connect(wind).connect(master);

  const cityFilter = ctx.createBiquadFilter();
  cityFilter.type = "lowpass";
  cityFilter.frequency.value = 240;
  const city = ctx.createGain();
  city.gain.value = 0;
  src.connect(cityFilter).connect(city).connect(master);

  src.start();
  lfo.start();
  return { ctx, wind, city, master };
}

function blip(e: Engine, from: number, to: number, dur: number, vol: number, type: OscillatorType = "sine") {
  const t = e.ctx.currentTime;
  const o = e.ctx.createOscillator();
  const g = e.ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(from, t);
  o.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(e.master);
  o.start(t);
  o.stop(t + dur + 0.05);
}

export function SoundToggle() {
  const [on, setOn] = useState(false);
  const engine = useRef<Engine | null>(null);

  // Remembered "on": resume at the first interaction (browsers need a gesture to start audio).
  useEffect(() => {
    let wanted = false;
    try {
      wanted = localStorage.getItem(KEY) === "1";
    } catch {}
    if (!wanted) return;
    const start = () => setOn(true);
    window.addEventListener("pointerdown", start, { once: true });
    window.addEventListener("keydown", start, { once: true });
    return () => {
      window.removeEventListener("pointerdown", start);
      window.removeEventListener("keydown", start);
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, on ? "1" : "0");
    } catch {}
    if (!on) {
      const e = engine.current;
      if (e) e.master.gain.setTargetAtTime(0, e.ctx.currentTime, 0.3);
      return;
    }
    const e = (engine.current ??= createEngine());
    e.ctx.resume();
    e.master.gain.setTargetAtTime(1, e.ctx.currentTime, 0.5);

    let raf = 0;
    let stage = Math.round(islandState.progress);
    const beats = Object.fromEntries(STORY_IDS.map((id) => [id, beatOf(story[id])]));
    let nextBird = 0;
    const loop = () => {
      const c = world.chapter;
      const hills = 1 - smooth(-0.7, 0.1, c) + smooth(CHAPTER.epilogue - 0.7, CHAPTER.epilogue, c);
      const now = e.ctx.currentTime;
      e.wind.gain.setTargetAtTime(0.16 * hills + 0.03, now, 0.6);
      e.city.gain.setTargetAtTime(0.11 * (1 - hills), now, 0.6);
      if (hills > 0.4 && now > nextBird) {
        const f = 2600 + Math.random() * 1400;
        blip(e, f, f * 1.35, 0.09, 0.025);
        setTimeout(() => blip(e, f * 1.1, f * 0.9, 0.08, 0.02), 110);
        nextBird = now + 2 + Math.random() * 5;
      }
      // a chime when a process step starts; a tick on each story beat
      const s = Math.round(islandState.progress);
      if (s !== stage) {
        stage = s;
        blip(e, 660, 990, 0.28, 0.05, "triangle");
      }
      for (const id of STORY_IDS) {
        const b = beatOf(story[id]);
        if (b !== beats[id]) {
          beats[id] = b;
          if (story[id] > 0.02 && story[id] < 0.99) blip(e, 880, 1320, 0.07, 0.035);
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [on]);

  useEffect(() => () => void engine.current?.ctx.close(), []);

  return (
    <button
      type="button"
      onClick={() => setOn((v) => !v)}
      aria-pressed={on}
      aria-label={on ? "Turn sound off" : "Turn sound on"}
      className="label fixed top-[calc(var(--header-h)+0.75rem)] right-[var(--gutter)] z-[var(--z-header)] max-lg:top-auto max-lg:bottom-[calc(env(safe-area-inset-bottom)+1rem)] max-lg:right-auto max-lg:left-[var(--gutter)] max-lg:hidden flex items-center gap-2.5 rounded-full border border-[color:var(--color-line)] bg-[color:var(--color-ink-2)]/92 px-3.5 py-2 text-[color:var(--color-fg-2)] shadow-[0_10px_30px_-16px_rgba(80,54,24,0.6)] transition-colors hover:text-[color:var(--color-fg)] motion-reduce:hidden"
    >
      <span aria-hidden className={`sound-bars flex h-3 items-end gap-[2px] ${on ? "is-on" : ""}`}>
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className="w-[2px] rounded-full bg-[color:var(--color-cyan)]" style={{ "--i": i } as React.CSSProperties} />
        ))}
      </span>
      Sound {on ? "on" : "off"}
    </button>
  );
}
