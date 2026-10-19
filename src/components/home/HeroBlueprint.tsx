/**
 * The hero drawing: one operation as a schematic — four steps on a line,
 * measured, with the constraint circled. Lines draw themselves in; items
 * flow along the line and pile up before the slow step.
 */
const X = [70, 230, 390, 550];
const NAMES = ["ARRIVE", "WAIT", "HANDLE", "LEAVE"];
const TIMES = ["05 min", "3 h 10", "20 min", "10 min"];
const Y = 250;

export function HeroBlueprint() {
  return (
    <svg viewBox="0 0 620 420" className="block h-auto w-full" role="img" aria-labelledby="bp-title bp-desc">
      <title id="bp-title">An operation, measured</title>
      <desc id="bp-desc">Four steps — arrive, wait, handle, leave. Measured on site, waiting takes 3 hours 10 minutes: that step is the constraint.</desc>

      <g data-draw="" fill="none" strokeLinecap="square">
        {/* dimension line */}
        <path pathLength={1} d={`M${X[0]} 120 H${X[3]}`} stroke="var(--color-blueprint)" strokeWidth="1" style={{ ["--d" as string]: 1 }} />
        {X.map((x, i) => (
          <path key={`t${i}`} pathLength={1} d={`M${x} 112 V128`} stroke="var(--color-blueprint)" strokeWidth="1" style={{ ["--d" as string]: 2 + i }} />
        ))}
        {/* the line of work */}
        <path pathLength={1} id="bp-line" d={`M10 ${Y} H610`} stroke="var(--color-line-strong)" strokeWidth="1.5" style={{ ["--d" as string]: 0 }} />
        {/* steps */}
        {X.map((x, i) => (
          <rect key={`r${i}`} pathLength={1} x={x - 26} y={Y - 26} width="52" height="52" stroke={i === 1 ? "var(--color-accent)" : "var(--color-fg-3)"} strokeWidth={i === 1 ? 1.8 : 1.2} fill="var(--color-ink)" style={{ ["--d" as string]: 3 + i }} />
        ))}
        {/* leader from the finding */}
        <path pathLength={1} d={`M${X[1] + 34} ${Y - 34} L${X[1] + 80} ${Y - 92} H${X[1] + 210}`} stroke="var(--color-accent)" strokeWidth="1" style={{ ["--d" as string]: 8 }} />
        <circle pathLength={1} cx={X[1]} cy={Y} r="46" stroke="var(--color-accent)" strokeWidth="1" strokeDasharray="3 4" data-dash="" style={{ ["--d" as string]: 7 }} />
      </g>

      {/* labels */}
      <g fontFamily="var(--font-mono)" fontSize="11" letterSpacing="1.2" textAnchor="middle">
        {X.map((x, i) => (
          <g key={`l${i}`} data-reveal="fade" style={{ ["--d" as string]: 4 + i }}>
            <text x={x} y={104} fill={i === 1 ? "var(--color-accent)" : "var(--color-fg-2)"}>
              {TIMES[i]}
            </text>
            <text x={x} y={Y + (i === 1 ? 64 : 50)} fill="var(--color-fg-3)">
              {NAMES[i]}
            </text>
          </g>
        ))}
        <g data-reveal="fade" style={{ ["--d" as string]: 10 }}>
          <text x={X[1] + 84} y={Y - 100} textAnchor="start" fill="var(--color-accent)">
            CONSTRAINT · 97% BUSY
          </text>
          <text x={X[1] + 84} y={Y - 76} textAnchor="start" fill="var(--color-fg-3)" fontSize="10">
            MEASURED ON SITE, 6 DAYS
          </text>
        </g>
        <text x={10} y={404} textAnchor="start" fill="var(--color-fg-3)" fontSize="9.5">
          FIG. 01 — ILLUSTRATIVE
        </text>
      </g>

      {/* the queue before the slow step */}
      <g data-reveal="fade" style={{ ["--d" as string]: 9 }}>
        {Array.from({ length: 18 }, (_, k) => {
          const c = Math.floor(k / 6);
          const r = k % 6;
          return <rect key={k} x={X[1] - 48 - c * 13} y={Y - 37 + r * 13 + (r > 2 ? 22 : 0) - 11} width="7" height="7" fill="var(--color-red)" opacity={0.95 - c * 0.22} />;
        })}
      </g>

      {/* pulse on the constraint */}
      <circle cx={X[1]} cy={Y} r="10" fill="var(--color-accent)" className="pulse" opacity="0" />
      <circle cx={X[1]} cy={Y} r="5" fill="var(--color-accent)" />

      {/* items moving through (motion only) */}
      <g className="motion-only" fill="var(--color-fg)">
        {[0, 1.6, 3.2].map((delay) => (
          <rect key={delay} width="7" height="7" x="-3.5" y="-3.5">
            <animateMotion dur="4.8s" begin={`${delay}s`} repeatCount="indefinite" path={`M${X[1] + 30} ${Y} H610`} />
          </rect>
        ))}
        {[0, 2.4].map((delay) => (
          <rect key={`in${delay}`} width="7" height="7" x="-3.5" y="-3.5">
            <animateMotion dur="4.8s" begin={`${delay}s`} repeatCount="indefinite" keyPoints="0;1;1" keyTimes="0;0.6;1" calcMode="linear" path={`M10 ${Y} H${X[1] - 90}`} />
          </rect>
        ))}
      </g>
    </svg>
  );
}
