import type { Metadata } from "next";
import { work } from "@/content/site-content";
import { PageHeader } from "@/components/ui/Headings";
import { CtaBand } from "@/components/ui/CtaBand";
import { WorkCard } from "@/components/cards/WorkCard";
import { Page } from "@/components/motion/Page";

export const metadata: Metadata = {
  title: "Work",
  description: work.intro,
  alternates: { canonical: "/work" },
};

export default function WorkPage() {
  return (
    <Page>
      <PageHeader label={work.label} title={work.heading} intro={work.intro} />
      <section aria-label="Projects" className="container-site grid gap-6 py-[var(--section-y)] lg:grid-cols-2">
        {work.cases.map((cs, i) => (
          <WorkCard key={cs.slug} cs={cs} level={2} index={i} />
        ))}
      </section>
      <CtaBand />
    </Page>
  );
}
