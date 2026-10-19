import Link from "next/link";
import { cacheLife } from "next/cache";
import { LogoMark } from "@/components/brand/Logo";
import { nav, site, socials } from "@/config/site";

async function CopyrightYear() {
  "use cache";
  cacheLife("days");
  return <>{new Date().getFullYear()}</>;
}

const linkCls = "link-underline inline-block py-1.5 text-[15px] text-[color:var(--color-fg-2)] hover:text-[color:var(--color-fg)]";

export function SiteFooter() {
  return (
    <footer className="bp-grid border-t border-[color:var(--color-line)]">
      <div className="container-site grid gap-12 pt-20 pb-12 md:grid-cols-12">
        <div className="md:col-span-5">
          <p className="display max-w-[22rem] text-[1.6rem] leading-snug">{site.footerLine}</p>
          <a href={`mailto:${site.email}`} className="link mono mt-6 inline-block py-1 text-[15px]">
            {site.email}
          </a>
        </div>
        <nav aria-label="Footer" className="grid grid-cols-2 gap-8 md:col-span-6 md:col-start-7 md:grid-cols-3">
          <div>
            <p className="label text-[color:var(--color-fg-3)]">Company</p>
            <ul className="mt-4 flex flex-col">
              {nav.map((n) => (
                <li key={n.href}>
                  <Link href={n.href} className={linkCls}>
                    {n.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="label text-[color:var(--color-fg-3)]">Get in touch</p>
            <ul className="mt-4 flex flex-col">
              <li>
                <Link href="/contact" className={linkCls}>
                  Contact
                </Link>
              </li>
              {socials.map((s) => (
                <li key={s.label}>
                  <a href={s.href} target="_blank" rel="noopener noreferrer" className={linkCls}>
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="label text-[color:var(--color-fg-3)]">Legal</p>
            <ul className="mt-4 flex flex-col">
              <li>
                <Link href="/privacy" className={linkCls}>
                  Privacy
                </Link>
              </li>
            </ul>
          </div>
        </nav>
      </div>

      {/* The name, set large, with the mark */}
      <div className="container-site" aria-hidden>
        <div className="flex items-end gap-[2vw] border-t border-[color:var(--color-line)] pt-8">
          <LogoMark className="h-[11vw] max-h-[9rem] w-[11vw] max-w-[9rem] shrink-0" />
          <p className="display text-[clamp(2rem,9.2vw,11.5rem)] leading-[0.8] tracking-[-0.06em] whitespace-nowrap">
            Unmapped<span className="text-[color:var(--color-fg-3)]"> Labs</span>
          </p>
        </div>
      </div>

      <div className="container-site label flex flex-col gap-2 py-6 text-[0.65rem] text-[color:var(--color-fg-3)] sm:flex-row sm:justify-between">
        <p>
          © <CopyrightYear /> {site.name}
        </p>
        <p>Photographs from Wikimedia Commons, credited on each image</p>
        <p>Made in India</p>
      </div>
    </footer>
  );
}
