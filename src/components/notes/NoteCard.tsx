import Link from "next/link";
import { formatNoteDate, type Note } from "@/lib/notes";
import { NoteCover } from "./NoteCover";

export function NoteCard({ note }: { note: Note }) {
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
        <h3 className="text-[1.375rem] leading-snug font-medium tracking-[-0.02em]">
          <Link href={`/notes/${note.slug}`} className="after:absolute after:inset-0">
            {note.title}
          </Link>
        </h3>
        <p className="text-[15px] leading-relaxed text-[color:var(--color-fg-2)]">{note.summary}</p>
        <span aria-hidden className="mt-auto pt-2 text-sm font-medium text-[color:var(--color-cyan)] transition-transform duration-[var(--duration-hover)] group-hover:translate-x-1">
          Read note →
        </span>
      </div>
    </article>
  );
}
