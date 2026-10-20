import type { Metadata } from "next";
import Link from "next/link";
import { engagements, fixLabels, pagePhotos, services } from "@/content/site-content";
import { cases } from "@/content/insights";
import { PageHeader, SectionHead } from "@/components/ui/Headings";
import { CtaBand } from "@/components/ui/CtaBand";
import { Arrow } from "@/components/ui/Arrow";
import { pick } from "@/content/photos";
import { Page } from "@/components/motion/Page";

export const metadata: Metadata = {
  title: "Services",
  description: "On-site diagnostics, then the fix the problem needs: software and tools, sensors and monitoring, process redesign, or data and forecasting.",
  alternates: { canonical: "/services" },
};

export default function ServicesPage() {
  const [diagnostic, ...fixes] = services.items;
  return (
    <Page>
      <PageHeader label={services.label} title={services.heading} intro={services.intro} photos={pick(pagePhotos.services)} />

      {/* Always first: the diagnostic */}
      <section aria-labelledby="diagnostic" className="container-site py-[var(--section-y)]">
        <article data-reveal="" className="card grid gap-8 p-8 sm:p-10 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <p className="label text-[color:var(--color-accent)]">Always first</p>
            <h2 id="diagnostic" className="h2 mt-4">
              {diagnostic.title}
            </h2>
            <p className="lead mt-5">{diagnostic.body}</p>
          </div>
          <div className="lg:col-span-4 lg:col-start-9">
            <p className="label text-[color:var(--color-fg-3)]">You get</p>
            <ul className="mt-4 flex flex-col gap-3">
              {diagnostic.deliverables.map((d) => (
                <li key={d} className="flex gap-3 border-b border-[color:var(--color-line)] pb-3">
                  <span aria-hidden className="text-[color:var(--color-accent)]">—</span>
                  {d}
                </li>
              ))}
            </ul>
          </div>
        </article>
      </section>

      {/* The four kinds of fix */}
      <section aria-labelledby="fixes" className="section border-t border-[color:var(--color-line)]">
        <div className="container-site">
          <SectionHead id="fixes" label="Then, the fix it needs" title="Four kinds of fix. We choose after we understand." />
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {fixes.map((sv) => {
              const examples = cases.filter((c) => c.fixType === sv.fix);
              return (
                <article key={sv.index} className="card flex flex-col p-7 sm:p-8">
                  <p className="label text-[color:var(--color-accent)]">{sv.fix && fixLabels[sv.fix]}</p>
                  <h3 className="h3 mt-3">{sv.title}</h3>
                  <p className="mt-3 leading-relaxed text-[color:var(--color-fg-2)]">{sv.body}</p>
                  <ul className="mt-5 flex flex-wrap gap-2">
                    {sv.deliverables.map((d) => (
                      <li key={d} className="rounded-full border border-[color:var(--color-line)] px-3 py-1 text-sm text-[color:var(--color-fg-2)]">
                        {d}
                      </li>
                    ))}
                  </ul>
                  {examples.length > 0 && (
                    <div className="mt-auto border-t border-[color:var(--color-line)] pt-5">
                      <p className="label text-[color:var(--color-fg-3)]">For example</p>
                      <ul className="mt-2 flex flex-col gap-1">
                        {examples.map((c) => (
                          <li key={c.slug}>
                            <Link href={`/insights/${c.slug}`} className="link inline-block py-1 text-[15px]">
                              {c.title}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* How we engage */}
      <section id="engage" aria-labelledby="engage-heading" className="paper section">
        <div className="container-site">
          <SectionHead id="engage-heading" label={engagements.label} title={engagements.heading} intro={engagements.intro} />
          <ol className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {engagements.steps.map((st) => (
              <li key={st.index} className="card flex flex-col p-6">
                <p className="label tabular-nums text-[color:var(--color-fg-3)]">Step {st.index}</p>
                <h3 className="h3 mt-3 text-[1.25rem]">{st.title}</h3>
                <p className="mt-1 text-sm font-medium text-[color:var(--color-accent)]">{st.time}</p>
                <p className="mt-4 text-[15px] leading-relaxed text-[color:var(--color-fg-2)]">{st.body}</p>
              </li>
            ))}
          </ol>
          <Link href={engagements.cta.href} className="btn btn-primary mt-10">
            {engagements.cta.label} <Arrow className="btn-arrow" />
          </Link>
        </div>
      </section>

      <CtaBand />
    </Page>
  );
}
