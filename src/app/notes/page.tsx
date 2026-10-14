import type { Metadata } from "next";
import { notes as copy } from "@/content/site-content";
import { getNotes } from "@/lib/notes";
import { NoteCard } from "@/components/notes/NoteCard";
import { NotesEmpty } from "@/components/notes/NotesEmpty";

export const metadata: Metadata = {
  title: "Field Notes",
  description: copy.intro,
  alternates: { canonical: "/notes" },
};

export default async function NotesIndex() {
  const notes = await getNotes();
  const categories = Array.from(new Set(notes.map((n) => n.category)));

  return (
    <main id="main" tabIndex={-1} className="surface-paper relative z-[var(--z-content)] min-h-screen pt-[calc(var(--header-h)+clamp(4rem,10vw,8rem))] pb-[var(--section-y)]">
      <div className="container-site">
        <p className="label flex items-center gap-3 text-[color:var(--color-paper-fg-2)]">
          <span aria-hidden className="h-px w-6 bg-[color:var(--color-teal)]" />
          Field notes {notes.length > 0 && `· ${notes.length} published`}
        </p>
        <h1 className="mt-6 max-w-[16ch] text-[length:var(--text-h2)] leading-[var(--text-h2--line-height)] font-medium tracking-[var(--text-h2--letter-spacing)]">
          {copy.heading}
        </h1>
        <p className="mt-7 max-w-[36rem] text-[length:var(--text-lead)] leading-[var(--text-lead--line-height)] text-[color:var(--color-paper-fg-2)]">
          {copy.intro}
        </p>

        {categories.length > 1 && (
          <p className="label mt-10 flex flex-wrap gap-x-5 gap-y-2 text-[color:var(--color-paper-fg-2)]">
            <span className="text-[color:var(--color-paper-fg)]">Categories:</span>
            {categories.map((c) => (
              <span key={c}>{c}</span>
            ))}
          </p>
        )}

        <div className="mt-14">
          {notes.length > 0 ? (
            <ul className="grid gap-px border border-[color:var(--color-paper-line)] bg-[color:var(--color-paper-line)] md:grid-cols-2 lg:grid-cols-3">
              {notes.map((n) => (
                <li key={n.slug} className="bg-[color:var(--color-paper)]">
                  <NoteCard note={n} />
                </li>
              ))}
            </ul>
          ) : (
            <NotesEmpty />
          )}
        </div>
      </div>
    </main>
  );
}
