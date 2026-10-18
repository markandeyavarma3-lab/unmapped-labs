/**
 * The home page's figure: one operation drawn as four steps, with the time
 * each takes. The slow step is the bottleneck; underneath, the same flow
 * after the fix. Plain SVG, styled like a survey sheet.
 */
const STEPS = [
  { name: "Arrive", before: "5 min", after: "5 min" },
  { name: "Wait", before: "3 h 10", after: "35 min", slow: true },
  { name: "Handle", before: "20 min", after: "20 min" },
  { name: "Leave", before: "10 min", after: "10 min" },
];

export function FlowDiagram() {
  const W = 520, x0 = 30, gap = (W - 60) / 3;
  const row = (y: number, when: "before" | "after") => (
    <g>
      <line x1={x0} x2={x0 + gap * 3} y1={y} y2={y} stroke="var(--color-line-strong)" strokeWidth="1.5" />
      {STEPS.map((s, i) => {
        const cx = x0 + gap * i;
        const slow = s.slow && when === "before";
        const fixed = s.slow && when === "after";
        return (
          <g key={s.name}>
            <circle cx={cx} cy={y} r={slow ? 9 : 6} fill={slow ? "var(--color-red)" : fixed ? "var(--color-good)" : "var(--color-ink-2)"} stroke={slow ? "var(--color-red)" : fixed ? "var(--color-good)" : "var(--color-fg)"} strokeWidth="1.5" />
            <text x={cx} y={y + 30} textAnchor="middle" fontSize="15" fontWeight="600" fill={slow ? "var(--color-red)" : fixed ? "var(--color-good)" : "var(--color-fg)"} fontFamily="var(--font-sans)">
              {s[when]}
            </text>
          </g>
        );
      })}
    </g>
  );

  return (
    <figure className="card p-6 sm:p-8">
      <svg viewBox="0 0 520 300" className="block h-auto w-full" role="img" aria-labelledby="flow-title flow-desc">
        <title id="flow-title">Finding the bottleneck in one operation</title>
        <desc id="flow-desc">Four steps: arrive, wait, handle, leave. Before: waiting takes 3 hours 10 minutes and is the bottleneck. After the fix, waiting takes 35 minutes.</desc>
        {/* grid paper */}
        <g stroke="var(--color-line)" strokeWidth="0.6">
          {Array.from({ length: 14 }, (_, i) => (
            <line key={`v${i}`} x1={i * 40} x2={i * 40} y1="0" y2="300" />
          ))}
          {Array.from({ length: 8 }, (_, i) => (
            <line key={`h${i}`} x1="0" x2="520" y1={i * 40} y2={i * 40} />
          ))}
        </g>
        {STEPS.map((s, i) => (
          <text key={s.name} x={x0 + gap * i} y="34" textAnchor="middle" fontSize="12" letterSpacing="1" fill="var(--color-fg-2)" fontFamily="var(--font-sans)">
            {s.name.toUpperCase()}
          </text>
        ))}
        <text x="10" y="84" fontSize="11" fill="var(--color-fg-3)" fontFamily="var(--font-sans)">
          Measured on site
        </text>
        {row(104, "before")}
        {/* the finding */}
        <g>
          <circle cx={x0 + gap} cy="104" r="17" fill="none" stroke="var(--color-red)" strokeDasharray="3 3" />
          <text x={x0 + gap + 30} y="80" fontSize="12" fill="var(--color-red)" fontFamily="var(--font-serif)" fontStyle="italic">
            the bottleneck
          </text>
        </g>
        <text x="10" y="204" fontSize="11" fill="var(--color-fg-3)" fontFamily="var(--font-sans)">
          After the fix
        </text>
        {row(224, "after")}
        <text x="510" y="290" textAnchor="end" fontSize="11" fill="var(--color-fg-3)" fontFamily="var(--font-sans)">
          Illustrative
        </text>
      </svg>
    </figure>
  );
}
