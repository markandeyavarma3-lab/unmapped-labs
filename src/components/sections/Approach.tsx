import { approach } from "@/content/site-content";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ProcessMap } from "./ProcessMap";

export function Approach() {
  return (
    <section id="approach" data-chapter="4" aria-labelledby="approach-heading" className="relative pt-[var(--section-y)]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[80vh] bg-[linear-gradient(180deg,transparent,rgba(8,11,14,0.72)_30%,transparent)]"
      />
      <div className="container-site relative">
        <SectionHeading id="approach-heading" label={approach.label} heading={approach.heading} intro={approach.intro} />
      </div>
      <ProcessMap stages={approach.stages} />
    </section>
  );
}
