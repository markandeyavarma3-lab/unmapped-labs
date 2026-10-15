import { principles } from "@/content/site-content";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { LayerDiagram } from "./LayerDiagram";

export function Principles() {
  return (
    <section id="philosophy" data-chapter="14" aria-labelledby="philosophy-heading" className="relative py-[var(--section-y)]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(247,242,233,0.8)_16%,rgba(247,242,233,0.8)_84%,transparent)]"
      />
      <div className="container-site relative grid gap-16 lg:grid-cols-12 lg:gap-8">
        <div className="lg:col-span-6">
          <SectionHeading id="philosophy-heading" label={principles.label} heading={principles.heading} />
          <ol className="mt-14 grid gap-x-10 sm:grid-cols-2">
            {principles.items.map((p, i) => (
              <li
                key={p.title}
                className="reveal border-t border-[color:var(--color-line)] py-6"
                style={{ "--d": i % 2 } as React.CSSProperties}
              >
                <span className="label text-[color:var(--color-cyan)]">P.{String(i + 1).padStart(2, "0")}</span>
                <h3 className="mt-3 text-[1.1875rem] font-medium tracking-[-0.015em] text-[color:var(--color-fg)]">{p.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-[color:var(--color-fg-2)]">{p.body}</p>
              </li>
            ))}
          </ol>
        </div>
        <div className="lg:col-span-5 lg:col-start-8">
          <LayerDiagram layers={principles.layers} />
        </div>
      </div>
    </section>
  );
}
