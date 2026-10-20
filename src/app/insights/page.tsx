import type { Metadata } from "next";
import Link from "next/link";
import { cases, industries, insightsPage, type Industry } from "@/content/insights";
import { notes as notesCopy } from "@/content/site-content";
import { getNotes, formatNoteDate } from "@/lib/notes";
import { PageHeader } from "@/components/ui/Headings";
import { CtaBand } from "@/components/ui/CtaBand";
import { Arrow } from "@/components/ui/Arrow";
import { CaseCard } from "@/components/cards/CaseCard";
import { SitePhoto } from "@/components/ui/SitePhoto";
import { pick } from "@/content/photos";
import { industryPhotos } from "@/content/insights";
import { pagePhotos } from "@/content/site-content";
import { Page } from "@/components/motion/Page";

export const metadata: Metadata = {
  title: "Insights",
  description: insightsPage.intro,
  alternates: { canonical: "/insights" },
};

export default async function InsightsPage() {
  const notes = await getNotes();
  return (
    <Page>
      <PageHeader label={insightsPage.label} title={insightsPage.heading} intro={insightsPage.intro} photos={pick(pagePhotos.insights)}>
        <nav aria-label="Industries" className="mt-8 flex flex-wrap gap-2">
          {(Object.keys(industries) as Industry[]).map((k) => (
            <a key={k} href={`#${k}`} className="label rounded-[2px] border border-[color:var(--color-line-strong)] px-3 py-2.5 hover:border-[color:var(--color-accent)] hover:text-[color:var(--color-accent)]">
              {industries[k].title}
            </a>
          ))}
          <a href="#notes" className="label rounded-[2px] border border-[color:var(--color-line-strong)] px-3 py-2.5 hover:border-[color:var(--color-accent)] hover:text-[color:var(--color-accent)]">
            {notesCopy.label}
          </a>
        </nav>
      </PageHeader>

      {(Object.keys(industries) as Industry[]).map((k) => {
        const list = cases.filter((c) => c.industry === k);
        return (
          <section key={k} id={k} aria-labelledby={`${k}-heading`} className="border-t border-[color:var(--color-line)] py-20">
            <div className="container-site grid gap-8 lg:grid-cols-12">
              <div className="lg:col-span-4">
                <h2 id={`${k}-heading`} className="display text-[2.2rem] leading-tight">
                  {industries[k].title}
                </h2>
                <p className="mt-3 text-[15px] leading-relaxed text-[color:var(--color-fg-2)]">{industries[k].body}</p>
                <SitePhoto photos={pick(industryPhotos[k])} offset={2} sizes="(min-width: 1024px) 30vw, 100vw" className="mt-6 hidden aspect-[4/3] lg:block" />
              </div>
              <div className="grid content-start gap-6 sm:grid-cols-2 lg:col-span-8">
                {list.map((c, i) => {
                  // An odd card out takes the whole row instead of leaving a gap.
                  const wide = list.length % 2 === 1 && i === list.length - 1;
                  return (
                    <div key={c.slug} className={wide ? "sm:col-span-2" : undefined}>
                      <CaseCard c={c} index={i} wide={wide} />
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        );
      })}

      <section id="notes" aria-labelledby="notes-heading" className="paper py-20">
        <div className="container-site grid gap-8 lg:grid-cols-12">
          <div className="lg:col-span-3">
            <h2 id="notes-heading" className="display text-[1.9rem] leading-tight">
              {notesCopy.heading}
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-[color:var(--color-fg-2)]">{notesCopy.intro}</p>
          </div>
          <ul className="flex flex-col gap-4 lg:col-span-9">
            {notes.map((n) => (
              <li key={n.slug}>
                <Link href={`/notes/${n.slug}`} className="card card-link group flex flex-col gap-2 p-6">
                  <span className="label text-[color:var(--color-fg-3)]">
                    {n.category} · {formatNoteDate(n.date)} · {n.readingMinutes} min read
                  </span>
                  <span className="display text-2xl">{n.title}</span>
                  <span className="text-[15px] leading-relaxed text-[color:var(--color-fg-2)]">{n.summary}</span>
                  <span className="mt-2 flex items-center gap-2 text-sm font-semibold">
                    Read the note <Arrow className="arrow" />
                  </span>
                </Link>
              </li>
            ))}
            {notes.length === 0 && <li className="text-[color:var(--color-fg-2)]">{notesCopy.empty.body}</li>}
          </ul>
        </div>
      </section>

      <CtaBand />
    </Page>
  );
}
