import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatNoteDate, getNote, getNotes } from "@/lib/notes";
import { NoteCover } from "@/components/notes/NoteCover";

/**
 * Cache Components requires at least one param at build time. With no notes
 * published yet we hand it a reserved draft slug, which always 404s.
 */
/** Every note is generated at build time, so reading `params` here may block; that's expected. */
export const instant = false;

export async function generateStaticParams() {
  const notes = await getNotes();
  return notes.length ? notes.map((n) => ({ slug: n.slug })) : [{ slug: "_template" }];
}

export async function generateMetadata({ params }: PageProps<"/notes/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const note = await getNote(slug);
  if (!note) return { title: "Note not found" };
  return {
    title: note.title,
    description: note.summary,
    alternates: { canonical: `/notes/${slug}` },
    openGraph: { type: "article", title: note.title, description: note.summary, publishedTime: note.date },
  };
}

export default async function NotePage({ params }: PageProps<"/notes/[slug]">) {
  const { slug } = await params;
  const note = await getNote(slug);
  if (!note) notFound();
  const { default: Body } = (await import(`@/content/notes/${slug}.mdx`)) as { default: React.ComponentType };

  return (
    <main id="main" tabIndex={-1} className="relative z-[var(--z-content)] min-h-screen pt-[calc(var(--header-h)+clamp(3rem,8vw,6rem))] pb-[var(--section-y)]">
      <article className="container-site">
        <Link href="/notes" className="label link-underline pb-0.5 text-[color:var(--color-fg-2)]">
          ← All field notes
        </Link>
        <header className="mt-10 max-w-[48rem]">
          <p className="label flex flex-wrap gap-3 text-[color:var(--color-fg-2)]">
            <span className="text-[color:var(--color-cyan)]">{note.category}</span>
            <span aria-hidden>·</span>
            <time dateTime={note.date}>{formatNoteDate(note.date)}</time>
            <span aria-hidden>·</span>
            <span>{note.readingMinutes} min read</span>
          </p>
          <h1 className="mt-6 text-[clamp(2.25rem,1.4rem+3.4vw,4.25rem)] leading-[1.02] font-medium tracking-[-0.035em] text-balance">{note.title}</h1>
          <p className="mt-6 text-[length:var(--text-lead)] leading-[var(--text-lead--line-height)] text-[color:var(--color-fg-2)]">{note.summary}</p>
        </header>
        <NoteCover slug={note.slug} className="mt-12 aspect-[21/9] w-full" />
        <div className="prose-note mx-auto mt-14 max-w-[var(--container-prose)]">
          <Body />
        </div>
        {note.tags && note.tags.length > 0 && (
          <ul className="label mx-auto mt-14 flex max-w-[var(--container-prose)] flex-wrap gap-2 text-[color:var(--color-fg-2)]" aria-label="Tags">
            {note.tags.map((t) => (
              <li key={t} className="border border-[color:var(--color-line)] px-2.5 py-1">
                {t}
              </li>
            ))}
          </ul>
        )}
      </article>
    </main>
  );
}
