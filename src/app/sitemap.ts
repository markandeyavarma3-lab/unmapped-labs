import type { MetadataRoute } from "next";
import { site } from "@/config/site";
import { getNotes } from "@/lib/notes";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const notes = await getNotes();
  return [
    { url: site.url, changeFrequency: "monthly", priority: 1 },
    { url: `${site.url}/notes`, changeFrequency: "weekly", priority: 0.7 },
    ...notes.map((n) => ({
      url: `${site.url}/notes/${n.slug}`,
      lastModified: n.date,
      changeFrequency: "yearly" as const,
      priority: 0.6,
    })),
  ];
}
