import Link from "next/link";
import { cacheLife } from "next/cache";
import { LogoMark, Wordmark } from "@/components/brand/Logo";
import { nav, site, socials } from "@/config/site";

async function CopyrightYear() {
  "use cache";
  cacheLife("days");
  return <>{new Date().getFullYear()}</>;
}

export function SiteFooter() {
  return (
    <footer className="relative z-[var(--z-content)] border-t border-[color:var(--color-line)] bg-[color:var(--color-ink)]">
      <div className="container-site py-[clamp(4rem,9vw,7rem)]">
        <div className="grid gap-14 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <p className="text-[clamp(2.25rem,1.4rem+3.2vw,4.25rem)] leading-[1] font-medium tracking-[-0.04em] text-balance text-[color:var(--color-fg)]">
              {site.closingLine}
            </p>
            <a href={`mailto:${site.email}`} className="link-underline mt-8 inline-block pb-0.5 text-lg text-[color:var(--color-fg-2)] hover:text-[color:var(--color-fg)]">
              {site.email}
            </a>
          </div>

          <nav aria-label="Footer" className="grid grid-cols-2 gap-10 lg:col-span-5 lg:col-start-8">
            <div>
              <p className="label text-[color:var(--color-fg-3)]">Explore</p>
              <ul className="mt-5 flex flex-col gap-3">
                {[...nav, { id: "contact", label: "Contact" }].map((n) => (
                  <li key={n.id}>
                    <Link href={`/#${n.id}`} className="link-underline inline-block py-1.5 text-[15px] text-[color:var(--color-fg-2)] transition-colors hover:text-[color:var(--color-fg)]">
                      {n.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="label text-[color:var(--color-fg-3)]">Elsewhere</p>
              <ul className="mt-5 flex flex-col gap-3">
                <li>
                  <Link href="/notes" className="link-underline inline-block py-1.5 text-[15px] text-[color:var(--color-fg-2)] transition-colors hover:text-[color:var(--color-fg)]">
                    Field Notes archive
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="link-underline inline-block py-1.5 text-[15px] text-[color:var(--color-fg-2)] transition-colors hover:text-[color:var(--color-fg)]">
                    Privacy
                  </Link>
                </li>
                {socials.map((s) => (
                  <li key={s.label}>
                    <a href={s.href} target="_blank" rel="noopener noreferrer" className="link-underline inline-block py-1.5 text-[15px] text-[color:var(--color-fg-2)] transition-colors hover:text-[color:var(--color-fg)]">
                      {s.label} <span aria-hidden>↗</span>
                      <span className="sr-only"> (opens in a new tab)</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </nav>
        </div>

        <div className="mt-20 flex flex-col gap-6 border-t border-[color:var(--color-line)] pt-8 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" className="-m-1 inline-flex items-center gap-3 p-1 text-[color:var(--color-fg)]" aria-label={`${site.name} — back to top of home`}>
            <LogoMark className="h-6 w-6" />
            <Wordmark className="text-[15px]" />
          </Link>
          <p className="label text-[color:var(--color-fg-3)]">{site.tagline}</p>
          <p className="label text-[color:var(--color-fg-3)]">
            © <CopyrightYear /> {site.name}
          </p>
        </div>
      </div>
    </footer>
  );
}
