"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Logo } from "@/components/brand/Logo";
import { useLenis } from "@/components/motion/SmoothScroll";
import { nav, site, type NavId } from "@/config/site";

const SECTION_IDS: NavId[] = [...nav.map((n) => n.id), "contact"];
const EASE = [0.16, 1, 0.3, 1] as const;

function useActiveSection(enabled: boolean) {
  const [active, setActive] = useState<NavId | null>(null);
  useEffect(() => {
    if (!enabled) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id as NavId);
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    const hero = document.getElementById("top");
    const els = SECTION_IDS.map((id) => document.getElementById(id)).filter(Boolean) as HTMLElement[];
    els.forEach((el) => io.observe(el));
    const heroIo = new IntersectionObserver(([e]) => e.isIntersecting && setActive(null), {
      rootMargin: "-45% 0px -50% 0px",
    });
    if (hero) heroIo.observe(hero);
    return () => {
      io.disconnect();
      heroIo.disconnect();
    };
  }, [enabled]);
  return enabled ? active : null;
}

export function SiteHeader() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const getLenis = useLenis();
  const [scrolled, setScrolled] = useState(false);
  // The menu belongs to the page it was opened on, so a route change closes it.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;
  const setOpen = (next: boolean | ((o: boolean) => boolean)) =>
    setOpenOn((cur) => ((typeof next === "function" ? next(cur === pathname) : next) ? pathname : null));
  const active = useActiveSection(isHome);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Menu: lock scroll, trap focus, close on Escape, restore focus on close.
  useEffect(() => {
    if (!open) return;
    const lenis = getLenis();
    lenis?.stop();
    document.documentElement.style.overflow = "hidden";
    const panel = panelRef.current;
    const focusables = () =>
      Array.from(panel?.querySelectorAll<HTMLElement>("a[href], button:not([disabled])") ?? []).concat(
        toggleRef.current ? [toggleRef.current] : [],
      );
    window.requestAnimationFrame(() => focusables()[0]?.focus());
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") return setOpenOn(null);
      if (e.key !== "Tab") return;
      const list = focusables();
      const i = list.indexOf(document.activeElement as HTMLElement);
      if (e.shiftKey && i <= 0) {
        e.preventDefault();
        list[list.length - 1]?.focus();
      } else if (!e.shiftKey && i === list.length - 1) {
        e.preventDefault();
        list[0]?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    const toggle = toggleRef.current;
    return () => {
      window.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = "";
      lenis?.start();
      toggle?.focus({ preventScroll: true });
    };
  }, [open, getLenis]);

  const href = (id: string) => (isHome ? `#${id}` : `/#${id}`);
  const solid = scrolled || open || !isHome;

  return (
    <header className="fixed inset-x-0 top-0 z-[var(--z-header)]">
      <div
        className={`absolute inset-0 border-b transition-[background-color,border-color,backdrop-filter] duration-[var(--duration-nav)] ease-[var(--ease-out-quart)] ${
          solid
            ? "border-[color:var(--color-line)]/70 bg-[color:var(--color-ink)]/72 backdrop-blur-xl backdrop-saturate-150"
            : "border-transparent bg-transparent"
        }`}
      />
      <div className="container-site relative flex h-[var(--header-h)] items-center justify-between gap-6">
        <Link href="/" className="-m-2 p-2 text-[color:var(--color-fg)]" aria-label={`${site.name} — home`}>
          <Logo />
        </Link>

        <nav aria-label="Primary" className="hidden md:block">
          <ul className="flex items-center gap-1">
            {nav.map((item) => {
              const isActive = active === item.id;
              return (
                <li key={item.id}>
                  <a
                    href={href(item.id)}
                    aria-current={isActive ? "location" : undefined}
                    className={`group relative flex items-center gap-2 px-3 py-2 text-[13.5px] transition-colors duration-[var(--duration-hover)] ${
                      isActive ? "text-[color:var(--color-fg)]" : "text-[color:var(--color-fg-2)] hover:text-[color:var(--color-fg)]"
                    }`}
                  >
                    <span
                      aria-hidden
                      className={`h-1 w-1 rounded-full bg-[color:var(--color-cyan)] transition-[opacity,transform] duration-[var(--duration-hover)] ${
                        isActive ? "scale-100 opacity-100" : "scale-0 opacity-0"
                      }`}
                    />
                    {item.label}
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <a
            href={href("contact")}
            aria-current={active === "contact" ? "location" : undefined}
            className="group hidden items-center gap-2.5 border border-[color:var(--color-line)] px-4 py-2.5 text-[13px] text-[color:var(--color-fg)] transition-[border-color,background-color] duration-[var(--duration-hover)] hover:border-[color:var(--color-lime)]/60 hover:bg-[color:var(--color-lime)]/[0.06] sm:inline-flex"
          >
            <span aria-hidden className="h-1.5 w-1.5 bg-[color:var(--color-lime)] transition-transform duration-[var(--duration-hover)] group-hover:rotate-45" />
            Start a conversation
          </a>

          <button
            ref={toggleRef}
            type="button"
            className="relative -mr-2 flex h-11 w-11 items-center justify-center md:hidden"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((o) => !o)}
          >
            <span
              aria-hidden
              className={`absolute h-px w-5 bg-[color:var(--color-fg)] transition-transform duration-[var(--duration-nav)] ease-[var(--ease-out-expo)] ${
                open ? "rotate-45" : "-translate-y-[4px]"
              }`}
            />
            <span
              aria-hidden
              className={`absolute h-px w-5 bg-[color:var(--color-fg)] transition-transform duration-[var(--duration-nav)] ease-[var(--ease-out-expo)] ${
                open ? "-rotate-45" : "translate-y-[4px]"
              }`}
            />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            ref={panelRef}
            id="mobile-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Site menu"
            className="fixed inset-x-0 top-[var(--header-h)] bottom-0 z-[var(--z-menu)] flex flex-col overflow-y-auto bg-[color:var(--color-ink)] md:hidden"
            initial={{ clipPath: "inset(0 0 100% 0)" }}
            animate={{ clipPath: "inset(0 0 0% 0)" }}
            exit={{ clipPath: "inset(0 0 100% 0)" }}
            transition={{ duration: 0.5, ease: EASE }}
          >
            <nav aria-label="Mobile" className="container-site flex flex-1 flex-col justify-between py-8">
              <ul className="flex flex-col">
                {[...nav, { id: "contact" as const, label: "Contact" }].map((item, i) => (
                  <motion.li
                    key={item.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: EASE, delay: 0.08 + i * 0.05 }}
                    className="border-b border-[color:var(--color-line)]"
                  >
                    <a
                      href={href(item.id)}
                      onClick={() => setOpen(false)}
                      aria-current={active === item.id ? "location" : undefined}
                      className="flex items-baseline gap-4 py-5 text-[2rem] leading-none font-medium tracking-[-0.03em] text-[color:var(--color-fg)]"
                    >
                      <span className="label text-[color:var(--color-fg-3)]">0{i + 1}</span>
                      {item.label}
                    </a>
                  </motion.li>
                ))}
              </ul>
              <div className="mt-10 flex flex-col gap-2">
                <span className="label text-[color:var(--color-fg-3)]">Write to us</span>
                <a href={`mailto:${site.email}`} className="text-lg text-[color:var(--color-fg)] underline decoration-[color:var(--color-line)] underline-offset-4">
                  {site.email}
                </a>
                <p className="label mt-6 text-[color:var(--color-fg-3)]">{site.tagline}</p>
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
