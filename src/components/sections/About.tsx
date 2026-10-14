import { about, focus } from "@/content/site-content";
import { getNotes } from "@/lib/notes";
import { SectionHeading } from "@/components/ui/SectionHeading";

export async function About() {
  const published = (await getNotes()).length;

  // Every value here is true today and updates itself as the lab grows.
  const status = [
    { k: "Stage", v: "Early exploration" },
    { k: "Initial focus", v: `${focus.areas.length - 1} areas, edges left open` },
    { k: "Field notes", v: published === 0 ? "None published yet" : `${published} published` },
    { k: "Open to", v: "Conversations, field access, collaborators" },
  ];

  return (
    <section id="about" data-chapter="12" aria-labelledby="about-heading" className="relative py-[var(--section-y)]">
      <div className="container-site grid gap-14 lg:grid-cols-12 lg:gap-8">
        <div className="lg:col-span-5">
          <SectionHeading id="about-heading" tone="paper" label={about.label} heading={about.heading} />
          <dl className="reveal mt-12 border-t border-[color:var(--color-paper-line)]" style={{ "--d": 2 } as React.CSSProperties}>
            {status.map((s) => (
              <div key={s.k} className="grid grid-cols-[8.5rem_1fr] gap-4 border-b border-[color:var(--color-paper-line)] py-3.5">
                <dt className="label pt-0.5 text-[color:var(--color-paper-fg-2)]">{s.k}</dt>
                <dd className="text-[15px] text-[color:var(--color-paper-fg)]">{s.v}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="flex flex-col gap-6 lg:col-span-6 lg:col-start-7 lg:pt-20">
          {about.body.map((p, i) => (
            <p
              key={i}
              className={`reveal leading-[1.65] ${i === 0 ? "text-[length:var(--text-lead)] text-[color:var(--color-paper-fg)]" : "text-[1.0625rem] text-[color:var(--color-paper-fg-2)]"}`}
              style={{ "--d": i } as React.CSSProperties}
            >
              {p}
            </p>
          ))}
          <figure className="reveal mt-10 border-l-2 border-[color:var(--color-teal)] pl-6">
            <blockquote className="text-[clamp(1.5rem,1.1rem+1.5vw,2.25rem)] leading-[1.15] font-medium tracking-[-0.03em] text-balance">
              {about.pullQuote}
            </blockquote>
          </figure>
        </div>
      </div>
    </section>
  );
}
