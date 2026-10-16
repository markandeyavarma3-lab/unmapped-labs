import { engagements } from "@/content/site-content";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { BtnLabel } from "@/components/ui/BtnLabel";

/** How working together runs, step by step, and the mid-page way in. */
export function Engagements() {
  return (
    <section id="engage" aria-labelledby="engage-heading" className="relative py-[var(--section-y)]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(247,242,233,0.85)_14%,rgba(247,242,233,0.85)_86%,transparent)]"
      />
      <div className="container-site relative">
        <SectionHeading id="engage-heading" label={engagements.label} heading={engagements.heading} intro={engagements.intro} />
        <ol className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {engagements.steps.map((st, i) => (
            <li key={st.index} className="reveal-card glass flex flex-col p-6 sm:p-7" style={{ "--d": i } as React.CSSProperties}>
              <span className="label tabular-nums text-[color:var(--color-cyan)]">{st.index}</span>
              <h3 className="mt-4 text-[1.375rem] leading-tight font-medium tracking-[-0.02em]">{st.title}</h3>
              <p className="label mt-2 text-[color:var(--color-fg-2)]">{st.time}</p>
              <p className="mt-4 text-[15px] leading-relaxed text-[color:var(--color-fg-2)]">{st.body}</p>
            </li>
          ))}
        </ol>
        <div className="reveal mt-10">
          <a href={engagements.cta.href} className="btn btn-primary">
            <BtnLabel>{engagements.cta.label}</BtnLabel>
            <span aria-hidden className="btn-arrow">→</span>
          </a>
        </div>
      </div>
    </section>
  );
}
