import Link from "next/link";
import { notes as copy } from "@/content/site-content";

/** Honest empty state: a blank survey sheet waiting for its first entry. */
export function NotesEmpty({ showCta = true }: { showCta?: boolean }) {
  return (
    <div className="reveal glass relative grid overflow-hidden md:grid-cols-[1.1fr_1fr]">
      <div
        aria-hidden
        className="relative min-h-[14rem] border-b border-[color:var(--color-line)] bg-[linear-gradient(rgb(39_50_61/0.6)_1px,transparent_1px),linear-gradient(90deg,rgb(39_50_61/0.6)_1px,transparent_1px)] bg-[size:28px_28px] md:border-r md:border-b-0"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_62%_48%,transparent_0,transparent_18%,rgb(10_14_18/0.95)_68%)]" />
        <div className="absolute top-1/2 left-[62%] h-16 w-16 -translate-x-1/2 -translate-y-1/2 animate-[spin_24s_linear_infinite] border border-dashed border-[color:var(--color-cyan)]" />
        <div className="absolute top-1/2 left-[62%] h-2 w-2 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-[color:var(--color-lime)] shadow-[0_0_16px_rgb(199_243_107/0.7)]" />
        <span className="label absolute top-5 left-5 text-[color:var(--color-fg-2)]">Entry № 000</span>
        <span className="label absolute bottom-5 left-5 text-[color:var(--color-fg-2)]">Awaiting first survey</span>
      </div>
      <div className="flex flex-col justify-center gap-5 p-8 lg:p-12">
        <h3 className="text-[length:var(--text-h3)] leading-[var(--text-h3--line-height)] font-medium tracking-[var(--text-h3--letter-spacing)]">
          {copy.empty.title}
        </h3>
        <p className="max-w-[30rem] leading-relaxed text-[color:var(--color-fg-2)]">{copy.empty.body}</p>
        {showCta && (
          <Link href="/#contact" className="link-underline self-start pb-0.5 text-[15px] font-medium text-[color:var(--color-fg)]">
            Suggest a system worth studying →
          </Link>
        )}
      </div>
    </div>
  );
}
