import { simplex2 } from "@/components/three/terrain-math";
import { contourSet, hashString } from "@/lib/contours";

/**
 * Procedural cover: a small contour map seeded by the note's slug, so every
 * note gets a unique, on-brand visual without stock imagery.
 */
export function NoteCover({ slug, label, className }: { slug: string; label?: string; className?: string }) {
  const seed = hashString(slug);
  const ox = (seed % 1000) / 7;
  const oy = ((seed >> 10) % 1000) / 7;
  const W = 480;
  const H = 300;
  const { minor, major } = contourSet(
    (u, v) => {
      const x = u * 3.2 + ox;
      const y = v * 2 + oy;
      return simplex2(x, y) + 0.5 * simplex2(x * 2.1, y * 2.1) + 0.25 * simplex2(x * 4.3, y * 4.3);
    },
    { width: W, height: H, cols: 72, step: 0.12, majorEvery: 5 },
  );
  const px = 80 + (seed % 320);
  const py = 60 + ((seed >> 8) % 180);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={className} aria-hidden preserveAspectRatio="xMidYMid slice">
      <rect width={W} height={H} fill="var(--color-ink)" />
      <path d={minor} fill="none" stroke="#9fb3c4" strokeOpacity="0.16" />
      <path d={major} fill="none" stroke="#9fb3c4" strokeOpacity="0.4" strokeWidth="1.2" />
      <circle cx={px} cy={py} r="16" fill="none" stroke="var(--color-cyan)" strokeOpacity="0.5" />
      <circle cx={px} cy={py} r="3.5" fill="var(--color-cyan)" />
      {label && (
        <text x="20" y={H - 20} fill="#a0aab5" fontFamily="var(--font-mono)" fontSize="11" letterSpacing="1.5">
          {label}
        </text>
      )}
    </svg>
  );
}
