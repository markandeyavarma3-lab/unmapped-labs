/**
 * The journey, in order. Each entry is one chapter; page sections anchor
 * them with `data-chapter={CHAPTER.…}` and the camera has one key per
 * chapter (landmarks.ts). Pure data: safe to import from server components.
 */

/** Every pinned story: the domain cases, the open district, then the two projects. */
export const STORY_ORDER = ["harvest", "irrigation", "pumps", "yard", "discharge", "opd", "leaks", "peak", "open", "flowmatch", "deallens"] as const;
export type StoryId = (typeof STORY_ORDER)[number];

const ORDER = [
  "prologue",
  "title",
  "tagline",
  "hero",
  "intro",
  "approach",
  ...STORY_ORDER,
  "services",
  "notes",
  "philosophy",
  "about",
  "contact",
  "epilogue",
] as const;
export type ChapterId = (typeof ORDER)[number];

/** Chapter numbers: the prologue on the northern hills is −1, the title 0. */
export const CHAPTER = Object.fromEntries(ORDER.map((id, i) => [id, i - 1])) as Record<ChapterId, number>;
export const CHAPTER_ORDER: readonly ChapterId[] = ORDER;
export const FIRST_CHAPTER = -1;
export const LAST_CHAPTER = ORDER.length - 2;
