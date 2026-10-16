import { CASES, CASE_IDS, type CaseId } from "./cases";
import { STORY_CHAPTER, storySmooth } from "./story";

/**
 * Each case plays one story while its section is pinned (see story.ts):
 *   problem  — the bottleneck shows (red); stays until the fix lands
 *   diagnose — our team measures; the fork of possible fixes rises
 *   fixed    — the right fix goes in
 *   result   — it works again
 * `near` says how close the journey is to the case (its markers, people and
 * labels only show there). Computed once per frame; read by every layer.
 */

export type CaseState = { problem: number; diagnose: number; fixed: number; result: number; near: number; s: number };

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export const caseState: Record<CaseId, CaseState> & { focus: CaseId | null } = Object.assign(
  Object.fromEntries(CASE_IDS.map((id) => [id, { problem: 0, diagnose: 0, fixed: 0, result: 0, near: 0, s: 0 }])) as Record<CaseId, CaseState>,
  { focus: null as CaseId | null },
);

export function updateCaseState(chapter: number) {
  let focus: CaseId | null = null;
  let best = 0.6;
  for (const id of CASE_IDS) {
    const st = caseState[id];
    const s = storySmooth[id];
    const hasFix = CASES[id].fix !== null;
    const dist = Math.abs(chapter - STORY_CHAPTER[id]);
    st.s = s;
    // fades out over the last moments too, so nothing lingers into the flight onward
    st.near = (1 - smooth(0.3, 0.75, dist)) * (1 - smooth(0.97, 1, s));
    st.fixed = hasFix ? smooth(0.5, 0.72, s) : 0;
    st.problem = hasFix ? 1 - smooth(0.6, 0.74, s) : 0;
    st.diagnose = smooth(0.24, 0.32, s) * (1 - smooth(0.66, 0.74, s));
    st.result = smooth(0.74, 0.86, s);
    if (dist < best) {
      best = dist;
      focus = id;
    }
  }
  caseState.focus = focus;
}
