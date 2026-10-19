/**
 * One site, drawn up stage by stage: observed, mapped, understood, fixed,
 * validated. Layers up to `stage` are shown; each draws itself in.
 */
const N = { a: [110, 300], b: [250, 170], c: [400, 250], d: [480, 110] } as const;

export function StoryDrawing({ stage }: { stage: number }) {
  const on = (i: number) => (stage >= i ? { "data-on": "" } : {});
  const fixed = stage >= 3;
  return (
    <svg viewBox="0 0 560 420" className="block h-auto w-full" role="img" aria-label={`Site drawing at stage ${stage + 1} of 5`}>
      {/* 0 · Observe: the site as found */}
      <g className="story-layer" {...on(0)}>
        <rect x="24" y="24" width="512" height="372" fill="none" stroke="var(--color-line-strong)" strokeDasharray="4 6" />
        <g fill="none" stroke="var(--color-fg-3)" strokeWidth="1">
          <rect x="60" y="250" width="110" height="90" pathLength={1} />
          <rect x="200" y="120" width="100" height="100" pathLength={1} />
          <rect x="350" y="200" width="100" height="100" pathLength={1} />
          <rect x="440" y="70" width="70" height="80" pathLength={1} />
        </g>
        <g fill="var(--color-fg-3)">
          {[
            [90, 60], [140, 90], [320, 340], [500, 360], [60, 180], [300, 60], [520, 230], [180, 380],
          ].map(([x, y], i) => (
            <rect key={i} x={x} y={y} width="5" height="5" />
          ))}
        </g>
        <g className="scan motion-only" stroke="var(--color-accent)" fill="none" strokeWidth="1">
          <circle cx="0" cy="0" r="22" />
          <path d="M-32 0H-12M12 0H32M0 -32V-12M0 12V32" />
        </g>
        <text x="36" y="48" fontFamily="var(--font-mono)" fontSize="10" letterSpacing="1" fill="var(--color-fg-3)">
          SITE · AS FOUND
        </text>
      </g>

      {/* 1 · Map: the flow between areas */}
      <g className="story-layer" {...on(1)}>
        <path
          pathLength={1}
          d={`M${N.a[0]} ${N.a[1]} L${N.b[0]} ${N.b[1]} L${N.c[0]} ${N.c[1]} L${N.d[0]} ${N.d[1]}`}
          fill="none"
          stroke="var(--color-blueprint)"
          strokeWidth="1.6"
        />
        {Object.entries(N).map(([k, [x, y]]) => (
          <g key={k}>
            <circle cx={x} cy={y} r="13" fill="var(--color-ink)" stroke="var(--color-blueprint)" strokeWidth="1.4" />
            <text x={x} y={y + 4} textAnchor="middle" fontFamily="var(--font-mono)" fontSize="11" fill="var(--color-fg)">
              {k.toUpperCase()}
            </text>
          </g>
        ))}
      </g>

      {/* 2 · Understand: measured times; B is the constraint */}
      <g className="story-layer" {...on(2)} fontFamily="var(--font-mono)" fontSize="10.5" letterSpacing="0.6">
        <text x="150" y="226" fill="var(--color-fg-2)">12 min</text>
        <text x="300" y="150" fill={fixed ? "var(--color-good)" : "var(--color-accent)"}>{fixed ? "40 min" : "2 h 50"}</text>
        <text x="448" y="196" fill="var(--color-fg-2)">8 min</text>
        <circle cx={N.b[0]} cy={N.b[1]} r="24" fill="none" stroke="var(--color-accent)" strokeDasharray="3 4" />
        <text x={N.b[0] - 30} y={N.b[1] - 34} fill="var(--color-accent)">CONSTRAINT</text>
        <g fill="var(--color-red)">
          {Array.from({ length: 12 }, (_, k) => (
            <rect
              key={k}
              x={N.b[0] - 60 - (k % 4) * 10}
              y={N.b[1] + 14 + Math.floor(k / 4) * 10}
              width="6"
              height="6"
              style={{ opacity: fixed && k > 2 ? 0 : 1, transition: "opacity .8s" }}
            />
          ))}
        </g>
      </g>

      {/* 3 · Build: a second path through B */}
      <g className="story-layer" {...on(3)}>
        <path pathLength={1} d={`M${N.a[0]} ${N.a[1]} Q 200 270 ${N.b[0] + 30} ${N.b[1] + 60} T ${N.c[0]} ${N.c[1]}`} fill="none" stroke="var(--color-accent)" strokeWidth="1.6" />
        <rect x={N.b[0] + 18} y={N.b[1] + 48} width="24" height="24" fill="var(--color-ink)" stroke="var(--color-accent)" strokeWidth="1.4" />
        <text x={N.b[0] + 50} y={N.b[1] + 64} fontFamily="var(--font-mono)" fontSize="10.5" fill="var(--color-accent)">
          + FIX
        </text>
      </g>

      {/* 4 · Validate: before and after */}
      <g className="story-layer" {...on(4)} fontFamily="var(--font-mono)" fontSize="10" letterSpacing="0.8">
        <rect x="350" y="318" width="168" height="66" fill="var(--color-ink-2)" stroke="var(--color-line-strong)" />
        <text x="362" y="336" fill="var(--color-fg-3)">WAIT AT B</text>
        <rect x="362" y="346" width="120" height="9" fill="var(--color-red)" />
        <rect x="362" y="362" width="30" height="9" fill="var(--color-good)" />
        <text x="488" y="354" fill="var(--color-fg-3)">BEFORE</text>
        <text x="398" y="370" fill="var(--color-fg-3)">AFTER</text>
      </g>
    </svg>
  );
}
