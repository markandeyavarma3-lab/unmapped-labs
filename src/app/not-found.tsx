import Link from "next/link";
import { LogoMark } from "@/components/brand/Logo";
import { BtnLabel } from "@/components/ui/BtnLabel";

export default function NotFound() {
  return (
    <main
      id="main"
      tabIndex={-1}
      className="relative z-[var(--z-content)] flex min-h-[100svh] items-center bg-[url(/city-map.svg)] bg-cover bg-center"
    >
      <div aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(247,242,233,0.92),rgba(247,242,233,0.6))]" />
      <div className="container-site relative py-32">
        <LogoMark className="h-10 w-10 text-[color:var(--color-fg)]" />
        <p className="label mt-10 text-[color:var(--color-cyan)]">Error 404 · Off the map</p>
        <h1 className="mt-5 max-w-[14ch] text-[length:var(--text-h2)] leading-[var(--text-h2--line-height)] font-medium tracking-[var(--text-h2--letter-spacing)]">
          This territory hasn&apos;t been mapped.
        </h1>
        <p className="mt-6 max-w-[30rem] text-[length:var(--text-lead)] leading-relaxed text-[color:var(--color-fg-2)]">
          The page you were looking for doesn&apos;t exist — or it hasn&apos;t been discovered yet.
        </p>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/" className="btn btn-primary">
            <BtnLabel>Back to known ground</BtnLabel>
          </Link>
          <Link href="/notes" className="btn btn-ghost">
            <BtnLabel>Read the field notes</BtnLabel>
          </Link>
        </div>
      </div>
    </main>
  );
}
