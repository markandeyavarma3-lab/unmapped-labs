import { approach } from "@/content/site-content";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ProcessMap } from "./ProcessMap";

export function Approach() {
  return (
    <section id="approach" data-chapter="2" aria-labelledby="approach-heading" className="relative py-[var(--section-y)]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(8,11,14,0.78)_14%,rgba(8,11,14,0.78)_86%,transparent)]"
      />
      <div className="container-site relative">
        <SectionHeading id="approach-heading" label={approach.label} heading={approach.heading} intro={approach.intro} />
        <ProcessMap stages={approach.stages} />
      </div>
    </section>
  );
}
