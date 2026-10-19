"use client";

import { useEffect, useRef, useState } from "react";
import { track } from "@vercel/analytics";
import { ARRIVAL_MEAN, scenarios, verdict, type Entity, type FixId, type Scenario } from "./scenarios";

/* ------------------------------------------------------------------
   Simulation: a tiny discrete-time queueing model. Items arrive about
   once a simulated minute, queue at each step, are served by one of
   the step's servers, and move on. All state lives in a ref; React
   only renders the controls and a few numbers twice a second.
   ------------------------------------------------------------------ */

type Item = {
  id: number;
  step: number; // 0..3, or 4 when done
  queuedAt: number;
  waited: number;
  slot: number;
  x: number;
  y: number;
  alpha: number;
};
type StepState = { servers: number; service: number; queue: Item[]; busy: (Item | null)[]; ends: number[]; util: number };
type World = {
  t: number;
  nextArrival: number;
  steps: StepState[];
  done: Item[];
  recent: number[]; // waits of the last completions
  completions: number[]; // sim times of completions
  nextId: number;
};

const SIM_SPEED = 3; // simulated minutes per real second
const DT = 0.05;
const MAX_IN_SYSTEM = 150;
const exp = (mean: number) => -Math.log(1 - Math.random()) * mean;

function serviceTime(mean: number, smooth: boolean) {
  return mean * (smooth ? 0.9 + Math.random() * 0.2 : 0.55 + Math.random() * 0.9);
}

function buildWorld(s: Scenario, fixes: Record<FixId, boolean>): World {
  const steps = s.steps.map((st, i) => {
    const servers = st.servers + (i === s.slow && fixes.capacity ? 1 : 0);
    return { servers, service: st.service * (i === s.slow && fixes.speed ? 0.55 : 1), queue: [], busy: Array(servers).fill(null), ends: Array(servers).fill(0), util: i === s.slow ? 1 : 0.6 };
  });
  const w: World = { t: 0, nextArrival: 0, steps, done: [], recent: [], completions: [], nextId: 1 };
  // Start mid-morning: a queue has already built up at the slow step.
  for (let k = 0; k < 16; k++) {
    w.steps[s.slow].queue.push({ id: w.nextId++, step: s.slow, queuedAt: -k * 1.6 - Math.random(), waited: 0, slot: -1, x: -40, y: 0, alpha: 1 });
  }
  return w;
}

function applyFixes(w: World, s: Scenario, fixes: Record<FixId, boolean>) {
  const st = w.steps[s.slow];
  const servers = s.steps[s.slow].servers + (fixes.capacity ? 1 : 0);
  st.service = s.steps[s.slow].service * (fixes.speed ? 0.55 : 1);
  while (st.busy.length < servers) {
    st.busy.push(null);
    st.ends.push(0);
  }
  // Removing a server: let anyone in service finish, then drop the slot.
  while (st.busy.length > servers) {
    const it = st.busy.pop();
    st.ends.pop();
    if (it) st.queue.unshift(it);
  }
  st.servers = servers;
}

function stepWorld(w: World, smooth: boolean) {
  w.t += DT;
  const inSystem = w.steps.reduce((n, s) => n + s.queue.length + s.busy.filter(Boolean).length, 0);
  if (w.t >= w.nextArrival) {
    if (inSystem < MAX_IN_SYSTEM) w.steps[0].queue.push({ id: w.nextId++, step: 0, queuedAt: w.t, waited: 0, slot: -1, x: -30, y: 0, alpha: 1 });
    w.nextArrival = w.t + (smooth ? ARRIVAL_MEAN * (0.92 + Math.random() * 0.16) : exp(ARRIVAL_MEAN));
  }
  for (let i = 0; i < w.steps.length; i++) {
    const st = w.steps[i];
    let busy = 0;
    for (let k = 0; k < st.busy.length; k++) {
      const it = st.busy[k];
      if (it && w.t >= st.ends[k]) {
        st.busy[k] = null;
        if (i + 1 < w.steps.length) {
          it.step = i + 1;
          it.queuedAt = w.t;
          w.steps[i + 1].queue.push(it);
        } else {
          it.step = 4;
          w.done.push(it);
          w.recent.push(it.waited);
          if (w.recent.length > 40) w.recent.shift();
          w.completions.push(w.t);
        }
      }
      if (!st.busy[k] && st.queue.length) {
        const next = st.queue.shift()!;
        next.waited += Math.max(0, w.t - next.queuedAt);
        next.slot = k;
        st.busy[k] = next;
        st.ends[k] = w.t + serviceTime(st.service, smooth);
      }
      if (st.busy[k]) busy++;
    }
    st.util += (busy / st.busy.length - st.util) * (DT / 12);
  }
  while (w.completions.length && w.completions[0] < w.t - 60) w.completions.shift();
}

/* ------------------------------------------------------------------
   Drawing
   ------------------------------------------------------------------ */

type Palette = { fg: string; fg2: string; fg3: string; line: string; accent: string; red: string; good: string; ink2: string };

function mix(a: string, b: string, k: number) {
  const pa = a.match(/\w\w/g)!.map((h) => parseInt(h, 16));
  const pb = b.match(/\w\w/g)!.map((h) => parseInt(h, 16));
  return `rgb(${pa.map((v, i) => Math.round(v + (pb[i] - v) * k)).join(",")})`;
}

function drawEntity(ctx: CanvasRenderingContext2D, kind: Entity, x: number, y: number, color: string) {
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  switch (kind) {
    case "truck":
      ctx.fillRect(x - 6, y - 3.5, 9, 7);
      ctx.fillRect(x + 4, y - 1.5, 3.5, 5);
      break;
    case "person":
      ctx.beginPath();
      ctx.arc(x, y - 3.5, 2.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(x - 2.6, y - 0.5, 5.2, 5.5);
      break;
    case "crate":
      ctx.lineWidth = 1.4;
      ctx.strokeRect(x - 4, y - 4, 8, 8);
      ctx.beginPath();
      ctx.moveTo(x - 4, y - 4);
      ctx.lineTo(x + 4, y + 4);
      ctx.stroke();
      break;
    case "part":
      ctx.beginPath();
      for (let k = 0; k < 6; k++) {
        const a = (Math.PI / 3) * k + Math.PI / 6;
        ctx.lineTo(x + Math.cos(a) * 4.6, y + Math.sin(a) * 4.6);
      }
      ctx.closePath();
      ctx.fill();
      break;
  }
}

/* ------------------------------------------------------------------
   Component
   ------------------------------------------------------------------ */

const NO_FIXES: Record<FixId, boolean> = { capacity: false, speed: false, smooth: false };

export function BottleneckSim() {
  const [sid, setSid] = useState(scenarios[0].id);
  const [measured, setMeasured] = useState(false);
  const [fixes, setFixes] = useState(NO_FIXES);
  const [playing, setPlaying] = useState(true);
  const [stats, setStats] = useState({ wait: 0, queue: 0, served: 0 });
  const [baseline, setBaseline] = useState<number | null>(null);

  const s = scenarios.find((x) => x.id === sid)!;
  const canvas = useRef<HTMLCanvasElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const world = useRef<World | null>(null);
  const live = useRef({ s, measured, fixes, playing });
  live.current = { s, measured, fixes, playing };

  // Reduced motion: start paused; the visitor presses play.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) setPlaying(false);
  }, []);

  // New scenario → new world.
  useEffect(() => {
    world.current = buildWorld(s, NO_FIXES);
    setFixes(NO_FIXES);
    setMeasured(false);
    setBaseline(null);
  }, [s]);

  // Fixes change the slow step in place, so the queue visibly drains.
  useEffect(() => {
    if (world.current) applyFixes(world.current, live.current.s, fixes);
  }, [fixes]);

  useEffect(() => {
    const cv = canvas.current!;
    const ctx = cv.getContext("2d")!;
    const css = getComputedStyle(cv);
    const v = (n: string) => css.getPropertyValue(n).trim();
    const pal: Palette = { fg: v("--color-fg"), fg2: v("--color-fg-2"), fg3: v("--color-fg-3"), line: v("--color-line-strong"), accent: v("--color-accent"), red: v("--color-red"), good: v("--color-good"), ink2: v("--color-ink-2") };

    let W = 0,
      H = 0,
      raf = 0,
      last = performance.now(),
      acc = 0,
      visible = false,
      statTimer = 0;

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      W = cv.clientWidth;
      H = cv.clientHeight;
      cv.width = Math.round(W * dpr);
      cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(cv);

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const { s, measured, fixes, playing } = live.current;
      const w = world.current;
      if (!w) return;

      if (playing) {
        acc += dt * SIM_SPEED;
        while (acc >= DT) {
          stepWorld(w, fixes.smooth);
          acc -= DT;
        }
      }

      // Layout
      const narrow = W < 560;
      const left = narrow ? 18 : 40;
      const gap = (W - left - 10) / 4;
      const cy = H * 0.52;
      const sx = (i: number) => left + gap * i + gap * 0.62;
      const bw = Math.min(64, gap * 0.36);
      const row = narrow ? 11 : 13;
      const rows = 7;

      ctx.clearRect(0, 0, W, H);

      // Track
      ctx.strokeStyle = pal.line;
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 5]);
      ctx.beginPath();
      ctx.moveTo(0, cy);
      ctx.lineTo(W, cy);
      ctx.stroke();
      ctx.setLineDash([]);

      // Steps
      ctx.font = `500 ${narrow ? 9 : 11}px ${v("--font-mono") || "monospace"}`;
      ctx.textAlign = "center";
      w.steps.forEach((st, i) => {
        const x = sx(i);
        const bh = st.busy.length * 16 + 12;
        const slow = i === s.slow;
        const flag = measured && slow;
        ctx.fillStyle = pal.ink2;
        ctx.fillRect(x - bw / 2, cy - bh / 2, bw, bh);
        ctx.strokeStyle = flag ? pal.accent : pal.fg3;
        ctx.lineWidth = flag ? 1.6 : 1;
        ctx.strokeRect(x - bw / 2, cy - bh / 2, bw, bh);
        if (flag) {
          ctx.setLineDash([3, 3]);
          ctx.beginPath();
          ctx.arc(x, cy, Math.max(bw, bh) * 0.85, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
        }
        ctx.fillStyle = flag ? pal.accent : pal.fg2;
        ctx.fillText((narrow ? s.steps[i].short : s.steps[i].name).toUpperCase(), x, cy - Math.max(bh / 2, ((rows - 1) / 2) * row + 8, flag ? Math.max(bw, bh) * 0.85 : 0) - 12);
        if (measured) {
          const u = Math.min(1, st.util);
          const by = cy + Math.max(bh / 2 + 18, flag ? Math.max(bw, bh) * 0.85 + 14 : 0);
          ctx.fillStyle = pal.line;
          ctx.fillRect(x - bw / 2, by, bw, 3);
          ctx.fillStyle = u > 0.92 ? pal.red : pal.good;
          ctx.fillRect(x - bw / 2, by, bw * u, 3);
          ctx.fillStyle = pal.fg3;
          ctx.fillText(`${Math.round(u * 100)}% busy`, x, by + 15);
          if (flag) {
            ctx.fillStyle = pal.accent;
            ctx.fillText("BOTTLENECK", x, by + 29);
          }
        }
        // Items in service
        st.busy.forEach((it, k) => {
          if (!it) return;
          it.x += (x - it.x) * Math.min(1, dt * 10);
          const ty = cy - bh / 2 + 14 + k * 16;
          it.y += (ty - it.y) * Math.min(1, dt * 10);
          const p = Math.min(1, Math.max(0, 1 - (st.ends[k] - w.t) / st.service));
          drawEntity(ctx, s.entity, it.x, it.y, pal.fg);
          ctx.fillStyle = pal.accent;
          ctx.fillRect(x - bw / 2 + 3, ty + 6, (bw - 6) * p, 1.5);
        });
        // Queue: a grid filling leftwards from the step
        const colStep = row + (s.entity === "truck" ? 6 : 2);
        const qx = x - bw / 2 - 14;
        const cols = Math.max(1, Math.floor((gap - bw - 24) / colStep));
        const shown = Math.min(st.queue.length, cols * rows);
        for (let q = 0; q < shown; q++) {
          const it = st.queue[q];
          const c = Math.floor(q / rows);
          const r = q % rows;
          const tx = qx - c * colStep;
          const ty = cy + (r - (rows - 1) / 2) * row;
          it.x += (tx - it.x) * Math.min(1, dt * 7);
          it.y += (ty - it.y) * Math.min(1, dt * 7);
          const waiting = w.t - it.queuedAt;
          drawEntity(ctx, s.entity, it.x, it.y, mix(pal.fg, pal.red, Math.min(1, waiting / 18)));
        }
        if (st.queue.length > shown) {
          ctx.fillStyle = pal.red;
          ctx.fillText(`+${st.queue.length - shown}`, qx - (cols - 0.5) * colStep, cy + (rows / 2 + 1.4) * row);
        }
      });

      // Finished items leave to the right and fade
      for (const it of w.done) {
        it.x += (W + 20 - it.x) * Math.min(1, dt * 1.6);
        it.y += (cy - it.y) * Math.min(1, dt * 6);
        it.alpha -= dt * 1.2;
        ctx.globalAlpha = Math.max(0, it.alpha);
        drawEntity(ctx, s.entity, it.x, it.y, pal.good);
        ctx.globalAlpha = 1;
      }
      w.done = w.done.filter((it) => it.alpha > 0);

      statTimer += dt;
      if (statTimer > 0.5) {
        statTimer = 0;
        const avg = w.recent.length ? w.recent.reduce((a, b) => a + b, 0) / w.recent.length : 0;
        const queue = w.steps[s.slow].queue.length;
        const span = Math.min(60, w.t);
        setStats({ wait: avg * s.scale, queue, served: span > 5 ? (w.completions.length / span) * (60 / s.scale) : 0 });
      }
    };

    // Only run while on screen and the tab is visible.
    const start = () => {
      if (raf || !visible || document.hidden) return;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };
    const stop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible) start();
      else stop();
    });
    io.observe(cv);
    const onVis = () => (document.hidden ? stop() : start());
    document.addEventListener("visibilitychange", onVis);
    return () => {
      stop();
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  const toggleFix = (f: FixId) => {
    if (baseline === null) setBaseline(stats.wait);
    setFixes((x) => ({ ...x, [f]: !x[f] }));
    track("sim_fix", { scenario: s.id, fix: f });
  };
  const anyFix = fixes.capacity || fixes.speed || fixes.smooth;
  const fmtWait = (m: number) => (m >= 90 ? `${Math.floor(m / 60)} h ${String(Math.round(m % 60)).padStart(2, "0")}` : `${Math.round(m)} min`);

  return (
    <div ref={box} className="card ticks overflow-hidden">
      {/* Scenario picker */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[color:var(--color-line)] p-3 sm:p-4">
        <div role="group" aria-label="Scenario" className="flex flex-wrap gap-1.5">
          {scenarios.map((x) => (
            <button
              key={x.id}
              type="button"
              aria-pressed={x.id === sid}
              onClick={() => {
                setSid(x.id);
                track("sim_scenario", { scenario: x.id });
              }}
              className={`label min-h-10 rounded-[2px] border px-3 py-2 transition-colors ${x.id === sid ? "border-[color:var(--color-accent)] bg-[color:var(--color-accent)] text-[color:var(--color-on-accent)]" : "border-[color:var(--color-line-strong)] text-[color:var(--color-fg-2)] hover:border-[color:var(--color-fg-3)] hover:text-[color:var(--color-fg)]"}`}
            >
              {x.tab}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5">
          <button type="button" onClick={() => setPlaying((p) => !p)} className="label min-h-10 rounded-[2px] border border-[color:var(--color-line-strong)] px-3 py-2 text-[color:var(--color-fg-2)] hover:text-[color:var(--color-fg)]">
            {playing ? "Pause" : "Play"}
          </button>
          <button
            type="button"
            onClick={() => {
              world.current = buildWorld(s, NO_FIXES);
              setFixes(NO_FIXES);
              setMeasured(false);
              setBaseline(null);
            }}
            className="label min-h-10 rounded-[2px] border border-[color:var(--color-line-strong)] px-3 py-2 text-[color:var(--color-fg-2)] hover:text-[color:var(--color-fg)]"
          >
            Reset
          </button>
        </div>
      </div>

      {/* The floor */}
      <div className="bp-grid relative">
        <canvas ref={canvas} aria-hidden className="block h-[300px] w-full sm:h-[340px]" />
        <p className="label pointer-events-none absolute top-3 left-4 text-[color:var(--color-fg-3)]">
          Live · {s.unit} arriving ≈ 1 every {Math.round(ARRIVAL_MEAN * s.scale * 10) / 10} min
        </p>
      </div>

      {/* Readouts and controls */}
      <div className="grid border-t border-[color:var(--color-line)] lg:grid-cols-12">
        <dl className="grid grid-cols-3 border-b border-[color:var(--color-line)] lg:col-span-5 lg:border-r lg:border-b-0">
          {[
            { k: "Average wait", v: fmtWait(stats.wait), note: baseline !== null && anyFix ? `was ${fmtWait(baseline)}` : null, bad: stats.wait > 45 },
            { k: `Waiting at ${s.steps[s.slow].short.toLowerCase()}`, v: String(stats.queue), note: null, bad: stats.queue > 10 },
            { k: `${s.unit} / hour`, v: stats.served ? String(Math.round(stats.served)) : "—", note: null, bad: false },
          ].map((m) => (
            <div key={m.k} className="border-r border-[color:var(--color-line)] p-4 last:border-r-0 sm:p-5">
              <dt className="label text-[0.62rem] text-[color:var(--color-fg-3)]">{m.k}</dt>
              <dd className={`display mt-2 text-[1.5rem] tabular-nums sm:text-[2rem] ${m.bad ? "text-[color:var(--color-red)]" : "text-[color:var(--color-fg)]"}`}>{m.v}</dd>
              {m.note && <dd className="label mt-1 text-[0.62rem] text-[color:var(--color-fg-3)]">{m.note}</dd>}
            </div>
          ))}
        </dl>

        <div className="flex flex-col gap-4 p-4 sm:p-5 lg:col-span-7">
          <div className="flex flex-wrap items-center gap-3">
            <span className="label text-[color:var(--color-accent)]">Step 1</span>
            <button type="button" aria-pressed={measured} onClick={() => { setMeasured(true); track("sim_measure", { scenario: s.id }); }} className={`btn min-h-10 py-2 ${measured ? "btn-ghost" : "btn-primary"}`}>
              {measured ? "Measured ✓" : "Measure each step"}
            </button>
            {!measured && <span className="text-[14px] text-[color:var(--color-fg-3)]">Where does the work pile up — and why?</span>}
          </div>
          <div className={`flex flex-wrap items-center gap-3 transition-opacity ${measured ? "" : "pointer-events-none opacity-40"}`} aria-disabled={!measured}>
            <span className="label text-[color:var(--color-accent)]">Step 2</span>
            {(Object.keys(s.fixes) as FixId[]).map((f) => (
              <button
                key={f}
                type="button"
                disabled={!measured}
                aria-pressed={fixes[f]}
                onClick={() => toggleFix(f)}
                className={`flex min-h-10 items-center gap-2 rounded-[2px] border px-3 py-2 text-left text-[14px] transition-colors ${fixes[f] ? "border-[color:var(--color-good)] text-[color:var(--color-fg)]" : "border-[color:var(--color-line-strong)] text-[color:var(--color-fg-2)] hover:border-[color:var(--color-fg-3)]"}`}
              >
                <span aria-hidden className={`h-3 w-3 shrink-0 rounded-[1px] border ${fixes[f] ? "border-[color:var(--color-good)] bg-[color:var(--color-good)]" : "border-[color:var(--color-fg-3)]"}`} />
                {s.fixes[f].label}
                <span className="label text-[0.6rem] text-[color:var(--color-fg-3)]">{s.fixes[f].kind}</span>
              </button>
            ))}
          </div>
          <p aria-live="polite" className="min-h-[3em] text-[15px] leading-relaxed text-[color:var(--color-fg-2)]">
            {measured ? verdict(s, fixes) : "Everything looks busy from the floor. Measure first: the real constraint is often not where people think."}
          </p>
        </div>
      </div>
    </div>
  );
}
