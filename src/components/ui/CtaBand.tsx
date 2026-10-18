import Link from "next/link";
import { Arrow } from "./Arrow";

/** The closing call to action used at the bottom of pages. */
export function CtaBand({ title = "Have something worth fixing?", body = "Tell us what's slowing you down. The first conversation is free, and we'll tell you honestly whether we can help." }: { title?: string; body?: string }) {
  return (
    <section aria-labelledby="cta-heading" className="border-t border-[color:var(--color-line)] bg-[color:var(--color-fg)] text-[color:var(--color-ink)]">
      <div className="container-site flex flex-col gap-8 py-[clamp(3.5rem,2.5rem+4vw,6rem)] md:flex-row md:items-end md:justify-between">
        <div className="max-w-[40rem]">
          <h2 id="cta-heading" className="h2">
            {title}
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-[#c9ccc6]">{body}</p>
        </div>
        <Link href="/contact" className="btn shrink-0 bg-[color:var(--color-ink)] text-[color:var(--color-fg)] hover:bg-white">
          Start a conversation <Arrow className="btn-arrow" />
        </Link>
      </div>
    </section>
  );
}
