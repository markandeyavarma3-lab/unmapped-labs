/**
 * The hero figure: a cost curve shaped like a U. It draws itself in, then the
 * point slides down it and settles at the bottom — the optimum, where the
 * curve sits flat on its tangent. With reduced motion it is simply drawn.
 */
const CURVE = "M80 50C110 330 220 400 320 400C420 400 530 330 560 50";
const DESCENT = "M80 50C110 330 220 400 320 400";

export function OptimumCurve() {
  return (
    <svg viewBox="0 0 620 500" className="block h-auto w-full" role="img" aria-labelledby="opt-title opt-desc">
      <title id="opt-title">Finding the optimum</title>
      <desc id="opt-desc">A U-shaped cost curve. A point travels down it and stops at the lowest point, where the curve touches a flat tangent line: the optimum.</desc>

      {/* axes */}
      <g stroke="var(--color-line-strong)" strokeWidth="1">
        <path d="M40 30V450H600" fill="none" />
        {[120, 200, 280, 360, 440, 520].map((x) => (
          <path key={x} d={`M${x} 450v6`} />
        ))}
      </g>
      <g fontFamily="var(--font-mono)" fontSize="10.5" letterSpacing="1.4" fill="var(--color-fg-3)">
        <text x="48" y="40">COST</text>
        <text x="600" y="476" textAnchor="end">TIME · EFFORT · INPUT</text>
      </g>

      {/* the curve */}
      <path d={CURVE} fill="none" stroke="var(--color-fg)" strokeWidth="2" pathLength={1} className="opt-draw" />

      {/* tangent and drop line at the optimum */}
      <g className="opt-after">
        <path d="M190 400H450" stroke="var(--color-accent)" strokeWidth="1.2" strokeDasharray="4 5" />
        <path d="M320 408V450" stroke="var(--color-accent)" strokeWidth="1" strokeDasharray="2 4" />
        <text x="320" y="476" textAnchor="middle" fontFamily="var(--font-mono)" fontSize="11" letterSpacing="2" fill="var(--color-accent)">
          OPTIMUM
        </text>
        <circle cx="320" cy="400" r="16" fill="var(--color-accent)" className="pulse" opacity="0" />
      </g>

      {/* the point: travels down the curve (motion), or simply sits at the optimum */}
      <circle r="7" fill="var(--color-accent)" className="motion-only">
        <animateMotion dur="2.2s" begin="1.1s" fill="freeze" path={DESCENT} keyPoints="0;1" keyTimes="0;1" calcMode="spline" keySplines="0.55 0 0.25 1" />
      </circle>
      <circle cx="320" cy="400" r="7" fill="var(--color-accent)" className="motion-static" />
    </svg>
  );
}
