import { focus } from "@/content/site-content";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { FocusGlyph } from "@/components/ui/FocusGlyph";

export function FocusAreas() {
  return (
    <section id="focus" data-chapter="3" aria-labelledby="focus-heading" className="relative py-[var(--section-y)]">
      <div className="container-site">
        <div className="grid gap-8 lg:grid-cols-12">
          <SectionHeading
            id="focus-heading"
            tone="paper"
            label={focus.label}
            heading={focus.heading}
            className="lg:col-span-7"
          />
          <p className="reveal self-end text-[length:var(--text-lead)] leading-[var(--text-lead--line-height)] text-[color:var(--color-paper-fg-2)] lg:col-span-4 lg:col-start-9">
            {focus.intro}
          </p>
        </div>

        <ul className="mt-16 border-t border-[color:var(--color-paper-line)] lg:mt-24">
          {focus.areas.map((area, i) => (
            <li
              key={area.id}
              className="focus-row group reveal relative grid gap-x-8 gap-y-5 border-b border-[color:var(--color-paper-line)] py-10 transition-colors duration-[var(--duration-hover)] hover:bg-[color:var(--color-paper-2)]/60 sm:grid-cols-[4.5rem_1fr] lg:grid-cols-[6rem_minmax(0,5fr)_minmax(0,4fr)_10rem] lg:items-center lg:py-12"
              style={{ "--d": i % 2 } as React.CSSProperties}
            >
              <span
                aria-hidden
                className={`focus-index label flex h-9 w-9 items-center justify-center border lg:ml-4 ${
                  area.id === "open"
                    ? "is-open border-dashed border-[color:var(--color-paper-fg-2)] text-[color:var(--color-paper-fg-2)]"
                    : "border-[color:var(--color-paper-line)] text-[color:var(--color-paper-fg-2)]"
                }`}
              >
                <span>{area.index}</span>
              </span>
              <div>
                <h3 className="text-[length:var(--text-h3)] leading-[var(--text-h3--line-height)] font-medium tracking-[var(--text-h3--letter-spacing)]">
                  {area.title}
                </h3>
                <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1" aria-label="Themes">
                  {area.keywords.map((k) => (
                    <li key={k} className="label text-[color:var(--color-paper-fg-2)]">
                      {k}
                    </li>
                  ))}
                </ul>
              </div>
              <p className="max-w-[34rem] text-[1.0625rem] leading-relaxed text-[color:var(--color-paper-fg-2)] sm:col-start-2 lg:col-start-auto">
                {area.body}
              </p>
              <FocusGlyph id={area.id} className="hidden h-24 w-auto justify-self-end lg:block" />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
