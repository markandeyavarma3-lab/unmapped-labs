import Link from "next/link";
import type { CaseStudy } from "@/content/site-content";
import { Arrow } from "@/components/ui/Arrow";
import { CountUp } from "@/components/motion/CountUp";

/** A real project, with the figures that came out of it. */
export function WorkCard({ cs, level = 3, index = 0 }: { cs: CaseStudy; level?: 2 | 3; index?: number }) {
  const H = level === 2 ? "h2" : "h3";
  return (
    <article className="card card-link group relative flex h-full flex-col p-7 sm:p-9" data-reveal="" style={{ ["--d" as string]: index }}>
      <p className="label flex flex-wrap gap-x-3 gap-y-1">
        <span className="text-[color:var(--color-accent)]">{cs.kind}</span>
        <span aria-hidden className="text-[color:var(--color-fg-3)]">/</span>
        <span className="text-[color:var(--color-fg-3)]">{cs.sector}</span>
      </p>
      <H className="h2 mt-6">
        <Link href={`/work/${cs.slug}`} className="after:absolute after:inset-0">
          {cs.name}
        </Link>
      </H>
      <p className="mt-4 text-[1.0625rem] leading-relaxed text-[color:var(--color-fg-2)]">{cs.oneLiner}</p>
      <dl className="mt-9 grid grid-cols-2 gap-px overflow-hidden border border-[color:var(--color-line)] bg-[color:var(--color-line)]">
        {cs.facts.map((f) => (
          <div key={f.label} className="bg-[color:var(--color-ink-2)] p-4">
            <dt className="sr-only">{f.label}</dt>
            <dd>
              <CountUp value={f.value} className="display block text-[2rem] leading-none" />
              <span className="label mt-2 block text-[0.62rem] leading-snug text-[color:var(--color-fg-3)]">{f.label}</span>
            </dd>
          </div>
        ))}
      </dl>
      <p className="label mt-8 flex items-center gap-2 transition-colors group-hover:text-[color:var(--color-accent)]">
        Read the case study <Arrow className="arrow h-3.5 w-3.5" />
      </p>
    </article>
  );
}
