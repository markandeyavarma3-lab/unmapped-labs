import Link from "next/link";
import { sites } from "@/content/site-content";
import { photos } from "@/content/photos";
import { SitePhoto } from "@/components/ui/SitePhoto";
import { Arrow } from "@/components/ui/Arrow";

/**
 * Where the work is: a row of real places. On wide screens the section pins
 * and the row slides sideways as you scroll; on phones it's a swipeable strip.
 */
export function SiteGallery() {
  return (
    <section aria-labelledby="sites-heading" className="hscroll border-t border-[color:var(--color-line)]" data-progress="pin" style={{ ["--n" as string]: sites.length }}>
      <div className="hscroll-sticky py-[clamp(4rem,3rem+4vw,6rem)]">
        <div className="container-site flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="label text-[color:var(--color-accent)]">[ Where the work is ]</p>
            <h2 id="sites-heading" className="h2 mt-4 max-w-[16ch]">
              Real places. Real queues.
            </h2>
          </div>
          <p className="max-w-[26rem] text-[15px] leading-relaxed text-[color:var(--color-fg-2)]">
            Large operations across India lose time and money in the same few ways. These are the problems we know how to look for.
          </p>
        </div>
        <ul className="hscroll-track mt-10 gap-5 px-[var(--gutter)] pb-2 md:gap-8">
          {sites.map((s, i) => (
            <li key={s.caseSlug} className="group w-[84vw] shrink-0 sm:w-[60vw] min-[900px]:w-[min(78vh,62vw)]">
              <SitePhoto photo={photos[s.photo]} sizes="(min-width: 900px) 62vw, 84vw" className="aspect-[4/3] min-[900px]:aspect-auto min-[900px]:h-[48vh]" />
              <div className="relative mt-5 flex items-start gap-5">
                <span className="label pt-1.5 text-[color:var(--color-accent)] tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <p className="label text-[color:var(--color-fg-3)]">{s.label}</p>
                  <h3 className="h3 mt-2">
                    <Link href={`/insights/${s.caseSlug}`} className="after:absolute after:inset-0">
                      {s.title}
                    </Link>
                  </h3>
                  <p className="mt-2 max-w-[34rem] text-[15px] leading-relaxed text-[color:var(--color-fg-2)]">{s.body}</p>
                  <p className="label mt-3 flex items-center gap-2 text-[color:var(--color-fg)] transition-colors group-hover:text-[color:var(--color-accent)]">
                    Read the case <Arrow className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                  </p>
                </div>
              </div>
            </li>
          ))}
          <li aria-hidden className="w-[2vw] shrink-0" />
        </ul>
      </div>
    </section>
  );
}
