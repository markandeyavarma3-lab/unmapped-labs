import { approach } from "@/content/site-content";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ProcessMap } from "./ProcessMap";

export function Approach() {
  return (
    <section id="approach" data-chapter="4" aria-labelledby="approach-heading" className="relative py-[var(--section-y)]">
      {/* Veil on the text column only; the island panel stays clear. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(8,11,14,0.55)_0%,rgba(8,11,14,0.35)_45%,rgba(8,11,14,0.82)_62%,rgba(8,11,14,0.82)_100%)] max-lg:bg-[rgba(8,11,14,0.7)]"
      />
      <div className="container-site relative">
        <SectionHeading id="approach-heading" label={approach.label} heading={approach.heading} intro={approach.intro} />
        <ProcessMap stages={approach.stages} />
      </div>
    </section>
  );
}
