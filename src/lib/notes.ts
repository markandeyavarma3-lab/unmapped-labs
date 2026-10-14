import fs from "node:fs";
import path from "node:path";

/**
 * Field Notes live in src/content/notes/*.mdx. Each file exports `meta`.
 * Files starting with "_" are drafts/templates and are never published.
 */

export type NoteMeta = {
  title: string;
  /** ISO date, e.g. "2026-11-02" */
  date: string;
  category: string;
  summary: string;
  tags?: string[];
};

export type Note = NoteMeta & { slug: string; readingMinutes: number };

const DIR = path.join(process.cwd(), "src", "content", "notes");

function publishedSlugs(): string[] {
  if (!fs.existsSync(DIR)) return [];
  return fs
    .readdirSync(DIR)
    .filter((f) => f.endsWith(".mdx") && !f.startsWith("_"))
    .map((f) => f.replace(/\.mdx$/, ""));
}

function readingMinutes(slug: string) {
  const raw = fs.readFileSync(path.join(DIR, `${slug}.mdx`), "utf8");
  const words = raw
    .replace(/export const meta[\s\S]*?\n};?\n/, "")
    .replace(/<[^>]+>|[#>*_`[\]()-]/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}

export async function getNote(slug: string): Promise<Note | null> {
  if (slug.startsWith("_") || !publishedSlugs().includes(slug)) return null;
  const mod = (await import(`@/content/notes/${slug}.mdx`)) as { meta: NoteMeta };
  return { ...mod.meta, slug, readingMinutes: readingMinutes(slug) };
}

export async function getNotes(): Promise<Note[]> {
  const notes = await Promise.all(publishedSlugs().map(getNote));
  return notes.filter((n): n is Note => n !== null).sort((a, b) => b.date.localeCompare(a.date));
}

export const formatNoteDate = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${iso}T00:00:00Z`),
  );
