"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { nav } from "@/config/site";
import { Logo } from "@/components/brand/Logo";

/** Sticky header: logo, four links and the call to action; a simple menu on phones. */
export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  // Close on navigation and on Escape; keep focus inside while open.
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const first = panel.current?.querySelector<HTMLElement>("a");
    first?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
      if (e.key !== "Tab" || !panel.current) return;
      const items = [button.current, ...panel.current.querySelectorAll<HTMLElement>("a")].filter(Boolean) as HTMLElement[];
      const i = items.indexOf(document.activeElement as HTMLElement);
      if (e.shiftKey && i <= 0) {
        e.preventDefault();
        items[items.length - 1].focus();
      } else if (!e.shiftKey && i === items.length - 1) {
        e.preventDefault();
        items[0].focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const current = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="sticky top-0 z-[var(--z-header)] border-b border-[color:var(--color-line)] bg-[color:var(--color-ink)]/95 backdrop-blur-sm">
      <div className="container-site flex h-[var(--header-h)] items-center justify-between gap-6">
        <Link href="/" className="-m-2 p-2 text-[color:var(--color-fg)]" aria-label="Unmapped Labs — home">
          <Logo />
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              aria-current={current(n.href) ? "page" : undefined}
              className={`rounded px-3 py-2 text-[15px] transition-colors hover:text-[color:var(--color-fg)] ${current(n.href) ? "font-medium text-[color:var(--color-fg)]" : "text-[color:var(--color-fg-2)]"}`}
            >
              {n.label}
            </Link>
          ))}
          <Link href="/contact" className="btn btn-primary ml-3 min-h-[2.5rem] px-4 py-2 text-[15px]">
            Start a conversation
          </Link>
        </nav>

        <button
          ref={button}
          type="button"
          className="-mr-2 flex h-11 w-11 items-center justify-center md:hidden"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          <span aria-hidden className="relative block h-3 w-5">
            <span className={`absolute left-0 h-[1.5px] w-5 bg-current transition-transform ${open ? "top-1.5 rotate-45" : "top-0"}`} />
            <span className={`absolute left-0 h-[1.5px] w-5 bg-current transition-transform ${open ? "top-1.5 -rotate-45" : "top-3"}`} />
          </span>
        </button>
      </div>

      <div
        ref={panel}
        id="mobile-menu"
        data-open={open ? "" : undefined}
        className="mobile-panel absolute inset-x-0 top-full border-b border-[color:var(--color-line)] bg-[color:var(--color-ink)] md:hidden"
      >
        <nav aria-label="Main" className="container-site flex flex-col py-4">
          {nav.map((n) => (
            <Link key={n.href} href={n.href} aria-current={current(n.href) ? "page" : undefined} className="border-b border-[color:var(--color-line)] py-4 text-lg">
              {n.label}
            </Link>
          ))}
          <Link href="/contact" className="btn btn-primary mt-6">
            Start a conversation
          </Link>
        </nav>
      </div>
    </header>
  );
}
