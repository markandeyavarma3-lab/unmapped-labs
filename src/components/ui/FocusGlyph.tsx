import type { FocusArea } from "@/content/site-content";

/**
 * Abstract, procedural line drawings — one per domain, all built from the
 * same contour vocabulary. Accent strokes animate when the row is hovered or
 * focused (`.group`); they are decorative and hidden from assistive tech.
 */

const range = (n: number) => Array.from({ length: n }, (_, i) => i);

function Agriculture() {
  // Furrows: parallel field rows bending over gentle relief.
  return (
    <>
      {range(9).map((i) => {
        const y = 22 + i * 11;
        const d = `M10 ${y} C 50 ${y - 10 + i}, 90 ${y + 12 - i}, 150 ${y - 4}`;
        return <path key={i} d={d} className={i === 4 ? "glyph-accent" : undefined} pathLength={i === 4 ? 1 : undefined} />;
      })}
    </>
  );
}

function Logistics() {
  const pts: [number, number][] = [[20, 100], [52, 40], [84, 86], [118, 30], [142, 96], [96, 126]];
  const links: [number, number][] = [[0, 1], [1, 2], [2, 3], [3, 4], [2, 5], [5, 4], [0, 2]];
  return (
    <>
      {links.map(([a, b], i) => (
        <path key={i} d={`M${pts[a][0]} ${pts[a][1]}L${pts[b][0]} ${pts[b][1]}`} strokeDasharray="3 4" />
      ))}
      <path className="glyph-accent" pathLength={1} d="M20 100L84 86L96 126L142 96" />
      {pts.map(([x, y], i) => (
        <rect key={i} x={x - 3} y={y - 3} width="6" height="6" className="glyph-node" />
      ))}
    </>
  );
}

function Healthcare() {
  return (
    <>
      {range(6).map((i) => (
        <circle key={i} cx="80" cy="76" r={12 + i * 11} strokeDasharray={i % 2 ? "2 5" : undefined} />
      ))}
      <path d="M80 20V132M24 76H136" strokeOpacity="0.45" />
      <circle className="glyph-accent glyph-pulse" pathLength={1} cx="80" cy="76" r="34" />
      <rect x="77" y="73" width="6" height="6" className="glyph-node" />
    </>
  );
}

function Energy() {
  return (
    <>
      {range(6).map((i) => (
        <path key={`v${i}`} d={`M${20 + i * 24} 18V134`} strokeOpacity="0.5" />
      ))}
      {range(5).map((i) => (
        <path key={`h${i}`} d={`M14 ${28 + i * 24}H146`} strokeOpacity="0.5" />
      ))}
      <path className="glyph-accent" pathLength={1} d="M14 124H44V76H92V52H116V28H146" />
    </>
  );
}

function OpenExploration() {
  // A survey grid that dissolves toward an unmarked region.
  return (
    <>
      {range(8).flatMap((r) =>
        range(11).map((c) => {
          const x = 14 + c * 13.2;
          const y = 18 + r * 16;
          const fade = Math.hypot(c - 7.5, r - 3) / 7;
          if (fade < 0.42) return null;
          return <circle key={`${r}-${c}`} cx={x} cy={y} r="1.1" className="glyph-dot" style={{ opacity: Math.min(1, fade - 0.2) }} />;
        }),
      )}
      <path className="glyph-accent" pathLength={1} d="M30 120 C 60 110, 70 70, 112 64" />
      <rect x="104" y="44" width="34" height="34" strokeDasharray="3 4" />
    </>
  );
}

const MAP: Record<FocusArea["id"], () => React.JSX.Element> = {
  agriculture: Agriculture,
  logistics: Logistics,
  healthcare: Healthcare,
  energy: Energy,
  open: OpenExploration,
};

export function FocusGlyph({ id, className }: { id: FocusArea["id"]; className?: string }) {
  const Glyph = MAP[id];
  return (
    <svg viewBox="0 0 160 152" fill="none" stroke="currentColor" strokeWidth="1" aria-hidden className={`glyph ${className ?? ""}`}>
      <Glyph />
    </svg>
  );
}
