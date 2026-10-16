import type { Metadata } from "next";
import { site } from "@/config/site";

export const metadata: Metadata = {
  title: "Privacy",
  description: `How ${site.name} handles what you send through the contact form, and what the site measures.`,
  alternates: { canonical: "/privacy" },
};

const sections: { h: string; p: string[] }[] = [
  {
    h: "What we collect",
    p: [
      "Only what you type into the contact form: your name, email address, message, and — if you choose to give them — your organisation and area of interest.",
      "We don't ask for anything else, and the site has no accounts, no logins and no advertising.",
    ],
  },
  {
    h: "How we use it",
    p: [
      "We use it to read your message and reply to you. That's all. We don't sell it, share it for marketing, or add you to a mailing list.",
      `Messages are delivered to our inbox (${site.email}) by Resend, an email delivery service. Resend processes the message only to deliver it.`,
    ],
  },
  {
    h: "How long we keep it",
    p: ["We keep your message as long as we need it to talk with you about your enquiry. Ask us and we'll delete it."],
  },
  {
    h: "What the site measures",
    p: [
      "We use Vercel Analytics and Speed Insights to count page views and check how fast the site loads. They don't use cookies and don't identify you personally.",
      "The site remembers two small preferences in your browser — whether you've seen the opening animation, and whether you turned sound on. They never leave your device.",
    ],
  },
  {
    h: "Your choices",
    p: [`To see, correct or delete anything you've sent us, email ${site.email}. We'll do it as soon as we can.`],
  },
];

export default function PrivacyPage() {
  return (
    <main id="main" tabIndex={-1} className="relative z-[var(--z-content)] min-h-screen pt-[calc(var(--header-h)+clamp(4rem,10vw,8rem))] pb-[var(--section-y)]">
      <div className="container-site max-w-[46rem]">
        <p className="label flex items-center gap-3 text-[color:var(--color-fg-2)]">
          <span aria-hidden className="h-px w-6 bg-[color:var(--color-cyan)]" />
          Privacy
        </p>
        <h1 className="mt-6 text-[length:var(--text-h2)] leading-[var(--text-h2--line-height)] font-medium tracking-[var(--text-h2--letter-spacing)]">
          What happens to what you send us.
        </h1>
        <p className="label mt-6 text-[color:var(--color-fg-2)]">Last updated: 16 October 2026</p>
        {sections.map((s) => (
          <section key={s.h} className="mt-12">
            <h2 className="text-[1.375rem] font-medium tracking-[-0.02em]">{s.h}</h2>
            {s.p.map((t) => (
              <p key={t} className="mt-3 text-[1.0625rem] leading-relaxed text-[color:var(--color-fg-2)]">
                {t}
              </p>
            ))}
          </section>
        ))}
      </div>
    </main>
  );
}
