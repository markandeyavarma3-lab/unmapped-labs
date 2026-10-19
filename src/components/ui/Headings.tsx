import type { Photo } from "@/content/photos";
import { SitePhoto } from "./SitePhoto";

/** Heading for the top of a page: label, the one h1, an intro — on the survey grid, with an optional photo. */
export function PageHeader({ label, title, intro, photo, children }: { label: string; title: string; intro?: string; photo?: Photo; children?: React.ReactNode }) {
  return (
    <header className="bp-grid border-b border-[color:var(--color-line)]">
      <div className={`container-site grid gap-10 pt-[clamp(3.5rem,2rem+6vw,7.5rem)] pb-[clamp(3rem,2rem+4vw,5.5rem)] ${photo ? "lg:grid-cols-12 lg:items-end" : ""}`}>
        <div className={photo ? "lg:col-span-7" : ""}>
          <p className="label text-[color:var(--color-accent)]" data-reveal="fade">
            [ {label} ]
          </p>
          <h1 className="h-display mt-6 max-w-[16ch]" data-reveal="">
            {title}
          </h1>
          {intro && (
            <p className="lead mt-7 max-w-[42rem]" data-reveal="" style={{ ["--d" as string]: 1 }}>
              {intro}
            </p>
          )}
          {children}
        </div>
        {photo && <SitePhoto photo={photo} priority sizes="(min-width: 1024px) 40vw, 100vw" className="ticks aspect-[4/3] lg:col-span-5" />}
      </div>
    </header>
  );
}

/** Heading for a section: label, h2 and an optional intro, with an optional action on the right. */
export function SectionHead({ id, label, title, intro, action }: { id: string; label: string; title: string; intro?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
      <div className="max-w-[46rem]">
        <p className="label text-[color:var(--color-accent)]" data-reveal="fade">
          [ {label} ]
        </p>
        <h2 id={id} className="h2 mt-5" data-reveal="">
          {title}
        </h2>
        {intro && (
          <p className="lead mt-6" data-reveal="" style={{ ["--d" as string]: 1 }}>
            {intro}
          </p>
        )}
      </div>
      {action && (
        <div className="shrink-0" data-reveal="fade">
          {action}
        </div>
      )}
    </div>
  );
}
