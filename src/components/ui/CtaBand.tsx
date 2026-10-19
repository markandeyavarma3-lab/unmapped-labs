import Link from "next/link";
import { Arrow } from "./Arrow";

/** The closing call to action: a survey-yellow band at the bottom of pages. */
export function CtaBand({ title = "Have something worth fixing?", body = "Tell us what's slowing you down. The first conversation is free, and we'll tell you honestly whether we can help." }: { title?: string; body?: string }) {
  return (
    <section aria-labelledby="cta-heading" className="relative overflow-hidden bg-[color:var(--color-accent)] text-[#0a1626]">
      <div aria-hidden className="absolute inset-0 opacity-[0.18] [background-image:linear-gradient(#0a1626_1px,transparent_1px),linear-gradient(90deg,#0a1626_1px,transparent_1px)] [background-size:48px_48px]" />
      <div className="container-site relative flex flex-col gap-10 py-[clamp(4rem,3rem+5vw,8rem)] md:flex-row md:items-end md:justify-between">
        <div className="max-w-[46rem]">
          <p className="label" data-reveal="fade">
            [ Start here ]
          </p>
          <h2 id="cta-heading" className="h2 mt-5" data-reveal="">
            {title}
          </h2>
          <p className="mt-5 max-w-[36rem] text-lg leading-relaxed text-[#0a1626]/80" data-reveal="" style={{ ["--d" as string]: 1 }}>
            {body}
          </p>
        </div>
        <Link href="/contact" className="btn shrink-0 bg-[#0a1626] text-[#f2c230] hover:bg-[#13294a]" data-reveal="fade">
          Start a conversation <Arrow className="btn-arrow" />
        </Link>
      </div>
    </section>
  );
}
