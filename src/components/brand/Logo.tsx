/**
 * The mark: a survey grid with its top-right cell missing, and a path that
 * leaves the known grid through that gap into open space.
 * Three 9-unit cells on a 33-unit canvas so it stays crisp down to 16px.
 */
export function LogoMark({ className, title }: { className?: string; title?: string }) {
  return (
    <svg
      viewBox="0 0 33 33"
      fill="none"
      className={className}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <g stroke="currentColor" strokeWidth="1.7" strokeLinecap="square">
        {/* frame — open where the top-right cell should be */}
        <path d="M21 3H3V30H30V12" />
        {/* inner grid */}
        <g strokeOpacity="0.5">
          <path d="M12 3V30" />
          <path d="M21 12V30" />
          <path d="M3 12H21" />
          <path d="M3 21H30" />
        </g>
      </g>
      {/* the path out of the known grid */}
      <path d="M12 21L21 12L26.6 6.4" stroke="var(--logo-accent, #f2c230)" strokeWidth="1.9" strokeLinecap="round" />
      <circle cx="28.4" cy="4.6" r="2.3" fill="var(--logo-accent, #f2c230)" />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={className}>
      <span className="font-medium tracking-[-0.03em]">Unmapped</span>
      <span className="font-light tracking-[-0.02em] opacity-75"> Labs</span>
    </span>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className ?? ""}`}>
      <LogoMark className="h-[22px] w-[22px] shrink-0" />
      <Wordmark className="text-[15px] leading-none" />
    </span>
  );
}
