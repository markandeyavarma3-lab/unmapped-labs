import { site } from "@/config/site";

/**
 * The mark: a valley drawn as two contour lines — the inner one shorter, as
 * on a survey map — with a point at the lowest spot, the place nobody had
 * measured yet. Thick, rounded strokes so it stays clear down to 16px.
 */
export function LogoMark({ className, title }: { className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" strokeLinecap="round" className={className} role={title ? "img" : undefined} aria-hidden={title ? undefined : true} aria-label={title}>
      <path d="M6 4V25a18 18 0 0 0 36 0V4" stroke="currentColor" strokeWidth="4.8" />
      <path d="M15 13V25a9 9 0 0 0 18 0V13" stroke="currentColor" strokeWidth="4.8" />
      <circle cx="24" cy="25" r="3.8" fill="var(--logo-accent, #f2c230)" />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={className}>
      <span className="font-semibold tracking-[-0.05em]">unmapped</span>
      <span className="font-normal tracking-[-0.04em] opacity-60"> labs</span>
    </span>
  );
}

/**
 * Mark + name, with the tagline set small beneath the name.
 * `tagline="hide-sm"` drops the tagline on narrow screens.
 */
export function Logo({ className, tagline = "show" }: { className?: string; tagline?: "show" | "hide-sm" | "none" }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className ?? ""}`}>
      <LogoMark className="h-[26px] w-[26px] shrink-0" />
      <span className="flex flex-col">
        <Wordmark className="text-[19px] leading-none" />
        {tagline !== "none" && (
          <span className={`mt-[6px] text-[8.5px] leading-none font-medium tracking-[0.32em] text-[color:var(--color-fg-3)] uppercase ${tagline === "hide-sm" ? "hidden sm:block" : ""}`}>{site.tagline.replace(/\.$/, "")}</span>
        )}
      </span>
    </span>
  );
}
