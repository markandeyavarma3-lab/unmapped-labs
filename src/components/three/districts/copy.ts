import { focus, type FocusCase } from "@/content/site-content";
import type { CaseId } from "../cases";
import { callout, type CalloutTone } from "../callouts";
import { beatWeight } from "../fx";
import { caseState } from "../city-state";
import { frame } from "../frame-state";
import * as THREE from "three";

/** Each case's copy (scene lines, chart title), by id. */
export const COPY = Object.fromEntries(focus.areas.flatMap((a) => a.cases.map((c) => [c.id, c]))) as Record<CaseId, FocusCase>;

/**
 * A narrator for one case: `line(beat, at)` shows that beat's scene line at
 * a point while the beat plays; `say` shows any other label.
 */
export function narrator(id: CaseId) {
  const st = caseState[id];
  const copy = COPY[id];
  const quiet = () => 1 - frame.process;
  return {
    line(beat: 0 | 1 | 2 | 3, tone: CalloutTone, at: THREE.Vector3 | [number, number, number], extra = 1) {
      const text = copy.scene[beat][0];
      if (text) callout(`${id}-b${beat}`, text, tone, at, beatWeight(st.s, beat) * st.near * quiet() * extra);
    },
    say(key: string, text: string, tone: CalloutTone, at: THREE.Vector3 | [number, number, number], amount: number) {
      callout(`${id}-${key}`, text, tone, at, amount * st.near * quiet());
    },
    chartTitle: copy.chart ?? "",
  };
}
