import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { fixLabels } from "@/content/site-content";
import { cases, getCase, industries } from "@/content/insights";
import { BeforeAfterChart } from "@/components/ui/BeforeAfterChart";
import { CtaBand } from "@/components/ui/CtaBand";
import { CaseCard } from "@/components/cards/CaseCard";

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
  const related = cases.filter((x) => x.slug !== c.slug && (x.industry === c.industry || x.fixType === c.fixType)).slice(0, 3);
  const steps = [
    { id: "problem", label: "The problem", text: c.problem },
    { id: "measure", label: "What we'd measure on site", text: c.measure },
    { id: "fix", label: `The fix · ${fixLabels[c.fixType]}`, text: c.fix },
    { id: "result", label: "The result", text: c.result },
  ];

  return (
    <main id="main" tabIndex={-1}>
      <article>
        <header className="container-site pt-[clamp(2.5rem,2rem+4vw,5rem)] pb-12">
          <Link href={`/insights#${c.industry}`} className="link-underline inline-block py-1 text-sm text-[color:var(--color-fg-2)]">
            ← {industries[c.industry].title}
          </Link>
          <p className="label mt-8 flex flex-wrap gap-x-3 gap-y-1 text-[color:var(--color-fg-3)]">
            <span>{industries[c.industry].site}</span>
            <span aria-hidden>·</span>
            <span className="text-[color:var(--color-cyan)]">Fix: {fixLabels[c.fixType]}</span>
            <span aria-hidden>·</span>
            <span>Illustrative case</span>
          </p>
          <h1 className="h-display mt-5 max-w-[18ch]">{c.title}</h1>
          <p className="lead mt-6 max-w-[42rem]">{c.summary}</p>
        </header>

        <div className="container-site grid gap-14 border-t border-[color:var(--color-line)] pt-12 pb-[var(--section-y)] lg:grid-cols-12">
          <ol className="flex flex-col gap-10 lg:col-span-6">
            {steps.map((s, i) => (
              <li key={s.id} className="flex gap-5">
                <span className="serif w-6 shrink-0 text-2xl leading-none text-[color:var(--color-fg-3)] tabular-nums">{i + 1}</span>
                <section aria-labelledby={s.id}>
                  <h2 id={s.id} className="label text-[color:var(--color-cyan)]">
                    {s.label}
                  </h2>
                  <p className="mt-3 text-[1.125rem] leading-relaxed">{s.text}</p>
                </section>
              </li>
            ))}
          </ol>

          <div className="flex flex-col gap-8 lg:col-span-5 lg:col-start-8">
            <div className="card p-6">
              <BeforeAfterChart figure={c.figure} />
            </div>
            <div className="border-l-2 border-[color:var(--color-cyan)] pl-5">
              <p className="label text-[color:var(--color-cyan)]">Typical, from the research</p>
              <p className="serif mt-2 text-[1.35rem] leading-snug">{c.typical}</p>
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
          <section aria-labelledby="related" className="border-t border-[color:var(--color-line)] bg-[color:var(--color-ink-3)] py-14">
            <div className="container-site">
              <h2 id="related" className="serif text-[1.9rem]">
                Related cases
              </h2>
              <div className="mt-8 grid gap-6 md:grid-cols-3">
                {related.map((r) => (
                  <CaseCard key={r.slug} c={r} />
                ))}
              </div>
            </div>
          </section>
        )}
      </article>
      <CtaBand title="Seeing something like this?" body="Tell us what's happening. The first conversation is free, and we'll tell you honestly whether we can help." />
    </main>
  );
}
