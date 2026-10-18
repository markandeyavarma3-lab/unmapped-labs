import Link from "next/link";
import type { CaseStudy } from "@/content/site-content";
import { Arrow } from "@/components/ui/Arrow";

/** A real project, with the figures that came out of it. */
export function WorkCard({ cs, level = 3 }: { cs: CaseStudy; level?: 2 | 3 }) {
  const H = level === 2 ? "h2" : "h3";
  return (
    <article className="card card-link group relative flex h-full flex-col p-7 sm:p-9">
      <p className="label flex flex-wrap gap-x-3 gap-y-1">
        <span className="text-[color:var(--color-cyan)]">{cs.kind}</span>
        <span aria-hidden className="text-[color:var(--color-fg-3)]">·</span>
        <span className="text-[color:var(--color-fg-3)]">{cs.sector}</span>
      </p>
      <H className="h2 mt-5">
        <Link href={`/work/${cs.slug}`} className="after:absolute after:inset-0">
          {cs.name}
        </Link>
      </H>
      <p className="mt-4 text-[1.0625rem] leading-relaxed text-[color:var(--color-fg-2)]">{cs.oneLiner}</p>
      <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-5 border-t border-[color:var(--color-line)] pt-6">
        {cs.facts.map((f) => (
          <div key={f.label}>
            <dt className="sr-only">{f.label}</dt>
            <dd>
              <span className="serif block text-[2rem] leading-none tabular-nums">{f.value}</span>
              <span className="mt-1.5 block text-[13px] leading-snug text-[color:var(--color-fg-3)]">{f.label}</span>
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-8 flex items-center gap-2 text-[15px] font-semibold">
        Read the case study <Arrow className="arrow" />
      </p>
    </article>
  );
}
