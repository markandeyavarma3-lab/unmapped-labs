import { Fragment } from "react";
import { fixLabels, focus } from "@/content/site-content";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { StoryStop } from "./StoryStop";

/**
 * Four kinds of large operation, and the open district. Each case is a
 * pinned stop: the camera holds on its place in the city while it plays a
 * real problem in four steps — the problem, what we measured on site, the
 * fix it actually needs, and the result.
 */
export function FocusAreas() {
  return (
    <section id="focus" aria-labelledby="focus-heading" className="relative pt-[var(--section-y)]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[70vh] bg-[linear-gradient(180deg,transparent,rgba(247,242,233,0.75)_35%,transparent)]"
      />
      <div className="container-site relative grid gap-8 lg:grid-cols-12">
        <SectionHeading id="focus-heading" label={focus.label} heading={focus.heading} className="lg:col-span-7" />
        <div className="self-end lg:col-span-4 lg:col-start-9">
          <p className="reveal text-[length:var(--text-lead)] leading-[var(--text-lead--line-height)] text-[color:var(--color-fg-2)]">{focus.intro}</p>
          <p className="reveal label mt-5 text-[color:var(--color-fg-3)]" style={{ "--d": 1 } as React.CSSProperties}>
            {focus.note}
          </p>
        </div>
      </div>

      <ol className="relative mt-[6vh]">
        {focus.areas.map((area) => {
          const open = area.id === "open";
          return (
            <Fragment key={area.id}>
              {area.cases.map((cs, k) => (
                <StoryStop
                  key={cs.id}
                  id={cs.id}
                  domId={k === 0 ? `focus-${area.id}` : `focus-${cs.id}`}
                  tag={`${area.index} · ${area.site}${area.cases.length > 1 ? ` · ${k + 1}/${area.cases.length}` : ""}`}
                  title={cs.title}
                  beats={cs.beats}
                >
                  <article className={`territory-card glass p-6 sm:p-7 ${open ? "is-open" : ""}`}>
                    <div className="flex items-center gap-3">
                      <span aria-hidden className={`territory-index label flex h-8 w-8 shrink-0 items-center justify-center border ${open ? "border-dashed" : ""}`}>
                        {area.index}
                      </span>
                      <span className="label text-[color:var(--color-fg-3)]">
                        {area.title}
                        {area.cases.length > 1 && (
                          <>
                            {" "}
                            · Case {k + 1} of {area.cases.length}
                          </>
                        )}
                      </span>
                    </div>
                    {k === 0 && <p className="mt-4 text-[15px] leading-relaxed text-[color:var(--color-fg-2)]">{area.body}</p>}
                    <p className="label mt-5 text-[color:var(--color-fg-3)]">{area.site}</p>
                    <h3 className="mt-2 text-[clamp(1.6rem,1.2rem+1.4vw,2.3rem)] leading-[1.05] font-medium tracking-[-0.03em]">{cs.title}</h3>
                    <div className="mt-4 border-t border-[color:var(--color-line)] pt-4">
                      <p className="flex gap-2.5 text-[15px] leading-snug text-[color:var(--color-fg)]">
                        <span aria-hidden className="mt-1.5 h-1.5 w-1.5 shrink-0 rotate-45 bg-[color:var(--color-red)]" />
                        {cs.problem}
                      </p>
                      <p className="mt-3 flex flex-wrap items-center gap-2.5 text-[15px] leading-snug text-[color:var(--color-fg-2)]">
                        {cs.fix ? (
                          <span className="label border border-[color:var(--color-lime)]/60 bg-[color:var(--color-lime)] px-2 py-0.5 text-[color:var(--color-on-accent)]">
                            Fix: {fixLabels[cs.fix]}
                          </span>
                        ) : (
                          <span className="label border border-dashed border-[color:var(--color-fg-3)] px-2 py-0.5 text-[color:var(--color-fg-3)]">Fix: ?</span>
                        )}
                        <span>{cs.fixNote}</span>
                      </p>
                      {cs.typical && (
                        <p className="mt-4 border-l-2 border-[color:var(--color-cyan)] pl-3 text-[14px] leading-snug text-[color:var(--color-fg-2)]">
                          <span className="label mr-1.5 text-[color:var(--color-cyan)]">Typical</span>
                          {cs.typical}
                        </p>
                      )}
                      {cs.sources.length > 0 && (
                        <p className="label mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[color:var(--color-fg-3)]">
                          <span>Sources:</span>
                          {cs.sources.map((src, i) => (
                            <a key={src.href} href={src.href} target="_blank" rel="noopener noreferrer" title={src.label} className="link-underline -my-1.5 inline-block px-1 py-1.5 normal-case text-[color:var(--color-fg-2)] hover:text-[color:var(--color-fg)]">
                              [{i + 1}]<span className="sr-only"> {src.label}</span>
                            </a>
                          ))}
                        </p>
                      )}
                    </div>
                    <p aria-hidden className="label mt-5 flex items-center gap-2 text-[color:var(--color-fg-3)] motion-reduce:hidden">
                      <span className="relative block h-4 w-px overflow-hidden bg-[color:var(--color-line)]">
                        <span className="absolute inset-x-0 top-0 h-1.5 animate-[scroll-cue_2.2s_var(--ease-in-out-quart)_infinite] bg-[color:var(--color-cyan)]" />
                      </span>
                      Scroll to watch it play out
                    </p>
                    <ol className="sr-only motion-reduce:not-sr-only motion-reduce:mt-5 motion-reduce:flex motion-reduce:flex-col motion-reduce:gap-2 motion-reduce:text-[15px]">
                      {cs.beats.map((b) => (
                        <li key={b.label}>
                          <strong className="font-medium">{b.label}:</strong> {b.text}
                        </li>
                      ))}
                    </ol>
                  </article>
                </StoryStop>
              ))}
            </Fragment>
          );
        })}
      </ol>
    </section>
  );
}
