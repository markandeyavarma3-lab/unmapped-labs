import type { MetadataRoute } from "next";
import { site } from "@/config/site";
import { getNotes } from "@/lib/notes";
import { work } from "@/content/site-content";
import { cases } from "@/content/insights";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const notes = await getNotes();
  const page = (path: string, priority: number, changeFrequency: "weekly" | "monthly" | "yearly" = "monthly") => ({ url: `${site.url}${path}`, changeFrequency, priority });
  return [
    page("", 1),
    page("/services", 0.9),
    page("/work", 0.8),
    page("/insights", 0.8, "weekly"),
    page("/about", 0.7),
    page("/contact", 0.7),
    page("/privacy", 0.2, "yearly"),
    ...work.cases.map((c) => page(`/work/${c.slug}`, 0.7)),
    ...cases.map((c) => page(`/insights/${c.slug}`, 0.6)),
    ...notes.map((n) => ({ ...page(`/notes/${n.slug}`, 0.6, "yearly"), lastModified: n.date })),
  ];
}
