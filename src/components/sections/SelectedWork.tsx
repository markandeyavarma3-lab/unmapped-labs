import Link from "next/link";
import { work } from "@/content/site-content";
import { SectionHeading } from "@/components/ui/SectionHeading";
import type { StoryId } from "@/components/three/story";
import { StoryStop } from "./StoryStop";

const STORY: Record<string, StoryId> = { flowmatch: "flowmatch", "deal-lens": "deallens" };

/**
 * Two case studies as places on the map. Each is a pinned stop: the camera
 * holds on the project's site while the city acts out what was built, in
 * four steps.
 */
export function SelectedWork() {
  return (
    <section id="work" aria-labelledby="work-heading" className="relative pt-[var(--section-y)]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[70vh] bg-[linear-gradient(180deg,transparent,rgba(247,242,233,0.75)_35%,transparent)]"
      />
      <div className="container-site relative grid gap-8 lg:grid-cols-12">
        <SectionHeading id="work-heading" label={work.label} heading={work.heading} className="lg:col-span-7" />
        <p className="reveal self-end text-[length:var(--text-lead)] leading-[var(--text-lead--line-height)] text-[color:var(--color-fg-2)] lg:col-span-4 lg:col-start-9">
          {work.intro}
        </p>
      </div>

      <ol className="relative mt-[6vh]">
        {work.cases.map((cs) => (
          <StoryStop key={cs.slug} id={STORY[cs.slug]} domId={`work-${cs.slug}`} tag={cs.kind} title={cs.name} beats={cs.beats}>
            <article className="glass p-6 sm:p-7">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span
                  className={`label border px-2.5 py-1 ${
                    cs.kind === "Client project"
                      ? "border-[color:var(--color-lime)]/50 text-[color:var(--color-lime-ink)]"
                      : "border-[color:var(--color-cyan)]/50 text-[color:var(--color-cyan)]"
                  }`}
                >
                  {cs.kind}
                </span>
                <span className="label text-[color:var(--color-fg-3)]">{cs.sector}</span>
              </div>
              <h3 className="mt-5 text-[clamp(2rem,1.5rem+2vw,3rem)] leading-none font-medium tracking-[-0.04em]">{cs.name}</h3>
              <p className="mt-3 text-base leading-relaxed text-[color:var(--color-fg-2)]">{cs.oneLiner}</p>

              <dl className="mt-5 grid grid-cols-2 gap-px border border-[color:var(--color-line)] bg-[color:var(--color-line)]">
                {cs.facts.map((f) => (
                  <div key={f.label} className="bg-[color:var(--color-ink-2)] p-3.5">
                    <dt className="sr-only">{f.label}</dt>
                    <dd>
                      <span data-count className="block text-[1.5rem] leading-none font-medium tracking-[-0.03em] tabular-nums text-[color:var(--color-fg)]">{f.value}</span>
                      <span className="label mt-2 block text-[color:var(--color-fg-3)]">{f.label}</span>
                    </dd>
                  </div>
                ))}
              </dl>

              <Link
                href={`/work/${cs.slug}`}
                className="group mt-5 inline-flex items-center gap-2 text-[15px] font-medium text-[color:var(--color-fg)]"
              >
                <span className="link-underline pb-0.5">Read the case study</span>
                <span aria-hidden className="transition-transform duration-[var(--duration-hover)] group-hover:translate-x-1">
                  →
                </span>
              </Link>
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
      </ol>
    </section>
  );
}
