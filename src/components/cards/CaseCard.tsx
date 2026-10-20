import Link from "next/link";
import { fixLabels } from "@/content/site-content";
import { casePhotos, industries, type IndustryCase } from "@/content/insights";
import { pick } from "@/content/photos";
import { SitePhoto } from "@/components/ui/SitePhoto";
import { BeforeAfterChart } from "@/components/ui/BeforeAfterChart";
import { Arrow } from "@/components/ui/Arrow";

/**
 * An industry case as a card: two photos of the setting, the problem, the
 * kind of fix and a small before/after. `wide` lays it out side by side, for
 * a card that fills a row on its own.
 */
export function CaseCard({ c, level = 3, index = 0, wide = false }: { c: IndustryCase; level?: 2 | 3; index?: number; wide?: boolean }) {
  const H = level === 2 ? "h2" : "h3";
  return (
    <article className={`card card-link group flex h-full overflow-hidden ${wide ? "flex-col sm:flex-row" : "flex-col"}`} data-reveal="" style={{ ["--d" as string]: index }}>
      <SitePhoto photos={pick(casePhotos[c.slug] ?? [])} offset={index} sizes={wide ? "(min-width: 640px) 45vw, 100vw" : "(min-width: 768px) 33vw, 100vw"} className={wide ? "aspect-[16/9] sm:aspect-auto sm:w-[46%] sm:shrink-0" : "aspect-[16/9]"} />
      <div className="relative flex flex-1 flex-col p-6">
        <p className="label flex flex-wrap gap-x-3 gap-y-1 text-[color:var(--color-fg-3)]">
          <span>{industries[c.industry].site}</span>
          <span aria-hidden>/</span>
          <span className="text-[color:var(--color-accent)]">Fix: {fixLabels[c.fixType]}</span>
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
        <p className="label mt-5 flex items-center gap-2 text-[color:var(--color-fg)] transition-colors group-hover:text-[color:var(--color-accent)]">
          Read the case <Arrow className="arrow h-3.5 w-3.5" />
        </p>
      </div>
    </article>
  );
}
