import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatNoteDate, getNote, getNotes } from "@/lib/notes";
import { NoteCover } from "@/components/notes/NoteCover";
import { CtaBand } from "@/components/ui/CtaBand";

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
    <main id="main" tabIndex={-1}>
      <article>
        <header className="container-site max-w-[52rem] pt-[clamp(2.5rem,2rem+4vw,5rem)]">
          <Link href="/insights#notes" className="link-underline inline-block py-1 text-sm text-[color:var(--color-fg-2)]">
            ← Field notes
          </Link>
          <p className="label mt-8 flex flex-wrap gap-x-3 gap-y-1 text-[color:var(--color-fg-3)]">
            <span className="text-[color:var(--color-cyan)]">{note.category}</span>
            <span aria-hidden>·</span>
            <time dateTime={note.date}>{formatNoteDate(note.date)}</time>
            <span aria-hidden>·</span>
            <span>{note.readingMinutes} min read</span>
          </p>
          <h1 className="h-display mt-5">{note.title}</h1>
          <p className="lead mt-6">{note.summary}</p>
        </header>
        <div className="container-site max-w-[52rem]">
          <NoteCover slug={note.slug} className="mt-12 aspect-[21/9] w-full rounded-md border border-[color:var(--color-line)]" />
        </div>
        <div className="prose-note container-site mt-12 max-w-[calc(var(--container-prose)+2*var(--gutter))] pb-[var(--section-y)]">
          <Body />
        </div>
      </article>
      <CtaBand />
    </main>
  );
}
