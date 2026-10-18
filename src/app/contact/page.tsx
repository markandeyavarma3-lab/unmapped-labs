import type { Metadata } from "next";
import { contact } from "@/content/site-content";
import { site } from "@/config/site";
import { PageHeader } from "@/components/ui/Headings";
import { ContactForm } from "@/components/contact/ContactForm";

export const metadata: Metadata = {
  title: "Contact",
  description: contact.body,
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <main id="main" tabIndex={-1}>
      <PageHeader label={contact.label} title={contact.heading} intro={contact.body} />
      <div className="container-site grid gap-12 pb-[var(--section-y)] lg:grid-cols-12">
        <div className="lg:col-span-7">
          <ContactForm />
        </div>
        <div className="flex flex-col gap-10 lg:col-span-4 lg:col-start-9">
          <div>
            <h2 className="label text-[color:var(--color-fg-3)]">What happens next</h2>
            <ol className="mt-4 flex flex-col">
              {contact.next.map((n, i) => (
                <li key={n} className="flex gap-4 border-t border-[color:var(--color-line)] py-4">
                  <span className="serif text-xl text-[color:var(--color-fg-3)] tabular-nums">{i + 1}</span>
                  <span className="text-[15px] leading-relaxed">{n}</span>
                </li>
              ))}
            </ol>
          </div>
          <div>
            <h2 className="label text-[color:var(--color-fg-3)]">Prefer email?</h2>
            <a href={`mailto:${site.email}`} className="link mt-3 inline-block py-1 text-lg">
              {site.email}
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
