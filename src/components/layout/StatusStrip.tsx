import { IstClock } from "./IstClock";

/** A thin readout above the header, like the status line on a piece of site equipment. */
export function StatusStrip() {
  return (
    <aside aria-label="Status" className="label hidden border-b border-[color:var(--color-line)] bg-[color:var(--color-ink-3)] text-[0.62rem] text-[color:var(--color-fg-3)] md:block">
      <div className="container-site flex h-8 items-center justify-between gap-6">
        <p>Operations research · Problem solving · India</p>
        <p className="flex items-center gap-6">
          <span className="flex items-center gap-2">
            <span aria-hidden className="blink h-1.5 w-1.5 rounded-full bg-[color:var(--color-good)]" />
            Open for new problems
          </span>
          <IstClock />
        </p>
      </div>
    </aside>
  );
}
