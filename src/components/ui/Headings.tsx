/** Heading for the top of a page: label, the one h1, and an intro. */
export function PageHeader({ label, title, intro, children }: { label: string; title: string; intro?: string; children?: React.ReactNode }) {
  return (
    <header className="container-site pt-[clamp(3rem,2rem+5vw,6rem)] pb-[clamp(2.5rem,2rem+3vw,4.5rem)]">
      <p className="label text-[color:var(--color-cyan)]">{label}</p>
      <h1 className="h-display mt-5 max-w-[20ch]">{title}</h1>
      {intro && <p className="lead mt-6 max-w-[44rem]">{intro}</p>}
      {children}
    </header>
  );
}

/** Heading for a section: label, h2 and an optional intro, with an optional action on the right. */
export function SectionHead({ id, label, title, intro, action }: { id: string; label: string; title: string; intro?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
      <div className="max-w-[44rem]">
        <p className="label text-[color:var(--color-cyan)]">{label}</p>
        <h2 id={id} className="h2 mt-4">
          {title}
        </h2>
        {intro && <p className="lead mt-5">{intro}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
