"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { Beat } from "@/content/site-content";
import { prefersReducedMotion, track } from "@/components/motion/scroll-engine";
import { setStory, STORY_CHAPTER, type StoryId } from "@/components/three/story";
import { getWorldLive, getWorldLiveServer, subscribeWorldMode } from "@/components/three/views";

/** Card is up for the first part of the story, then slides away. */
const CARD_UNTIL = 0.1;

/**
 * One pinned stop on the journey (a district or a project). While it is
 * pinned the camera holds on its place in the city and scrolling plays its
 * story in four beats. The card introduces it, then slides away so the
 * scene has the screen, leaving a thin step bar that narrates each beat.
 */
export function StoryStop({
  id,
  domId,
  tag,
  title,
  beats,
  children,
}: {
  id: StoryId;
  domId: string;
  /** Short label for the step bar, e.g. "District A". */
  tag: string;
  title: string;
  beats: Beat[];
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLLIElement>(null);
  const fill = useRef<HTMLSpanElement>(null);
  const [beat, setBeat] = useState(0);
  const [away, setAway] = useState(false);
  const [done, setDone] = useState(false);
  const live = useSyncExternalStore(subscribeWorldMode, getWorldLive, getWorldLiveServer);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = prefersReducedMotion();
    return track(
      el,
      (r) => {
        setStory(id, reduce ? 1 : r);
        if (fill.current) fill.current.style.transform = `scaleX(${Math.min(1, Math.max(0, (r - CARD_UNTIL) / (1 - CARD_UNTIL)))})`;
        setAway(r > CARD_UNTIL);
        setDone(r > 0.975);
        setBeat(Math.min(3, Math.floor(r * 4)));
      },
      { start: { el: 0, vp: 0 }, end: { el: 1, vp: 1 } },
    );
  }, [id]);

  const chapter = STORY_CHAPTER[id];
  const hide = away && live;

  return (
    <li ref={ref} id={domId} className="story-stop relative">
      {/* The camera holds on this stop for the whole pinned stretch. */}
      <span aria-hidden data-chapter={chapter} className="pointer-events-none absolute top-[50svh] h-px w-px" />
      <span aria-hidden data-chapter={chapter} className="story-hold-end pointer-events-none absolute h-px w-px" />

      <div className="story-stage sticky top-0 h-[100svh] overflow-hidden">
        <div className="container-site flex h-full items-center pt-[var(--header-h)] max-lg:items-end max-lg:pb-24">
          <div className="story-card w-full max-w-[26rem]" data-away={hide ? "" : undefined}>
            {children}
          </div>
        </div>

        {/* Step bar: what the scene is showing right now. */}
        <div aria-hidden className="story-bar pointer-events-none absolute inset-x-0 bottom-0 pb-5" data-on={hide && !done ? "" : undefined}>
          <div className="container-site">
            <div className="glass flex flex-col gap-3 px-5 py-4 sm:px-6">
              <div className="flex items-center gap-4">
                <span className="label shrink-0 text-[color:var(--color-fg-3)] max-sm:hidden">
                  {tag} · <span className="text-[color:var(--color-fg)]">{title}</span>
                </span>
                <div className="relative flex-1">
                  <span className="absolute top-[5px] right-0 left-0 h-px bg-[color:var(--color-line)]" />
                  <span ref={fill} className="absolute top-[5px] right-0 left-0 h-px origin-left scale-x-0 bg-[linear-gradient(90deg,var(--color-cyan),var(--color-lime))]" />
                  <ol className="relative flex justify-between">
                    {beats.map((b, i) => (
                      <li key={b.label} className="flex flex-col items-center gap-1.5">
                        <span
                          className={`block h-[11px] w-[11px] rotate-45 border transition-[background-color,border-color,transform] duration-300 ${
                            i === beat
                              ? "scale-125 border-[color:var(--color-lime)] bg-[color:var(--color-lime)]"
                              : i < beat
                                ? "border-[color:var(--color-cyan)] bg-[color:var(--color-cyan)]"
                                : "border-[color:var(--color-fg-3)] bg-[color:var(--color-ink)]"
                          }`}
                        />
                        <span className={`label whitespace-nowrap max-sm:hidden ${i === beat ? "text-[color:var(--color-fg)]" : "text-[color:var(--color-fg-3)]"}`}>{b.label}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
              <p key={beat} className="swap-caption text-[15px] leading-snug font-medium text-[color:var(--color-fg)] sm:text-base">
                <span className="label mr-2 text-[color:var(--color-cyan)] sm:hidden">{beats[beat].label}</span>
                {beats[beat].text}
              </p>
            </div>
          </div>
        </div>
      </div>
    </li>
  );
}
