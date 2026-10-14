import { hero } from "@/content/site-content";
import { Magnetic } from "@/components/ui/Magnetic";

export function Hero() {
  return (
    <section
      id="top"
      data-chapter="0"
      aria-labelledby="hero-heading"
      className="relative flex min-h-[100svh] flex-col justify-end overflow-clip"
    >
      {/* Legibility veil on the text side only — the terrain stays clear on the right. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(8,11,14,0.82)_0%,rgba(8,11,14,0.45)_38%,transparent_62%)] max-md:bg-[linear-gradient(0deg,rgba(8,11,14,0.92)_0%,rgba(8,11,14,0.55)_45%,transparent_75%)]"
      />

      <div className="container-site relative pt-[calc(var(--header-h)+3rem)] pb-[clamp(2.5rem,7vh,5.5rem)]">
        <p className="label fade-up flex items-center gap-3 text-[color:var(--color-fg-2)]" style={{ "--i": 0 } as React.CSSProperties}>
          <span aria-hidden className="h-px w-8 bg-[color:var(--color-cyan)]" />
          {hero.eyebrow}
        </p>

        <h1
          id="hero-heading"
          className="mt-7 max-w-[13ch] text-[length:var(--text-display)] leading-[var(--text-display--line-height)] font-medium tracking-[var(--text-display--letter-spacing)] text-[color:var(--color-fg)]"
        >
          {hero.heading.map((line, i) => (
            <span key={line} className="line-mask">
              <span style={{ "--i": i + 1 } as React.CSSProperties}>{line}</span>
            </span>
          ))}
        </h1>

        <p
          className="fade-up mt-8 max-w-[34rem] text-[length:var(--text-lead)] leading-[var(--text-lead--line-height)] text-[color:var(--color-fg-2)]"
          style={{ "--i": 3 } as React.CSSProperties}
        >
          {hero.body}
        </p>

        <div className="fade-up mt-10 flex flex-wrap items-center gap-3" style={{ "--i": 4 } as React.CSSProperties}>
          <Magnetic>
            <a href={hero.primaryCta.href} className="btn btn-primary">
              {hero.primaryCta.label}
              <svg aria-hidden className="btn-arrow h-3.5 w-3.5" viewBox="0 0 14 14" fill="none">
                <path d="M7 1v12M1.5 7.5 7 13l5.5-5.5" stroke="currentColor" strokeWidth="1.6" />
              </svg>
            </a>
          </Magnetic>
          <a href={hero.secondaryCta.href} className="btn btn-ghost">
            {hero.secondaryCta.label}
          </a>
        </div>

        <div
          className="fade-up mt-[clamp(3rem,9vh,6.5rem)] flex items-end justify-between gap-6 border-t border-[color:var(--color-line)]/60 pt-5"
          style={{ "--i": 5 } as React.CSSProperties}
        >
          <p className="label flex items-center gap-3 text-[color:var(--color-fg-3)]">
            <span aria-hidden className="relative block h-6 w-px overflow-hidden bg-[color:var(--color-line)]">
              <span className="absolute inset-x-0 top-0 h-2 animate-[scroll-cue_2.2s_var(--ease-in-out-quart)_infinite] bg-[color:var(--color-cyan)]" />
            </span>
            Scroll to survey
          </p>
          <p aria-hidden className="label hidden text-right text-[color:var(--color-fg-3)] sm:block">
            Fig. 01 — Uncharted terrain
            <span className="hidden [@media(hover:hover)]:inline"> · hover the markers</span>
          </p>
        </div>
      </div>
    </section>
  );
}
