type Props = {
  id: string;
  label: string;
  heading: string;
  intro?: string;
  tone?: "dark" | "paper";
  className?: string;
};

/** Label + masked heading + optional intro, shared by every section. */
export function SectionHeading({ id, label, heading, intro, tone = "dark", className }: Props) {
  const muted = tone === "dark" ? "text-[color:var(--color-fg-2)]" : "text-[color:var(--color-paper-fg-2)]";
  return (
    <div className={className}>
      <p className={`label reveal flex items-center gap-3 ${muted}`}>
        <span aria-hidden className={`h-px w-6 ${tone === "dark" ? "bg-[color:var(--color-cyan)]" : "bg-[color:var(--color-teal)]"}`} />
        {label}
      </p>
      <h2
        id={id}
        className="reveal-mask mt-6 max-w-[18ch] text-[length:var(--text-h2)] leading-[var(--text-h2--line-height)] font-medium tracking-[var(--text-h2--letter-spacing)] text-balance"
      >
        <span>{heading}</span>
      </h2>
      {intro && (
        <p className={`reveal mt-7 max-w-[36rem] text-[length:var(--text-lead)] leading-[var(--text-lead--line-height)] ${muted}`} style={{ "--d": 2 } as React.CSSProperties}>
          {intro}
        </p>
      )}
    </div>
  );
}
