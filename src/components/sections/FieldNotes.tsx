import Link from "next/link";
import { notes as copy } from "@/content/site-content";
import { getNotes } from "@/lib/notes";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { NoteCard } from "@/components/notes/NoteCard";
import { NotesEmpty } from "@/components/notes/NotesEmpty";

export async function FieldNotes() {
  const notes = await getNotes();
  const latest = notes.slice(0, 3);

  return (
    <section id="notes" data-chapter="10" aria-labelledby="notes-heading" className="relative py-[var(--section-y)]">
      <div className="container-site">
        <div className="flex flex-wrap items-end justify-between gap-8">
          <SectionHeading id="notes-heading" label={copy.label} heading={copy.heading} intro={copy.intro} />
          {notes.length > 0 && (
            <Link href="/notes" className="link-underline reveal pb-1 text-[15px] font-medium text-[color:var(--color-fg)]">
              All field notes ({notes.length}) →
            </Link>
          )}
        </div>

        <div className="mt-14 lg:mt-20">
          {latest.length > 0 ? (
            <ul className="grid gap-px border border-[color:var(--color-line)] bg-[color:var(--color-line)] md:grid-cols-2 lg:grid-cols-3">
              {latest.map((n, i) => (
                <li key={n.slug} className="reveal bg-[color:var(--color-ink)]" style={{ "--d": i } as React.CSSProperties}>
                  <NoteCard note={n} />
                </li>
              ))}
            </ul>
          ) : (
            <NotesEmpty />
          )}
        </div>
      </div>
    </section>
  );
}
