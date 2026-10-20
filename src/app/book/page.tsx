import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/config/site";
import { PageHeader } from "@/components/ui/Headings";
import { CalEmbed } from "@/components/contact/CalEmbed";
import { Page } from "@/components/motion/Page";

export const metadata: Metadata = {
  title: "Book a free call",
  description: "Book a free 30-minute call with Unmapped Labs. Tell us what's slowing your operation down; we'll ask questions and say honestly whether we can help.",
  alternates: { canonical: "/book" },
};

const expect = [
  "30 minutes, by phone or video — your choice.",
  "You tell us what's slowing the work down. We ask a lot of questions.",
  "We say honestly whether we're the right people for it, and what a site visit would look like.",
];

export default function BookPage() {
  return (
    <Page>
      <PageHeader label="Book a call" title="Book a free 30-minute call." intro="Pick a time that suits you. There's no charge and no obligation — just a conversation about what you'd like to fix." />
      <div className="container-site grid gap-12 py-[var(--section-y)] lg:grid-cols-12">
        <div className="lg:col-span-8">
          <CalEmbed />
        </div>
        <aside className="flex flex-col gap-8 lg:col-span-4">
          <div>
            <h2 className="label text-[color:var(--color-fg-3)]">What to expect</h2>
            <ol className="mt-4 flex flex-col">
              {expect.map((e, i) => (
                <li key={e} className="flex gap-4 border-t border-[color:var(--color-line)] py-4">
                  <span className="label pt-1 text-[color:var(--color-accent)] tabular-nums">0{i + 1}</span>
                  <span className="text-[15px] leading-relaxed">{e}</span>
                </li>
              ))}
            </ol>
          </div>
          <div>
            <h2 className="label text-[color:var(--color-fg-3)]">Prefer to write?</h2>
            <p className="mt-3 text-[15px] leading-relaxed text-[color:var(--color-fg-2)]">
              <Link href="/contact" className="link">
                Send us a message
              </Link>{" "}
              or email{" "}
              <a href={`mailto:${site.email}`} className="link">
                {site.email}
              </a>
              .
            </p>
          </div>
        </aside>
      </div>
    </Page>
  );
}
