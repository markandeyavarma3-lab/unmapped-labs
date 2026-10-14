import { intro } from "@/content/site-content";
import { Progression } from "./Progression";

export function IntroSection() {
  return (
    <section
      id="intro"
      data-chapter="1"
      aria-labelledby="intro-heading"
      className="relative py-[var(--section-y)]"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,transparent_0%,rgba(8,11,14,0.7)_30%,rgba(8,11,14,0.7)_75%,transparent_100%)]"
      />
      <div className="container-site relative grid gap-12 lg:grid-cols-12 lg:gap-8">
        <div className="lg:col-span-7">
          <p className="label reveal flex items-center gap-3 text-[color:var(--color-fg-2)]">
            <span aria-hidden className="h-px w-6 bg-[color:var(--color-cyan)]" />
            {intro.label}
          </p>
          <h2
            id="intro-heading"
            className="reveal-mask mt-6 text-[length:var(--text-h2)] leading-[var(--text-h2--line-height)] font-medium tracking-[var(--text-h2--letter-spacing)] text-balance"
          >
            <span>{intro.heading}</span>
          </h2>
        </div>
        <div className="flex flex-col gap-6 lg:col-span-4 lg:col-start-9 lg:pt-24">
          {intro.body.map((p, i) => (
            <p
              key={i}
              className={`reveal text-[length:var(--text-lead)] leading-[var(--text-lead--line-height)] ${
                i === 0 ? "text-[color:var(--color-fg-2)]" : "text-[color:var(--color-fg)]"
              }`}
              style={{ "--d": i + 1 } as React.CSSProperties}
            >
              {p}
            </p>
          ))}
        </div>
      </div>

      <div className="container-site relative mt-[clamp(4rem,10vw,8rem)]">
        <Progression steps={intro.progression} />
      </div>
    </section>
  );
}
