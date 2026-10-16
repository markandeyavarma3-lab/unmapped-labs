import type { DistrictId, FixType } from "./city-layout";
import type { StoryId } from "./chapters";

/**
 * The domain cases the city acts out, one pinned story each. Where each one
 * happens (its focus: the bottleneck marker and the fork of fixes rise
 * there) and how the camera frames it. Copy lives in site-content.ts.
 */

export type CaseId = Exclude<StoryId, "flowmatch" | "deallens">;
type V3 = [number, number, number];

export type CaseSpec = {
  district: DistrictId;
  fix: FixType | null;
  /** Where the problem is, in the world. */
  focus: V3;
  /** Camera while the story plays. */
  cam: { pos: V3; target: V3 };
};

export const CASES: Record<CaseId, CaseSpec> = {
  harvest: { district: "farms", fix: "process", focus: [-16.4, 0.4, 4.2], cam: { pos: [-8.2, 8.6, -6.4], target: [-17.6, 0.6, 3.6] } },
  irrigation: { district: "farms", fix: "hardware", focus: [-22.6, 0.4, 16.0], cam: { pos: [-19.6, 6.6, 7.4], target: [-20.4, 0.2, 17.6] } },
  pumps: { district: "farms", fix: "software", focus: [-15.8, 0.5, 0.6], cam: { pos: [-8.6, 5.4, -6.6], target: [-15.4, 0.6, 0.4] } },
  yard: { district: "logistics", fix: "software", focus: [19.0, 0.5, 21.2], cam: { pos: [9.6, 11.0, 33.0], target: [19.4, 0.4, 20.4] } },
  discharge: { district: "healthcare", fix: "process", focus: [-15.4, 0.4, -27.6], cam: { pos: [-6.0, 10.5, -18.4], target: [-17.0, 1.0, -27.4] } },
  opd: { district: "healthcare", fix: "data", focus: [-13.4, 0.4, -12.4], cam: { pos: [-4.4, 8.6, -4.0], target: [-14.6, 0.8, -12.4] } },
  leaks: { district: "energy", fix: "hardware", focus: [18.6, 0.8, -31.6], cam: { pos: [9.6, 11.0, -20.4], target: [18.6, 0.4, -31.6] } },
  peak: { district: "energy", fix: "process", focus: [13.4, 0.6, -13.4], cam: { pos: [8.6, 12.5, -1.4], target: [18.4, 0.5, -15.6] } },
  open: { district: "open", fix: null, focus: [-18.5, 0.5, -49.8], cam: { pos: [-9.5, 10.5, -39.0], target: [-19.0, 0.6, -51.0] } },
};
export const CASE_IDS = Object.keys(CASES) as CaseId[];
