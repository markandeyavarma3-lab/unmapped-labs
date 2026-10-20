import Link from "next/link";
import { site, socials } from "@/config/site";
import { approach, figures, hero, notes as notesCopy, principles, testimonials, work } from "@/content/site-content";
import { cases } from "@/content/insights";
import { getNotes, formatNoteDate } from "@/lib/notes";
import { Page } from "@/components/motion/Page";
import { CountUp } from "@/components/motion/CountUp";
import { SectionHead } from "@/components/ui/Headings";
import { CtaBand } from "@/components/ui/CtaBand";
import { Arrow } from "@/components/ui/Arrow";
import { WorkCard } from "@/components/cards/WorkCard";
import { CaseCard } from "@/components/cards/CaseCard";
import { HeroBlueprint } from "@/components/home/HeroBlueprint";
import { SiteGallery } from "@/components/home/SiteGallery";
import { PinnedStory } from "@/components/home/PinnedStory";
import { BottleneckSim } from "@/components/sim/BottleneckSim";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: site.name,
  url: site.url,
  slogan: site.tagline,
  description: site.description,
  email: site.email,
  logo: `${site.url}/icon.svg`,
  areaServed: { "@type": "Country", name: "India" },
  knowsAbout: ["Operations research", "Process mapping", "Bottleneck analysis", "Agriculture operations", "Logistics and container yards", "Hospital patient flow", "Industrial energy efficiency", "Custom software", "IoT and sensors", "Data extraction and forecasting"],
  contactPoint: { "@type": "ContactPoint", contactType: "sales", email: site.email, areaServed: "IN", availableLanguage: ["English"] },
  ...(socials.length ? { sameAs: socials.map((s) => s.href) } : {}),
};

/** Three cases from different industries for the home page. */
const featured = ["boxes-buried-in-the-yard", "beds-free-up-too-late", "air-that-leaks-away"].map((s) => cases.find((c) => c.slug === s)!);

export default async function Home() {
  const latest = (await getNotes())[0];
  const quotes = testimonials.items.filter((t) => t.published);

  return (
    <Page>
      {/* Hero */}
      <section aria-labelledby="hero-heading" className="bp-grid relative flex min-h-[calc(100svh-var(--header-h))] flex-col overflow-hidden">
        <div className="container-site grid flex-1 items-center gap-12 py-[clamp(3rem,2rem+5vw,6rem)] lg:grid-cols-12">
          <div className="lg:col-span-7">
            <p className="label text-[color:var(--color-accent)]" data-reveal="fade">
              {hero.eyebrow}
            </p>
            <h1 id="hero-heading" className="h-display rise mt-6">
              {hero.lines.map((l, i) => (
                <span key={l}>
                  <span style={{ ["--i" as string]: i }} className={i >= 2 ? "text-[color:var(--color-accent)]" : undefined}>
                    {l}
                  </span>
                </span>
              ))}
            </h1>
            <p className="lead mt-8 max-w-[36rem]" data-reveal="" style={{ ["--d" as string]: 4 }}>
              {hero.body}
            </p>
            <div className="mt-10 flex flex-wrap gap-3" data-reveal="" style={{ ["--d" as string]: 5 }}>
              <a href={site.bookingUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
                Book a free 30-min call <Arrow className="btn-arrow" />
              </a>
              <Link href={hero.secondaryCta.href} className="btn btn-ghost">
                {hero.secondaryCta.label} <span aria-hidden>↓</span>
              </Link>
            </div>
          </div>
          <div className="lg:col-span-5" data-reveal="fade" style={{ ["--d" as string]: 3 }}>
            <div className="card bg-[color:var(--color-ink)] p-3 sm:p-5">
              <HeroBlueprint />
            </div>
          </div>
        </div>

      </section>

      <SiteGallery />

      {/* The signature piece */}
      <section id="simulator" aria-labelledby="sim-heading" className="section border-t border-[color:var(--color-line)] bg-[color:var(--color-ink-3)]">
        <div className="container-site">
          <SectionHead
            id="sim-heading"
            label="Try it"
            title="Find the bottleneck yourself."
            intro="This is what we do, in about a minute. Pick a place, measure each step, then try a fix. Watch which ones actually move the wait — not every fix does, which is why we measure first."
          />
          <div className="mt-12" data-reveal="">
            <BottleneckSim />
          </div>
          <p className="label mt-4 text-[0.62rem] text-[color:var(--color-fg-3)]">A live queueing model with illustrative numbers. Real sites are messier — that's the job.</p>
        </div>
      </section>

      {/* How we work, pinned */}
      <section id="how-we-work" aria-labelledby="how-heading" className="border-t border-[color:var(--color-line)]">
        <div className="container-site pt-[var(--section-y)]">
          <SectionHead
            id="how-heading"
            label={approach.label}
            title={approach.heading}
            intro={approach.intro}
            action={
              <Link href="/services" className="btn btn-ghost">
                Services <Arrow className="btn-arrow" />
              </Link>
            }
          />
        </div>
        <div className="py-12 min-[900px]:py-0">
          <PinnedStory stages={approach.stages} />
        </div>
      </section>

      {/* Industry figures, on paper */}
      <section aria-labelledby="figures-heading" className="paper section">
        <div className="container-site">
          <SectionHead id="figures-heading" label="From the research" title="The waste is usually hiding in plain sight." intro="Figures from published studies — not our clients — each sourced on its case page." />
          <ul className="mt-14 grid gap-px overflow-hidden border border-[color:var(--color-line)] bg-[color:var(--color-line)] sm:grid-cols-2 lg:grid-cols-4">
            {figures.map((f, i) => (
              <li key={f.caseSlug} className="group relative bg-[color:var(--color-ink)] p-6 transition-colors hover:bg-[color:var(--color-ink-2)] sm:p-8" data-reveal="" style={{ ["--d" as string]: i }}>
                <CountUp value={f.value} className="display block text-[clamp(2.6rem,1.8rem+2.4vw,4rem)] leading-none tracking-[-0.05em]" />
                <p className="mt-4 text-[15px] leading-relaxed text-[color:var(--color-fg-2)]">{f.label}</p>
                <Link href={`/insights/${f.caseSlug}`} className="label mt-6 flex items-center gap-2 text-[color:var(--color-accent)] after:absolute after:inset-0">
                  Source & case <Arrow className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Work */}
      <section id="work" aria-labelledby="work-heading" className="section">
        <div className="container-site">
          <SectionHead id="work-heading" label={work.label} title={work.heading} intro={work.intro} />
          <div className="mt-14 grid gap-6 lg:grid-cols-2">
            {work.cases.map((cs, i) => (
              <WorkCard key={cs.slug} cs={cs} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* Insights */}
      <section id="insights" aria-labelledby="insights-heading" className="section">
        <div className="container-site">
          <SectionHead
            id="insights-heading"
            label="Insights"
            title="Problems we know how to look for."
            intro="Well-documented problems in large farms, yards, hospitals and plants — and the fixes that typically work. Illustrative, with sources."
            action={
              <Link href="/insights" className="btn btn-ghost">
                All {cases.length} cases <Arrow className="btn-arrow" />
              </Link>
            }
          />
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {featured.map((c, i) => (
              <CaseCard key={c.slug} c={c} index={i} />
            ))}
          </div>
          {latest && (
            <Link href={`/notes/${latest.slug}`} className="card card-link group mt-6 flex flex-col gap-3 p-6 sm:flex-row sm:items-center sm:justify-between" data-reveal="">
              <span>
                <span className="label text-[color:var(--color-accent)]">
                  {notesCopy.label} · {formatNoteDate(latest.date)}
                </span>
                <span className="display mt-2 block text-2xl">{latest.title}</span>
              </span>
              <span className="label flex shrink-0 items-center gap-2">
                Read the note <Arrow className="arrow h-3.5 w-3.5" />
              </span>
            </Link>
          )}
        </div>
      </section>

      {/* Principles */}
      <section aria-labelledby="principles-heading" className="section">
        <div className="container-site grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <SectionHead id="principles-heading" label={principles.label} title={principles.heading} />
            <Link href="/about" className="label mt-8 inline-flex items-center gap-2 py-1 text-[color:var(--color-accent)]">
              More about us <Arrow className="h-3.5 w-3.5" />
            </Link>
          </div>
          <ol className="flex flex-col lg:col-span-6 lg:col-start-7">
            {principles.items.map((p, i) => (
              <li key={p.title} className="flex gap-6 border-t border-[color:var(--color-line)] py-7 last:border-b" data-reveal="" style={{ ["--d" as string]: i }}>
                <span className="label pt-2 text-[color:var(--color-accent)] tabular-nums">0{i + 1}</span>
                <div>
                  <h3 className="display text-[1.6rem]">{p.title}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-[color:var(--color-fg-2)]">{p.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Testimonials — only once real quotes are published */}
      {quotes.length > 0 && (
        <section aria-labelledby="quotes-heading" className="section">
          <div className="container-site">
            <SectionHead id="quotes-heading" label={testimonials.label} title={testimonials.heading} />
            <ul className="mt-12 grid gap-6 md:grid-cols-2">
              {quotes.map((t) => (
                <li key={t.name} className="card p-8">
                  <figure>
                    <blockquote className="display text-2xl leading-snug">“{t.quote}”</blockquote>
                    <figcaption className="mt-6 text-[15px] text-[color:var(--color-fg-2)]">
                      <span className="font-semibold text-[color:var(--color-fg)]">{t.name}</span> · {t.role}
                    </figcaption>
                  </figure>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <CtaBand />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
    </Page>
  );
}
