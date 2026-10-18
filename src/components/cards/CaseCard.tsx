import Link from "next/link";
import { fixLabels } from "@/content/site-content";
import { industries, type IndustryCase } from "@/content/insights";
import { BeforeAfterChart } from "@/components/ui/BeforeAfterChart";
import { Arrow } from "@/components/ui/Arrow";

/** An industry case as a card: the problem, the kind of fix, a small before/after. */
export function CaseCard({ c, level = 3 }: { c: IndustryCase; level?: 2 | 3 }) {
  const H = level === 2 ? "h2" : "h3";
  return (
    <article className="card card-link group relative flex h-full flex-col p-6">
      <p className="label flex flex-wrap gap-x-3 gap-y-1 text-[color:var(--color-fg-3)]">
        <span>{industries[c.industry].site}</span>
        <span aria-hidden>·</span>
        <span className="text-[color:var(--color-cyan)]">Fix: {fixLabels[c.fixType]}</span>
      </p>
      <H className="h3 mt-4">
        <Link href={`/insights/${c.slug}`} className="after:absolute after:inset-0">
          {c.title}
        </Link>
      </H>
      <p className="mt-3 text-[15px] leading-relaxed text-[color:var(--color-fg-2)]">{c.summary}</p>
      <div className="mt-auto pt-6">
        <BeforeAfterChart figure={c.figure} compact />
      </div>
      <p className="mt-5 flex items-center gap-2 text-sm font-semibold">
        Read the case <Arrow className="arrow" />
      </p>
    </article>
  );
}
