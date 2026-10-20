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
  return <span className={`font-[family-name:var(--font-wide)] font-semibold tracking-[0.14em] [font-stretch:125%] ${className ?? ""}`}>UNMAPPED LABS</span>;
}

/**
 * Mark + name, with the tagline set small beneath the name.
 * `tagline="hide-sm"` drops the tagline on narrow screens.
 */
export function Logo({ className, tagline = "show" }: { className?: string; tagline?: "show" | "hide-sm" | "none" }) {
  return (
    <span className={`inline-flex items-center gap-3 ${className ?? ""}`}>
      <LogoMark className="h-[28px] w-[28px] shrink-0" />
      <span className="flex flex-col">
        <Wordmark className="text-[15px] leading-none" />
        {tagline !== "none" && (
          <span className={`mt-[6px] text-[8px] leading-none font-medium tracking-[0.36em] text-[color:var(--color-fg-3)] uppercase ${tagline === "hide-sm" ? "hidden sm:block" : ""}`}>{site.tagline.replace(/\.$/, "")}</span>
        )}
      </span>
    </span>
  );
}
