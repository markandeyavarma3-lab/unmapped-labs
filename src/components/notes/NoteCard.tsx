import Link from "next/link";
import { formatNoteDate, type Note } from "@/lib/notes";
import { NoteCover } from "./NoteCover";

/** `level`: the heading level that fits where the card sits (3 under a section heading, 2 on the notes index). */
export function NoteCard({ note, level = 3 }: { note: Note; level?: 2 | 3 }) {
  const H = level === 2 ? "h2" : "h3";
  return (
    <article className="group relative flex h-full flex-col">
      <div className="glint relative aspect-[16/10] overflow-hidden">
        <NoteCover
          slug={note.slug}
          label={note.category.toUpperCase()}
          className="h-full w-full transition-transform duration-[900ms] ease-[var(--ease-out-expo)] group-hover:scale-[1.04]"
        />
      </div>
      <div className="flex flex-1 flex-col gap-4 p-6 lg:p-7">
        <p className="label flex gap-3 text-[color:var(--color-fg-2)]">
          <time dateTime={note.date}>{formatNoteDate(note.date)}</time>
          <span aria-hidden>·</span>
          <span>{note.readingMinutes} min read</span>
        </p>
        <H className="text-[1.375rem] leading-snug font-medium tracking-[-0.02em]">
          <Link href={`/notes/${note.slug}`} className="after:absolute after:inset-0">
            {note.title}
          </Link>
        </H>
        <p className="text-[15px] leading-relaxed text-[color:var(--color-fg-2)]">{note.summary}</p>
        <span aria-hidden className="mt-auto pt-2 text-sm font-medium text-[color:var(--color-cyan)] transition-transform duration-[var(--duration-hover)] group-hover:translate-x-1">
          Read note →
        </span>
      </div>
    </article>
  );
}
