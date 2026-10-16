import { epilogue } from "@/content/site-content";
import { BtnLabel } from "@/components/ui/BtnLabel";
import { CHAPTER } from "@/components/three/chapters";

/**
 * The way out: the camera leaves the city and flies over the southern hills
 * (chapter 17), mirroring the hills the visit started on.
 */
export function Epilogue() {
  return (
    <section aria-labelledby="epilogue-heading" className="relative h-[210vh]">
      <span aria-hidden data-chapter={CHAPTER.epilogue} className="pointer-events-none absolute top-[125vh] h-px w-px" />
      <div className="sticky top-0 flex h-[100svh] items-end overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[55%] bg-[linear-gradient(0deg,rgba(247,242,233,0.85),rgba(247,242,233,0.4)_55%,transparent)]"
        />
        <div className="container-site relative pb-[clamp(3rem,10vh,7rem)]">
          <p className="label reveal flex items-center gap-3 text-[color:var(--color-fg-2)]">
            <span aria-hidden className="h-px w-6 bg-[color:var(--color-cyan)]" />
            {epilogue.label}
          </p>
          <h2
            id="epilogue-heading"
            className="reveal-mask mt-6 max-w-[16ch] text-[length:var(--text-h2)] leading-[var(--text-h2--line-height)] font-medium tracking-[var(--text-h2--letter-spacing)] text-balance"
          >
            <span>{epilogue.line}</span>
          </h2>
          <p className="reveal mt-6 max-w-[30rem] text-[length:var(--text-lead)] leading-[var(--text-lead--line-height)] text-[color:var(--color-fg-2)]" style={{ "--d": 2 } as React.CSSProperties}>
            {epilogue.body}
          </p>
          <a href={epilogue.back.href} className="reveal btn btn-ghost mt-8" style={{ "--d": 3 } as React.CSSProperties}>
            <BtnLabel>{epilogue.back.label}</BtnLabel>
            <span aria-hidden>↑</span>
          </a>
        </div>
      </div>
    </section>
  );
}
