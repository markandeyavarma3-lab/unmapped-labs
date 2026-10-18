import Link from "next/link";
import { site, socials } from "@/config/site";
import { approach, hero, notes as notesCopy, principles, problems, testimonials, work } from "@/content/site-content";
import { cases } from "@/content/insights";
import { getNotes, formatNoteDate } from "@/lib/notes";
import { SectionHead } from "@/components/ui/Headings";
import { FlowDiagram } from "@/components/ui/FlowDiagram";
import { CtaBand } from "@/components/ui/CtaBand";
import { Arrow } from "@/components/ui/Arrow";
import { WorkCard } from "@/components/cards/WorkCard";
import { CaseCard } from "@/components/cards/CaseCard";

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
    <main id="main" tabIndex={-1}>
      {/* Hero */}
      <section aria-labelledby="hero-heading" className="container-site grid items-center gap-12 pt-[clamp(3rem,2rem+5vw,6.5rem)] pb-[var(--section-y)] lg:grid-cols-12">
        <div className="lg:col-span-6">
          <p className="label text-[color:var(--color-cyan)]">{hero.eyebrow}</p>
          <h1 id="hero-heading" className="h-display mt-5">
            {hero.heading}
          </h1>
          <p className="lead mt-6 max-w-[34rem]">{hero.body}</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href={hero.primaryCta.href} className="btn btn-primary">
              {hero.primaryCta.label} <Arrow className="btn-arrow" />
            </Link>
            <Link href={hero.secondaryCta.href} className="btn btn-ghost">
              {hero.secondaryCta.label}
            </Link>
          </div>
        </div>
        <div className="lg:col-span-6">
          <FlowDiagram />
        </div>
        <ul className="grid gap-6 border-t border-[color:var(--color-line)] pt-8 sm:grid-cols-3 lg:col-span-12">
          {hero.proof.map((p) => (
            <li key={p.value}>
              <p className="serif text-2xl">{p.value}</p>
              <p className="mt-1 text-[15px] text-[color:var(--color-fg-2)]">{p.label}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* Problems */}
      <section aria-labelledby="problems-heading" className="section border-t border-[color:var(--color-line)] bg-[color:var(--color-ink-3)]">
        <div className="container-site">
          <SectionHead id="problems-heading" label={problems.label} title={problems.heading} />
          <ul className="mt-12 grid gap-px overflow-hidden rounded-md border border-[color:var(--color-line)] bg-[color:var(--color-line)] sm:grid-cols-2 lg:grid-cols-4">
            {problems.items.map((p) => (
              <li key={p.title} className="bg-[color:var(--color-ink-2)] p-6">
                <h3 className="h3 text-[1.2rem]">{p.title}</h3>
                <p className="mt-3 text-[15px] leading-relaxed text-[color:var(--color-fg-2)]">{p.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* How we work */}
      <section id="how-we-work" aria-labelledby="how-heading" className="section">
        <div className="container-site">
          <SectionHead
            id="how-heading"
            label={approach.label}
            title={approach.heading}
            intro={approach.intro}
            action={
              <Link href="/services" className="btn btn-ghost">
                Services and how we engage <Arrow className="btn-arrow" />
              </Link>
            }
          />
          <ol className="mt-12 grid gap-8 md:grid-cols-5 md:gap-6">
            {approach.stages.map((s) => (
              <li key={s.index} className="border-t-2 border-[color:var(--color-fg)] pt-5">
                <p className="label tabular-nums text-[color:var(--color-fg-3)]">{s.index}</p>
                <h3 className="h3 mt-2 text-[1.25rem]">{s.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-[color:var(--color-fg-2)]">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Work */}
      <section id="work" aria-labelledby="work-heading" className="section">
        <div className="container-site">
          <SectionHead id="work-heading" label={work.label} title={work.heading} intro={work.intro} />
          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            {work.cases.map((cs) => (
              <WorkCard key={cs.slug} cs={cs} />
            ))}
          </div>
        </div>
      </section>

      {/* Insights */}
      <section id="insights" aria-labelledby="insights-heading" className="section bg-[color:var(--color-ink-3)]">
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
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {featured.map((c) => (
              <CaseCard key={c.slug} c={c} />
            ))}
          </div>
          {latest && (
            <Link href={`/notes/${latest.slug}`} className="card card-link group mt-6 flex flex-col gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
              <span>
                <span className="label text-[color:var(--color-cyan)]">
                  {notesCopy.label} · {formatNoteDate(latest.date)}
                </span>
                <span className="serif mt-2 block text-2xl">{latest.title}</span>
              </span>
              <span className="flex shrink-0 items-center gap-2 text-sm font-semibold">
                Read the note <Arrow className="arrow" />
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
            <Link href="/about" className="link mt-8 inline-flex items-center gap-2 py-1 font-semibold">
              More about us <Arrow />
            </Link>
          </div>
          <ol className="flex flex-col lg:col-span-6 lg:col-start-7">
            {principles.items.map((p, i) => (
              <li key={p.title} className="flex gap-6 border-t border-[color:var(--color-line)] py-6 last:border-b">
                <span className="serif text-2xl text-[color:var(--color-fg-3)] tabular-nums">{i + 1}</span>
                <div>
                  <h3 className="h3 text-[1.2rem]">{p.title}</h3>
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
                    <blockquote className="serif text-2xl leading-snug">“{t.quote}”</blockquote>
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
    </main>
  );
}
