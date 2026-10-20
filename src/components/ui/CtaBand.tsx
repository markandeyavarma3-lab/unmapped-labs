import Link from "next/link";
import { site } from "@/config/site";
import { LogoMark } from "@/components/brand/Logo";
import { Arrow } from "./Arrow";

/** The closing call to action at the bottom of pages: book the free call, or write. */
export function CtaBand({ title = "Have something worth fixing?", body = "Book a free 30-minute call, or tell us about it in writing. We'll say honestly whether we can help." }: { title?: string; body?: string }) {
  return (
    <section aria-labelledby="cta-heading" className="relative overflow-hidden border-t border-[color:var(--color-line)]">
      <LogoMark className="pointer-events-none absolute -right-[6vw] -bottom-[14vw] h-[46vw] w-[46vw] max-w-[40rem] text-[color:var(--color-fg)] opacity-[0.04]" />
      <div className="container-site relative flex flex-col gap-10 py-[clamp(5rem,3rem+7vw,10rem)] md:flex-row md:items-end md:justify-between">
        <div className="max-w-[48rem]">
          <h2 id="cta-heading" className="h-display" data-reveal="">
            {title}
          </h2>
          <p className="lead mt-6 max-w-[36rem]" data-reveal="" style={{ ["--d" as string]: 1 }}>
            {body}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-3" data-reveal="fade">
          <Link href={site.bookingUrl} className="btn btn-primary">
            Book a free call <Arrow className="btn-arrow" />
          </Link>
          <Link href="/contact" className="btn btn-ghost">
            Send a message
          </Link>
        </div>
      </div>
    </section>
  );
}
