import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { fixLabels } from "@/content/site-content";
import { casePhotos, cases, getCase, industries } from "@/content/insights";
import { BeforeAfterChart } from "@/components/ui/BeforeAfterChart";
import { CtaBand } from "@/components/ui/CtaBand";
import { CaseCard } from "@/components/cards/CaseCard";
import { SitePhoto } from "@/components/ui/SitePhoto";
import { pick } from "@/content/photos";
import { Page } from "@/components/motion/Page";

/** Every case is known at build time. */
export const instant = false;

export function generateStaticParams() {
  return cases.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: PageProps<"/insights/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const c = getCase(slug);
  if (!c) return { title: "Case not found" };
  return {
    title: c.title,
    description: c.summary,
    alternates: { canonical: `/insights/${c.slug}` },
    openGraph: { type: "article", title: `${c.title} — Unmapped Labs`, description: c.summary },
  };
}

export default async function CasePage({ params }: PageProps<"/insights/[slug]">) {
  const { slug } = await params;
  const c = getCase(slug);
  if (!c) notFound();
  const casePics = pick(casePhotos[c.slug] ?? []);
  const related = cases.filter((x) => x.slug !== c.slug && (x.industry === c.industry || x.fixType === c.fixType)).slice(0, 3);
  const steps = [
    { id: "problem", label: "The problem", text: c.problem },
    { id: "measure", label: "What we'd measure on site", text: c.measure },
    { id: "fix", label: `The fix · ${fixLabels[c.fixType]}`, text: c.fix },
    { id: "result", label: "The result", text: c.result },
  ];

  return (
    <Page>
      <article>
        <header className="bp-grid border-b border-[color:var(--color-line)]">
          <div className="container-site grid gap-10 pt-[clamp(2.5rem,2rem+4vw,5rem)] pb-14 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-7">
              <Link href={`/insights#${c.industry}`} className="label link-underline inline-block py-1 text-[color:var(--color-fg-2)]">
                ← {industries[c.industry].title}
              </Link>
              <p className="label mt-8 flex flex-wrap gap-x-3 gap-y-1 text-[color:var(--color-fg-3)]">
                <span>{industries[c.industry].site}</span>
                <span aria-hidden>/</span>
                <span className="text-[color:var(--color-accent)]">Fix: {fixLabels[c.fixType]}</span>
                <span aria-hidden>/</span>
                <span>Illustrative case</span>
              </p>
              <h1 className="h-display mt-5 max-w-[16ch]" data-reveal="">
                {c.title}
              </h1>
              <p className="lead mt-6 max-w-[42rem]" data-reveal="" style={{ ["--d" as string]: 1 }}>
                {c.summary}
              </p>
            </div>
            {casePics.length > 0 && <SitePhoto photos={casePics} priority sizes="(min-width: 1024px) 40vw, 100vw" className="aspect-[4/3] lg:col-span-5" />}
          </div>
        </header>

        <div className="container-site grid gap-14 pt-14 pb-[var(--section-y)] lg:grid-cols-12">
          <ol className="flex flex-col gap-10 lg:col-span-6">
            {steps.map((s, i) => (
              <li key={s.id} className="flex gap-5 border-t border-[color:var(--color-line)] pt-6" data-reveal="" style={{ ["--d" as string]: i }}>
                <span className="label w-6 shrink-0 pt-0.5 text-[color:var(--color-accent)] tabular-nums">0{i + 1}</span>
                <section aria-labelledby={s.id}>
                  <h2 id={s.id} className="label text-[color:var(--color-fg-3)]">
                    {s.label}
                  </h2>
                  <p className="mt-3 text-[1.125rem] leading-relaxed">{s.text}</p>
                </section>
              </li>
            ))}
          </ol>

          <div className="flex flex-col gap-8 lg:col-span-5 lg:col-start-8">
            <div className="card bp-grid p-6" data-reveal="">
              <BeforeAfterChart figure={c.figure} />
            </div>
            <div className="border-l-2 border-[color:var(--color-accent)] pl-5">
              <p className="label text-[color:var(--color-accent)]">Typical, from the research</p>
              <p className="display mt-2 text-[1.4rem] leading-snug">{c.typical}</p>
            </div>
            <div>
              <h2 className="label text-[color:var(--color-fg-3)]">Sources</h2>
              <ol className="mt-3 flex list-decimal flex-col gap-2 pl-5 text-[15px]">
                {c.sources.map((s) => (
                  <li key={s.href}>
                    <a href={s.href} target="_blank" rel="noopener noreferrer" className="link">
                      {s.label}
                    </a>
                  </li>
                ))}
              </ol>
              <p className="mt-4 text-sm text-[color:var(--color-fg-3)]">
                An illustrative setting, not client work. The method and the typical figures come from the sources above; the chart shows the pattern, not measured data.
              </p>
            </div>
          </div>
        </div>

        {related.length > 0 && (
          <section aria-labelledby="related" className="border-t border-[color:var(--color-line)] bg-[color:var(--color-ink-3)] py-20">
            <div className="container-site">
              <h2 id="related" className="display text-[1.9rem]">
                Related cases
              </h2>
              <div className="mt-8 grid gap-6 md:grid-cols-3">
                {related.map((r, i) => (
                  <CaseCard key={r.slug} c={r} index={i} />
                ))}
              </div>
            </div>
          </section>
        )}
      </article>
      <CtaBand title="Seeing something like this?" body="Tell us what's happening. The first conversation is free, and we'll tell you honestly whether we can help." />
    </Page>
  );
}
