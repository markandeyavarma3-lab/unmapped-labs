import Link from "next/link";
import type { Metadata } from "next";
import { contact } from "@/content/site-content";
import { site } from "@/config/site";
import { PageHeader } from "@/components/ui/Headings";
import { ContactForm } from "@/components/contact/ContactForm";
import { Page } from "@/components/motion/Page";

export const metadata: Metadata = {
  title: "Contact",
  description: contact.body,
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <Page>
      <PageHeader label={contact.label} title={contact.heading} intro={contact.body} />
      <div className="container-site grid gap-12 py-[var(--section-y)] lg:grid-cols-12">
        <div className="lg:col-span-7">
          <ContactForm />
        </div>
        <div className="flex flex-col gap-10 lg:col-span-4 lg:col-start-9">
          <div className="card p-6">
            <h2 className="label text-[color:var(--color-accent)]">Rather talk it through?</h2>
            <p className="display mt-3 text-[1.5rem] leading-snug">Book a free 30-minute call.</p>
            <p className="mt-2 text-[15px] leading-relaxed text-[color:var(--color-fg-2)]">Pick a time that suits you. Phone or video — tell us what&apos;s happening and we&apos;ll ask questions.</p>
            <Link href={site.bookingUrl} className="btn btn-primary mt-5">
              Choose a time
            </Link>
          </div>
          <div>
            <h2 className="label text-[color:var(--color-fg-3)]">What happens next</h2>
            <ol className="mt-4 flex flex-col">
              {contact.next.map((n, i) => (
                <li key={n} className="flex gap-4 border-t border-[color:var(--color-line)] py-4">
                  <span className="label pt-1 text-[color:var(--color-accent)] tabular-nums">0{i + 1}</span>
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
    </Page>
  );
}
