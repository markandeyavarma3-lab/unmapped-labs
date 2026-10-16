import { testimonials } from "@/content/site-content";
import { SectionHeading } from "@/components/ui/SectionHeading";

/** Client words — renders nothing until at least one real quote is published. */
export function Testimonials() {
  const items = testimonials.items.filter((t) => t.published);
  if (items.length === 0) return null;
  return (
    <section id="testimonials" aria-labelledby="testimonials-heading" className="relative py-[var(--section-y)]">
      <div className="container-site relative">
        <SectionHeading id="testimonials-heading" label={testimonials.label} heading={testimonials.heading} />
        <ul className="mt-12 grid gap-4 md:grid-cols-2">
          {items.map((t) => (
            <li key={t.name} className="reveal-card glass p-7 sm:p-9">
              <figure>
                <blockquote className="text-[1.25rem] leading-snug font-medium tracking-[-0.015em]">“{t.quote}”</blockquote>
                <figcaption className="mt-6 text-[15px] text-[color:var(--color-fg-2)]">
                  <span className="text-[color:var(--color-fg)]">{t.name}</span> · {t.role}
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
