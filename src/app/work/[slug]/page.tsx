import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { work } from "@/content/site-content";
import { NoteCover } from "@/components/notes/NoteCover";
import { BtnLabel } from "@/components/ui/BtnLabel";

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
    <main id="main" tabIndex={-1} className="relative z-[var(--z-content)] min-h-screen pt-[calc(var(--header-h)+clamp(3rem,8vw,6rem))] pb-[var(--section-y)]">
      <article className="container-site">
        <Link href="/#work" className="label link-underline pb-0.5 text-[color:var(--color-fg-2)]">
          ← Selected work
        </Link>

        <header className="mt-10 grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <p className="label flex flex-wrap items-center gap-3">
              <span className={cs.kind === "Client project" ? "text-[color:var(--color-lime)]" : "text-[color:var(--color-cyan)]"}>{cs.kind}</span>
              <span aria-hidden className="text-[color:var(--color-fg-3)]">·</span>
              <span className="text-[color:var(--color-fg-2)]">{cs.sector}</span>
            </p>
            <h1 className="mt-6 text-[clamp(3rem,1.8rem+5vw,6.5rem)] leading-[0.92] font-medium tracking-[-0.05em]">{cs.name}</h1>
            <p className="mt-7 max-w-[38rem] text-[length:var(--text-lead)] leading-[var(--text-lead--line-height)] text-[color:var(--color-fg-2)]">{cs.oneLiner}</p>
          </div>
          <dl className="grid grid-cols-2 gap-px self-end border border-[color:var(--color-line)] bg-[color:var(--color-line)] lg:col-span-5">
            {cs.facts.map((f) => (
              <div key={f.label} className="bg-[color:var(--color-ink-2)] p-5">
                <dt className="sr-only">{f.label}</dt>
                <dd>
                  <span className="block text-[2rem] leading-none font-medium tracking-[-0.03em] tabular-nums">{f.value}</span>
                  <span className="label mt-2 block text-[color:var(--color-fg-3)]">{f.label}</span>
                </dd>
              </div>
            ))}
          </dl>
        </header>

        <NoteCover slug={cs.slug} label={cs.sector.toUpperCase()} className="mt-14 aspect-[21/8] w-full" />

        <div className="mt-16 grid gap-14 lg:grid-cols-12">
          <div className="flex flex-col gap-12 lg:col-span-7">
            <section aria-labelledby="problem">
              <h2 id="problem" className="label text-[color:var(--color-cyan)]">The problem</h2>
              <p className="mt-4 text-[1.1875rem] leading-relaxed text-[color:var(--color-fg)]">{cs.problem}</p>
            </section>
            <section aria-labelledby="insight">
              <h2 id="insight" className="label text-[color:var(--color-cyan)]">What we noticed</h2>
              <p className="mt-4 text-[1.1875rem] leading-relaxed text-[color:var(--color-fg)]">{cs.insight}</p>
            </section>
            <section aria-labelledby="built">
              <h2 id="built" className="label text-[color:var(--color-cyan)]">What we built</h2>
              <ul className="mt-5 flex flex-col gap-4">
                {cs.built.map((b) => (
                  <li key={b} className="flex gap-4 text-[1.0625rem] leading-relaxed text-[color:var(--color-fg-2)]">
                    <span aria-hidden className="mt-2.5 h-1.5 w-1.5 shrink-0 rotate-45 bg-[color:var(--color-cyan)]" />
                    {b}
                  </li>
                ))}
              </ul>
            </section>
            <section aria-labelledby="outcome" className="glass p-7">
              <h2 id="outcome" className="label text-[color:var(--color-lime)]">Outcome</h2>
              <p className="mt-4 text-[1.1875rem] leading-relaxed text-[color:var(--color-fg)]">{cs.outcome}</p>
            </section>
          </div>

          <aside className="flex flex-col gap-10 lg:col-span-4 lg:col-start-9">
            <section aria-labelledby="process">
              <h2 id="process" className="label text-[color:var(--color-fg-3)]">How the process played out</h2>
              <ol className="relative mt-6 border-l border-[color:var(--color-line)] pl-6">
                {cs.process.map((p, k) => (
                  <li key={p.stage} className="relative pb-6 last:pb-0">
                    <span aria-hidden className="absolute top-1.5 -left-[29px] block h-[9px] w-[9px] rotate-45 bg-[color:var(--color-cyan)]" />
                    <p className="label tabular-nums text-[color:var(--color-fg-3)]">0{k + 1}</p>
                    <p className="mt-1 font-medium text-[color:var(--color-fg)]">{p.stage}</p>
                    <p className="mt-1 text-[15px] leading-relaxed text-[color:var(--color-fg-2)]">{p.note}</p>
                  </li>
                ))}
              </ol>
            </section>
            <section aria-labelledby="stack">
              <h2 id="stack" className="label text-[color:var(--color-fg-3)]">Built with</h2>
              <ul className="mt-4 flex flex-wrap gap-2">
                {cs.stack.map((s) => (
                  <li key={s} className="label border border-[color:var(--color-line)] px-2.5 py-1 text-[color:var(--color-fg-2)]">
                    {s}
                  </li>
                ))}
              </ul>
            </section>
          </aside>
        </div>

        <footer className="mt-24 flex flex-col gap-8 border-t border-[color:var(--color-line)] pt-10 sm:flex-row sm:items-center sm:justify-between">
          <Link href={`/work/${next.slug}`} className="group">
            <span className="label text-[color:var(--color-fg-3)]">Next case study</span>
            <span className="mt-2 flex items-center gap-3 text-[clamp(1.6rem,1.2rem+1.4vw,2.4rem)] font-medium tracking-[-0.03em]">
              {next.name}
              <span aria-hidden className="transition-transform duration-[var(--duration-hover)] group-hover:translate-x-1.5">
                →
              </span>
            </span>
          </Link>
          <Link href="/#contact" className="btn btn-primary self-start sm:self-auto">
            <BtnLabel>Start a conversation</BtnLabel>
          </Link>
        </footer>
      </article>
    </main>
  );
}
