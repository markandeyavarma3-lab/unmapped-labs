import { contact } from "@/content/site-content";
import { site } from "@/config/site";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ContactForm } from "./ContactForm";

export function Contact() {
  return (
    <section id="contact" data-chapter="16" aria-labelledby="contact-heading" className="relative py-[var(--section-y)]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(8,11,14,0.85)_0%,rgba(8,11,14,0.35)_45%,rgba(8,11,14,0.55)_100%)]"
      />
      <div className="container-site relative grid gap-14 lg:grid-cols-12 lg:gap-8">
        <div className="lg:col-span-5">
          <SectionHeading id="contact-heading" label={contact.label} heading={contact.heading} intro={contact.body} />
          <div className="reveal mt-12 flex flex-col gap-2" style={{ "--d": 3 } as React.CSSProperties}>
            <span className="label text-[color:var(--color-fg-3)]">Or write directly</span>
            <a href={`mailto:${site.email}`} className="link-underline self-start pb-0.5 text-lg text-[color:var(--color-fg)]">
              {site.email}
            </a>
          </div>
        </div>
        <div className="reveal lg:col-span-6 lg:col-start-7">
          <ContactForm />
        </div>
      </div>
    </section>
  );
}
