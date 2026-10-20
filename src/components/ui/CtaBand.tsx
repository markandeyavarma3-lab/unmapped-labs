import Link from "next/link";
import { site } from "@/config/site";
import { Arrow } from "./Arrow";

/** The closing call to action at the bottom of pages: book the free call, or write. */
export function CtaBand({ title = "Have something worth fixing?", body = "Book a free 30-minute call, or tell us about it in writing. We'll say honestly whether we can help." }: { title?: string; body?: string }) {
  return (
    <section aria-labelledby="cta-heading" className="bg-[color:var(--color-accent)] text-[#0a1626]">
      <div className="container-site flex flex-col gap-10 py-[clamp(4rem,3rem+5vw,7rem)] md:flex-row md:items-end md:justify-between">
        <div className="max-w-[44rem]">
          <h2 id="cta-heading" className="h2" data-reveal="">
            {title}
          </h2>
          <p className="mt-5 max-w-[36rem] text-lg leading-relaxed text-[#0a1626]/80" data-reveal="" style={{ ["--d" as string]: 1 }}>
            {body}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-3" data-reveal="fade">
          <Link href={site.bookingUrl} className="btn bg-[#0a1626] text-[#f2c230] hover:bg-[#13294a]">
            Book a free call <Arrow className="btn-arrow" />
          </Link>
          <Link href="/contact" className="btn border border-[#0a1626]/40 text-[#0a1626] hover:border-[#0a1626]">
            Send a message
          </Link>
        </div>
      </div>
    </section>
  );
}
