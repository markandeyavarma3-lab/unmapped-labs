import type { Metadata } from "next";
import { work } from "@/content/site-content";
import { PageHeader } from "@/components/ui/Headings";
import { CtaBand } from "@/components/ui/CtaBand";
import { WorkCard } from "@/components/cards/WorkCard";

export const metadata: Metadata = {
  title: "Work",
  description: work.intro,
  alternates: { canonical: "/work" },
};

export default function WorkPage() {
  return (
    <main id="main" tabIndex={-1}>
      <PageHeader label={work.label} title={work.heading} intro={work.intro} />
      <section aria-label="Projects" className="container-site grid gap-6 pb-[var(--section-y)] lg:grid-cols-2">
        {work.cases.map((cs) => (
          <WorkCard key={cs.slug} cs={cs} level={2} />
        ))}
      </section>
      <CtaBand />
    </main>
  );
}
