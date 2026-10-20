/**
 * The mark: a U drawn as two contour lines, like a valley on a survey map,
 * with a point at its lowest spot — the place nobody had measured yet.
 * Thick strokes so it stays clear down to a 16px favicon.
 */
export function LogoMark({ className, title }: { className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} role={title ? "img" : undefined} aria-hidden={title ? undefined : true} aria-label={title}>
      <path d="M7.5 3V26a16.5 16.5 0 0 0 33 0V3" stroke="currentColor" strokeWidth="5" />
      <path d="M15.5 3V26a8.5 8.5 0 0 0 17 0V3" stroke="currentColor" strokeWidth="5" />
      <circle cx="24" cy="26" r="3.6" fill="var(--logo-accent, #f2c230)" />
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

export function Logo({ className }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className ?? ""}`}>
      <LogoMark className="h-[24px] w-[24px] shrink-0" />
      <Wordmark className="text-[19px] leading-none" />
    </span>
  );
}
