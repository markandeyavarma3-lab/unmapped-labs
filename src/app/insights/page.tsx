import type { Metadata } from "next";
import Link from "next/link";
import { cases, industries, insightsPage, type Industry } from "@/content/insights";
import { notes as notesCopy } from "@/content/site-content";
import { getNotes, formatNoteDate } from "@/lib/notes";
import { PageHeader } from "@/components/ui/Headings";
import { CtaBand } from "@/components/ui/CtaBand";
import { Arrow } from "@/components/ui/Arrow";
import { CaseCard } from "@/components/cards/CaseCard";

export const metadata: Metadata = {
  title: "Insights",
  description: insightsPage.intro,
  alternates: { canonical: "/insights" },
};

export default async function InsightsPage() {
  const notes = await getNotes();
  return (
    <main id="main" tabIndex={-1}>
      <PageHeader label={insightsPage.label} title={insightsPage.heading} intro={insightsPage.intro}>
        <nav aria-label="Industries" className="mt-8 flex flex-wrap gap-2">
          {(Object.keys(industries) as Industry[]).map((k) => (
            <a key={k} href={`#${k}`} className="rounded-full border border-[color:var(--color-line-strong)] px-4 py-2 text-[15px] hover:border-[color:var(--color-fg)]">
              {industries[k].title}
            </a>
          ))}
          <a href="#notes" className="rounded-full border border-[color:var(--color-line-strong)] px-4 py-2 text-[15px] hover:border-[color:var(--color-fg)]">
            {notesCopy.label}
          </a>
        </nav>
      </PageHeader>

      {(Object.keys(industries) as Industry[]).map((k) => {
        const list = cases.filter((c) => c.industry === k);
        return (
          <section key={k} id={k} aria-labelledby={`${k}-heading`} className="border-t border-[color:var(--color-line)] py-14">
            <div className="container-site grid gap-8 lg:grid-cols-12">
              <div className="lg:col-span-3">
                <h2 id={`${k}-heading`} className="serif text-[1.9rem] leading-tight">
                  {industries[k].title}
                </h2>
                <p className="mt-3 text-[15px] leading-relaxed text-[color:var(--color-fg-2)]">{industries[k].body}</p>
              </div>
              <div className="grid gap-6 sm:grid-cols-2 lg:col-span-9 lg:grid-cols-3">
                {list.map((c) => (
                  <CaseCard key={c.slug} c={c} />
                ))}
              </div>
            </div>
          </section>
        );
      })}

      <section id="notes" aria-labelledby="notes-heading" className="border-t border-[color:var(--color-line)] bg-[color:var(--color-ink-3)] py-14">
        <div className="container-site grid gap-8 lg:grid-cols-12">
          <div className="lg:col-span-3">
            <h2 id="notes-heading" className="serif text-[1.9rem] leading-tight">
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
                  <span className="serif text-2xl">{n.title}</span>
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
    </main>
  );
}
