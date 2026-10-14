/** Button text that rolls up to a duplicate on hover. The duplicate is hidden from assistive tech. */
export function BtnLabel({ children }: { children: string }) {
  return (
    <span className="btn-roll">
      <span className="btn-roll-a">{children}</span>
      <span aria-hidden className="btn-roll-b">
        {children}
      </span>
    </span>
  );
}
