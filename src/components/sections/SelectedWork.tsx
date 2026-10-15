import Link from "next/link";
import { work } from "@/content/site-content";
import { SectionHeading } from "@/components/ui/SectionHeading";

/**
 * Two case studies as places on the map. Each row is a journey stop: the
 * camera flies to the project's site while its card is read.
 */
export function SelectedWork() {
  return (
    <section id="work" aria-labelledby="work-heading" className="relative pt-[var(--section-y)]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[70vh] bg-[linear-gradient(180deg,transparent,rgba(8,11,14,0.75)_35%,transparent)]"
      />
      <div className="container-site relative grid gap-8 lg:grid-cols-12">
        <SectionHeading id="work-heading" label={work.label} heading={work.heading} className="lg:col-span-7" />
        <p className="reveal self-end text-[length:var(--text-lead)] leading-[var(--text-lead--line-height)] text-[color:var(--color-fg-2)] lg:col-span-4 lg:col-start-9">
          {work.intro}
        </p>
      </div>

      <ol className="relative mt-[8vh]">
        {work.cases.map((cs, i) => (
          <li key={cs.slug} id={`work-${cs.slug}`} className="relative flex min-h-[140svh] items-center">
              {/* The journey reaches this stop when the card is centred on screen. */}
              <span aria-hidden data-chapter={10 + i} className="pointer-events-none absolute top-1/2 h-px w-px" />
            <div className="container-site">
              <article className="reveal glass max-w-[34rem] p-7 sm:p-9">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span
                    className={`label border px-2.5 py-1 ${
                      cs.kind === "Client project"
                        ? "border-[color:var(--color-lime)]/50 text-[color:var(--color-lime)]"
                        : "border-[color:var(--color-cyan)]/50 text-[color:var(--color-cyan)]"
                    }`}
                  >
                    {cs.kind}
                  </span>
                  <span className="label text-[color:var(--color-fg-3)]">{cs.sector}</span>
                </div>
                <h3 className="mt-6 text-[clamp(2.2rem,1.6rem+2.4vw,3.4rem)] leading-none font-medium tracking-[-0.04em]">{cs.name}</h3>
                <p className="mt-4 text-[1.0625rem] leading-relaxed text-[color:var(--color-fg-2)]">{cs.oneLiner}</p>

                <dl className="mt-7 grid grid-cols-2 gap-px border border-[color:var(--color-line)] bg-[color:var(--color-line)]">
                  {cs.facts.map((f) => (
                    <div key={f.label} className="bg-[color:var(--color-ink-2)] p-4">
                      <dt className="sr-only">{f.label}</dt>
                      <dd>
                        <span className="block text-[1.75rem] leading-none font-medium tracking-[-0.03em] tabular-nums text-[color:var(--color-fg)]">{f.value}</span>
                        <span className="label mt-2 block text-[color:var(--color-fg-3)]">{f.label}</span>
                      </dd>
                    </div>
                  ))}
                </dl>

                <Link
                  href={`/work/${cs.slug}`}
                  className="group mt-7 inline-flex items-center gap-2 text-[15px] font-medium text-[color:var(--color-fg)]"
                >
                  <span className="link-underline pb-0.5">Read the case study</span>
                  <span aria-hidden className="transition-transform duration-[var(--duration-hover)] group-hover:translate-x-1">
                    →
                  </span>
                </Link>
              </article>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
