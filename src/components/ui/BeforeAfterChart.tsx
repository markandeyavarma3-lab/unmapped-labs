import type { Figure } from "@/content/insights";

/**
 * Two small bar charts side by side — before and after — drawn as plain SVG.
 * Bars that show the problem are rust; after the fix they turn green.
 * The data is also given as text for screen readers.
 */
export function BeforeAfterChart({ figure, compact = false }: { figure: Figure; compact?: boolean }) {
  const W = 320, H = compact ? 120 : 150, pad = { l: 6, r: 6, t: 10, b: compact ? 6 : 22 };
  const n = figure.before.length;
  const step = (W - pad.l - pad.r) / n;
  const barW = Math.max(2, step * 0.66);
  const y = (v: number) => pad.t + (1 - Math.min(1, v)) * (H - pad.t - pad.b);
  const isBad = (v: number, i: number, when: "before" | "after") => (figure.bad ? figure.bad(v, i, when) : figure.limit !== undefined && v > figure.limit);

  const panel = (when: "before" | "after") => {
    const values = figure[when];
    return (
      <figure className="min-w-0 flex-1">
        <figcaption className="label mb-2 flex items-center gap-2 text-[color:var(--color-fg-3)]">
          <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: when === "before" ? "var(--color-red)" : "var(--color-good)" }} />
          {when === "before" ? "Before" : "After"}
        </figcaption>
        <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" aria-hidden>
          <line x1={pad.l} x2={W - pad.r} y1={H - pad.b} y2={H - pad.b} stroke="var(--color-line-strong)" />
          {values.map((v, i) => {
            const top = y(v);
            const bad = isBad(v, i, when);
            const fill = bad ? "var(--color-red)" : when === "after" ? "var(--color-good)" : "var(--color-line-strong)";
            return <rect key={i} x={pad.l + i * step + (step - barW) / 2} y={top} width={barW} height={Math.max(1, H - pad.b - top)} fill={fill} rx="1" />;
          })}
          {figure.limit !== undefined && (
            <>
              <line x1={pad.l} x2={W - pad.r} y1={y(figure.limit)} y2={y(figure.limit)} stroke="var(--color-fg)" strokeDasharray="4 3" strokeWidth="1" />
              {figure.limitLabel && !compact && (
                <text x={W - pad.r} y={y(figure.limit) - 4} textAnchor="end" fontSize="10" fill="var(--color-fg-2)" fontFamily="var(--font-sans)">
                  {figure.limitLabel}
                </text>
              )}
            </>
          )}
          {!compact &&
            figure.labels.map((l, i) =>
              l ? (
                <text key={i} x={pad.l + i * step + step / 2} y={H - 6} textAnchor="middle" fontSize="10" fill="var(--color-fg-3)" fontFamily="var(--font-sans)">
                  {l}
                </text>
              ) : null,
            )}
        </svg>
      </figure>
    );
  };

  const pct = (v: number) => `${Math.round(v * 100)}%`;
  return (
    <div>
      {!compact && <p className="font-medium">{figure.title}</p>}
      <div className={`flex gap-5 ${compact ? "" : "mt-4"}`}>
        {panel("before")}
        {panel("after")}
      </div>
      {!compact && <p className="mt-3 text-sm text-[color:var(--color-fg-3)]">{figure.caption} Illustrative data.</p>}
      <p className="sr-only">
        {figure.title}. Before: {figure.before.map(pct).join(", ")}. After: {figure.after.map(pct).join(", ")}.
      </p>
    </div>
  );
}
