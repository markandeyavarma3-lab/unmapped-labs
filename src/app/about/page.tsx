import type { Metadata } from "next";
import { about, approach, principles } from "@/content/site-content";
import { getNotes } from "@/lib/notes";
import { PageHeader, SectionHead } from "@/components/ui/Headings";
import { CtaBand } from "@/components/ui/CtaBand";
import { photos } from "@/content/photos";
import { Page } from "@/components/motion/Page";

export const metadata: Metadata = {
  title: "About",
  description: about.body[0],
  alternates: { canonical: "/about" },
};

export default async function AboutPage() {
  const published = (await getNotes()).length;
  // Every value here is true today and updates itself as we grow.
  const status = [
    { k: "Stage", v: "Early-stage startup" },
    { k: "Based in", v: "India" },
    { k: "Work so far", v: "One client project, one research platform" },
    { k: "Field notes", v: published === 0 ? "None published yet" : `${published} published` },
    { k: "Open to", v: "New problems, site visits, collaborators" },
  ];
  return (
    <Page>
      <PageHeader label={about.label} title={about.heading} photo={photos.teaFactory} />

      <section aria-label="Who we are" className="container-site grid gap-12 py-[var(--section-y)] lg:grid-cols-12">
        <div className="flex flex-col gap-6 lg:col-span-7">
          {about.body.map((p, i) => (
            <p key={i} className={i === 0 ? "display text-[1.8rem] leading-snug" : "text-[1.125rem] leading-relaxed text-[color:var(--color-fg-2)]"}>
              {p}
            </p>
          ))}
        </div>
        <dl className="card ticks self-start px-6 py-2 lg:col-span-4 lg:col-start-9">
          {status.map((s) => (
            <div key={s.k} className="grid grid-cols-[7.5rem_1fr] gap-4 border-b border-[color:var(--color-line)] py-4 last:border-b-0">
              <dt className="label pt-1 text-[color:var(--color-fg-3)]">{s.k}</dt>
              <dd className="text-[15px]">{s.v}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="principles-heading" className="paper section">
        <div className="container-site">
          <SectionHead id="principles-heading" label={principles.label} title={principles.heading} />
          <ol className="mt-12 grid gap-6 md:grid-cols-3">
            {principles.items.map((p, i) => (
              <li key={p.title} className="card p-7">
                <span className="label text-[color:var(--color-accent)]">0{i + 1}</span>
                <h3 className="h3 mt-4 text-[1.25rem]">{p.title}</h3>
                <p className="mt-3 leading-relaxed text-[color:var(--color-fg-2)]">{p.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section aria-labelledby="method-heading" className="section">
        <div className="container-site">
          <SectionHead id="method-heading" label={approach.label} title={approach.heading} intro={approach.intro} />
          <ol className="mt-12 grid gap-8 md:grid-cols-5 md:gap-6">
            {approach.stages.map((s) => (
              <li key={s.index} className="border-t-2 border-[color:var(--color-accent)] pt-5">
                <p className="label tabular-nums text-[color:var(--color-fg-3)]">{s.index}</p>
                <h3 className="h3 mt-2 text-[1.25rem]">{s.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-[color:var(--color-fg-2)]">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <CtaBand />
    </Page>
  );
}
