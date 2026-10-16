import type { MetadataRoute } from "next";
import { site } from "@/config/site";
import { getNotes } from "@/lib/notes";
import { work } from "@/content/site-content";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const notes = await getNotes();
  return [
    { url: site.url, changeFrequency: "monthly", priority: 1 },
    { url: `${site.url}/notes`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${site.url}/privacy`, changeFrequency: "yearly", priority: 0.2 },
    ...work.cases.map((c) => ({ url: `${site.url}/work/${c.slug}`, changeFrequency: "monthly" as const, priority: 0.8 })),
    ...notes.map((n) => ({
      url: `${site.url}/notes/${n.slug}`,
      lastModified: n.date,
      changeFrequency: "yearly" as const,
      priority: 0.6,
    })),
  ];
}
