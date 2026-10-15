import { fixLabels, focus } from "@/content/site-content";
import { DISTRICTS } from "@/components/three/city-layout";
import { SectionHeading } from "@/components/ui/SectionHeading";

/**
 * Five districts of the city. Each row is a stop on the journey: the camera
 * flies to the district while it plays an example — bottleneck, diagnosis,
 * and the fix the problem actually needs.
 */
export function FocusAreas() {
  return (
    <section id="focus" aria-labelledby="focus-heading" className="relative pt-[var(--section-y)]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[70vh] bg-[linear-gradient(180deg,transparent,rgba(247,242,233,0.75)_35%,transparent)]"
      />
      <div className="container-site relative grid gap-8 lg:grid-cols-12">
        <SectionHeading id="focus-heading" label={focus.label} heading={focus.heading} className="lg:col-span-7" />
        <p className="reveal self-end text-[length:var(--text-lead)] leading-[var(--text-lead--line-height)] text-[color:var(--color-fg-2)] lg:col-span-4 lg:col-start-9">
          {focus.intro}
        </p>
      </div>

      <ol className="relative mt-[10vh]">
        {focus.areas.map((area, i) => {
          const t = DISTRICTS[(["farms", "logistics", "healthcare", "energy", "open"] as const)[i]];
          const open = area.id === "open";
          return (
            <li key={area.id} id={`focus-${area.id}`} className="relative territory flex min-h-[140svh] items-center">
              {/* The journey reaches this stop when the card is centred on screen. */}
              <span aria-hidden data-chapter={5 + i} className="pointer-events-none absolute top-1/2 h-px w-px" />
              <div className="container-site">
                <article className={`territory-card reveal-card glass max-w-[30rem] p-7 sm:p-9 ${open ? "is-open" : ""}`}>
                  <div className="flex items-center justify-between gap-4">
                    <span className="flex items-center gap-3">
                      <span aria-hidden className={`territory-index label flex h-9 w-9 items-center justify-center border ${open ? "border-dashed" : ""}`}>
                        {area.index}
                      </span>
                      <span className="label text-[color:var(--color-fg-3)]">District {area.index}</span>
                    </span>
                    <span aria-hidden className="label tabular-nums text-[color:var(--color-fg-3)]">
                      {t.x.toFixed(1)}, {t.z.toFixed(1)}
                    </span>
                  </div>
                  <h3 className="mt-6 text-[clamp(1.7rem,1.2rem+1.6vw,2.5rem)] leading-[1.05] font-medium tracking-[-0.03em]">{area.title}</h3>
                  <p className="mt-4 text-[1.0625rem] leading-relaxed text-[color:var(--color-fg-2)]">{area.body}</p>
                  <ul className="mt-6 flex flex-wrap gap-2" aria-label="Themes">
                    {area.keywords.map((k) => (
                      <li key={k} className="label border border-[color:var(--color-line)] px-2.5 py-1 text-[color:var(--color-fg-2)]">
                        {k}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-7 border-t border-[color:var(--color-line)] pt-5">
                    <p className="label text-[color:var(--color-fg-3)]">Example scenario</p>
                    <p className="mt-3 flex gap-2.5 text-[15px] leading-snug text-[color:var(--color-fg)]">
                      <span aria-hidden className="mt-1.5 h-1.5 w-1.5 shrink-0 rotate-45 bg-[color:var(--color-red)]" />
                      {area.scenario.problem}
                    </p>
                    <p className="mt-3 flex flex-wrap items-center gap-2.5 text-[15px] leading-snug text-[color:var(--color-fg-2)]">
                      {area.scenario.fix ? (
                        <span className="label border border-[color:var(--color-lime)]/60 bg-[color:var(--color-lime)] px-2 py-0.5 text-[color:var(--color-on-accent)]">
                          Fix: {fixLabels[area.scenario.fix]}
                        </span>
                      ) : (
                        <span className="label border border-dashed border-[color:var(--color-fg-3)] px-2 py-0.5 text-[color:var(--color-fg-3)]">Fix: ?</span>
                      )}
                      <span>{area.scenario.fixNote}</span>
                    </p>
                  </div>
                </article>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
