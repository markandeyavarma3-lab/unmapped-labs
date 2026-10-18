import Link from "next/link";
import { cacheLife } from "next/cache";
import { Logo } from "@/components/brand/Logo";
import { nav, site, socials } from "@/config/site";

async function CopyrightYear() {
  "use cache";
  cacheLife("days");
  return <>{new Date().getFullYear()}</>;
}

export function SiteFooter() {
  return (
    <footer className="border-t border-[color:var(--color-line)] bg-[color:var(--color-ink-3)]">
      <div className="container-site grid gap-12 py-16 md:grid-cols-12">
        <div className="md:col-span-5">
          <Logo />
          <p className="mt-5 max-w-[24rem] text-[15px] text-[color:var(--color-fg-2)]">{site.footerLine}</p>
          <a href={`mailto:${site.email}`} className="link mt-5 inline-block py-1 text-[15px]">
            {site.email}
          </a>
        </div>
        <nav aria-label="Footer" className="grid grid-cols-2 gap-8 md:col-span-6 md:col-start-7 md:grid-cols-3">
          <div>
            <p className="label text-[color:var(--color-fg-3)]">Company</p>
            <ul className="mt-4 flex flex-col">
              {nav.map((n) => (
                <li key={n.href}>
                  <Link href={n.href} className="link-underline inline-block py-1.5 text-[15px] text-[color:var(--color-fg-2)] hover:text-[color:var(--color-fg)]">
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
                <Link href="/contact" className="link-underline inline-block py-1.5 text-[15px] text-[color:var(--color-fg-2)] hover:text-[color:var(--color-fg)]">
                  Contact
                </Link>
              </li>
              {socials.map((s) => (
                <li key={s.label}>
                  <a href={s.href} target="_blank" rel="noopener noreferrer" className="link-underline inline-block py-1.5 text-[15px] text-[color:var(--color-fg-2)] hover:text-[color:var(--color-fg)]">
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
                <Link href="/privacy" className="link-underline inline-block py-1.5 text-[15px] text-[color:var(--color-fg-2)] hover:text-[color:var(--color-fg)]">
                  Privacy
                </Link>
              </li>
            </ul>
          </div>
        </nav>
      </div>
      <div className="container-site flex flex-col gap-2 border-t border-[color:var(--color-line)] py-6 text-[13px] text-[color:var(--color-fg-3)] sm:flex-row sm:justify-between">
        <p>
          © <CopyrightYear /> {site.name}
        </p>
        <p>Made in India</p>
      </div>
    </footer>
  );
}
