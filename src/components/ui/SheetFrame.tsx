/**
 * Map-sheet margin furniture for the light editorial surfaces: corner ticks
 * and a small sheet reference. Purely decorative.
 */
export function SheetFrame({ sheet, note }: { sheet: string; note: string }) {
  const tick = "absolute h-3 w-3 border-[color:var(--color-paper-fg)]/40";
  return (
    <div aria-hidden className="pointer-events-none absolute inset-[clamp(0.75rem,1.6vw,1.5rem)]">
      <span className={`${tick} top-0 left-0 border-t border-l`} />
      <span className={`${tick} top-0 right-0 border-t border-r`} />
      <span className={`${tick} bottom-0 left-0 border-b border-l`} />
      <span className={`${tick} right-0 bottom-0 border-r border-b`} />
      <span className="label absolute top-0 left-6 -translate-y-1/2 bg-[color:var(--color-paper)] px-2 text-[color:var(--color-paper-fg-2)] max-sm:hidden">
        {sheet}
      </span>
      <span className="label absolute right-6 bottom-0 translate-y-1/2 bg-[color:var(--color-paper)] px-2 text-[color:var(--color-paper-fg-2)] max-sm:hidden">
        {note}
      </span>
    </div>
  );
}
