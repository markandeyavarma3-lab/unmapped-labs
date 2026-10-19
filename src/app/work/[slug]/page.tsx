import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { work } from "@/content/site-content";
import { Arrow } from "@/components/ui/Arrow";
import { CtaBand } from "@/components/ui/CtaBand";
import { Page } from "@/components/motion/Page";

/** Every project is known at build time. */
export const instant = false;

export function generateStaticParams() {
  return work.cases.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: PageProps<"/work/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const cs = work.cases.find((c) => c.slug === slug);
  if (!cs) return { title: "Case study not found" };
  return {
    title: `${cs.name} — case study`,
    description: cs.oneLiner,
    alternates: { canonical: `/work/${cs.slug}` },
    openGraph: { type: "article", title: `${cs.name} — Unmapped Labs`, description: cs.oneLiner },
  };
}

export default async function CaseStudyPage({ params }: PageProps<"/work/[slug]">) {
  const { slug } = await params;
  const i = work.cases.findIndex((c) => c.slug === slug);
  if (i < 0) notFound();
  const cs = work.cases[i];
  const next = work.cases[(i + 1) % work.cases.length];

  return (
    <Page>
      <article>
        <header className="container-site pt-[clamp(2.5rem,2rem+4vw,5rem)] pb-14">
          <Link href="/work" className="link-underline inline-block py-1 text-sm text-[color:var(--color-fg-2)]">
            ← All work
          </Link>
          <p className="label mt-8 flex flex-wrap gap-x-3 gap-y-1">
            <span className="text-[color:var(--color-accent)]">{cs.kind}</span>
            <span aria-hidden className="text-[color:var(--color-fg-3)]">·</span>
            <span className="text-[color:var(--color-fg-3)]">{cs.sector}</span>
          </p>
          <h1 className="h-display mt-5">{cs.name}</h1>
          <p className="lead mt-6 max-w-[44rem]">{cs.oneLiner}</p>
          <dl className="mt-12 grid grid-cols-2 gap-x-8 gap-y-6 border-t border-[color:var(--color-line)] pt-8 md:grid-cols-4">
            {cs.facts.map((f) => (
              <div key={f.label}>
                <dt className="sr-only">{f.label}</dt>
                <dd>
                  <span className="display block text-[2.4rem] leading-none tabular-nums">{f.value}</span>
                  <span className="mt-2 block text-sm text-[color:var(--color-fg-3)]">{f.label}</span>
                </dd>
              </div>
            ))}
          </dl>
        </header>

        <div className="container-site grid gap-14 border-t border-[color:var(--color-line)] pt-14 pb-[var(--section-y)] lg:grid-cols-12">
          <div className="flex flex-col gap-12 lg:col-span-7">
            <section aria-labelledby="problem">
              <h2 id="problem" className="label text-[color:var(--color-accent)]">The problem</h2>
              <p className="mt-4 text-[1.1875rem] leading-relaxed">{cs.problem}</p>
            </section>
            <section aria-labelledby="insight">
              <h2 id="insight" className="label text-[color:var(--color-accent)]">What we noticed</h2>
              <p className="mt-4 text-[1.1875rem] leading-relaxed">{cs.insight}</p>
            </section>
            <section aria-labelledby="built">
              <h2 id="built" className="label text-[color:var(--color-accent)]">What we built</h2>
              <ul className="mt-5 flex flex-col gap-4">
                {cs.built.map((b) => (
                  <li key={b} className="flex gap-4 text-[1.0625rem] leading-relaxed text-[color:var(--color-fg-2)]">
                    <span aria-hidden className="text-[color:var(--color-accent)]">—</span>
                    {b}
                  </li>
                ))}
              </ul>
            </section>
            <section aria-labelledby="outcome" className="card p-7">
              <h2 id="outcome" className="label text-[color:var(--color-good)]">Outcome</h2>
              <p className="display mt-4 text-[1.5rem] leading-snug">{cs.outcome}</p>
            </section>
          </div>

          <div className="flex flex-col gap-10 lg:col-span-4 lg:col-start-9">
            <section aria-labelledby="process">
              <h2 id="process" className="label text-[color:var(--color-fg-3)]">How the process played out</h2>
              <ol className="mt-5 flex flex-col">
                {cs.process.map((p, k) => (
                  <li key={p.stage} className="border-t border-[color:var(--color-line)] py-4">
                    <p className="text-sm font-semibold">
                      <span className="mr-2 tabular-nums text-[color:var(--color-fg-3)]">0{k + 1}</span>
                      {p.stage}
                    </p>
                    <p className="mt-1 text-[15px] leading-relaxed text-[color:var(--color-fg-2)]">{p.note}</p>
                  </li>
                ))}
              </ol>
            </section>
            <section aria-labelledby="stack">
              <h2 id="stack" className="label text-[color:var(--color-fg-3)]">Built with</h2>
              <ul className="mt-4 flex flex-wrap gap-2">
                {cs.stack.map((s) => (
                  <li key={s} className="rounded-full border border-[color:var(--color-line)] px-3 py-1 text-sm text-[color:var(--color-fg-2)]">
                    {s}
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>

        <nav aria-label="More work" className="container-site border-t border-[color:var(--color-line)] py-10">
          <Link href={`/work/${next.slug}`} className="group inline-block">
            <span className="label text-[color:var(--color-fg-3)]">Next project</span>
            <span className="display mt-2 flex items-center gap-3 text-[2rem]">
              {next.name} <Arrow className="arrow transition-transform group-hover:translate-x-1" />
            </span>
          </Link>
        </nav>
      </article>
      <CtaBand />
    </Page>
  );
}
