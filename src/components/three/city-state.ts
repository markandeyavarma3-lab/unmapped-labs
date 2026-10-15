import { DISTRICT_LIST, type DistrictId } from "./city-layout";

/**
 * Each district plays one story as the journey reaches it:
 *   problem  — its flow jams at the entrance (red), visible as you approach
 *   diagnose — a scan, and the fork of possible fixes appears
 *   fixed    — the right fix builds; the jam clears
 *   lit      — the district's lights come on: it's understood
 * Computed once per frame from the smoothed chapter; read by every layer.
 */

export type DistrictState = { lit: number; problem: number; diagnose: number; fixed: number };

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export const cityState: Record<DistrictId, DistrictState> & { focus: DistrictId | null } = Object.assign(
  Object.fromEntries(DISTRICT_LIST.map((d) => [d.id, { lit: 0, problem: 0, diagnose: 0, fixed: 0 }])) as Record<DistrictId, DistrictState>,
  { focus: null as DistrictId | null },
);

export function updateCityState(chapter: number, finale: number) {
  let focus: DistrictId | null = null;
  let best = 0.95;
  for (const d of DISTRICT_LIST) {
    const s = cityState[d.id];
    const local = chapter - d.chapter;
    const hasFix = d.fix !== null;
    // −1 … −0.35: the jam is visible · −0.35 … 0: diagnosis + fork · 0 … 0.3: the fix builds
    s.fixed = hasFix ? smooth(-0.02, 0.28, local) : 0;
    s.problem = hasFix ? smooth(-1.0, -0.55, local) * (1 - s.fixed) : 0;
    s.diagnose = smooth(-0.4, -0.15, local) * (1 - smooth(0.5, 0.75, local));
    s.lit = d.id === "open" ? 0.12 * smooth(-0.5, 0, local) : Math.max(smooth(-0.5, 0.05, local), finale);
    if (Math.abs(local) < best) {
      best = Math.abs(local);
      focus = d.id;
    }
  }
  cityState.focus = focus;
}
