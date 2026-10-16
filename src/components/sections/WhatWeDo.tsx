import { services } from "@/content/site-content";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { CHAPTER } from "@/components/three/chapters";

/**
 * Services: research always comes first, then whichever of the four kinds of
 * fix the problem needs. The city behind labels where each one was used.
 */
export function WhatWeDo() {
  return (
    <section id="services" data-chapter={CHAPTER.services} aria-labelledby="services-heading" className="relative py-[var(--section-y)]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[90vh] bg-[linear-gradient(180deg,transparent,rgba(247,242,233,0.82)_22%,rgba(247,242,233,0.82)_70%,transparent)] lg:bg-[linear-gradient(90deg,rgba(247,242,233,0.85),rgba(247,242,233,0.4)_50%,transparent_75%)]"
      />
      <div className="container-site relative">
        <SectionHeading id="services-heading" label={services.label} heading={services.heading} intro={services.intro} />
        <ol className="mt-16 grid gap-4 md:grid-cols-2 lg:mt-24">
          {services.items.map((sv, i) => (
            <li
              key={sv.index}
              className={`reveal-card glass group flex flex-col p-7 sm:p-8 ${i === 0 ? "md:col-span-2 md:border-[color:var(--color-cyan)]/40" : ""}`}
              style={{ "--d": i % 2, "--dir": i % 2 ? 1 : -1 } as React.CSSProperties}
            >
              <div className="flex items-center gap-3">
                {i === 0 && <span className="label text-[color:var(--color-cyan)]">Always first</span>}
                <span className="label flex h-9 min-w-9 items-center justify-center border border-[color:var(--color-lime)]/50 px-1.5 tabular-nums text-[color:var(--color-lime-ink)] transition-colors duration-[var(--duration-hover)] group-hover:bg-[color:var(--color-lime)] group-hover:text-[color:var(--color-on-accent)]">
                  {sv.index}
                </span>
                <span aria-hidden className="h-px flex-1 bg-[color:var(--color-line)]" />
              </div>
              <h3 className="mt-6 text-[length:var(--text-h3)] leading-[var(--text-h3--line-height)] font-medium tracking-[var(--text-h3--letter-spacing)]">
                {sv.title}
              </h3>
              <p className="mt-3 text-[1.0625rem] leading-relaxed text-[color:var(--color-fg-2)]">{sv.body}</p>
              <ul className="mt-auto flex flex-wrap gap-2 pt-6" aria-label="Typical deliverables">
                {sv.deliverables.map((d) => (
                  <li key={d} className="label border border-[color:var(--color-line)] px-2.5 py-1 text-[color:var(--color-fg-2)]">
                    {d}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
